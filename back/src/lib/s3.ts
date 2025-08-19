import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import dotenv from 'dotenv';
import archiver from 'archiver';
import { Readable } from 'stream';

dotenv.config();

// Configuration du client S3
export const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION?.replace(/"/g, '') || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID?.replace(/"/g, '') || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.replace(/"/g, '') || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

/**
 * Télécharge un fichier depuis une URL et l'upload vers S3
 */
export async function uploadFileFromUrl(
  fileUrl: string,
  projectUniqueId: string,
  fileName?: string
): Promise<{
  s3Url: string;
  fileName: string;
  hash: string;
  mimeType: string;
  size: number;
}> {
  try {
    // Télécharger le fichier depuis l'URL
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from ${fileUrl}: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Générer le nom de fichier s'il n'est pas fourni
    const extractedFileName = extractFileNameFromUrl(fileUrl);
    const headerFileName = extractFileNameFromHeaders(response.headers);
    const finalFileName = fileName || extractedFileName || headerFileName || `document-${Date.now()}`;
    
    console.log(`🔍 DEBUG uploadFileFromUrl:`);
    console.log(`  - fileUrl: ${fileUrl}`);
    console.log(`  - fileName param: ${fileName}`);
    console.log(`  - extractedFileName: ${extractedFileName}`);
    console.log(`  - headerFileName: ${headerFileName}`);
    console.log(`  - finalFileName: ${finalFileName}`);
    
    // Calculer le hash du fichier pour détecter les doublons
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    // Créer la clé S3 avec le projectUniqueId
    const s3Key = `projects/${projectUniqueId}/${hash}-${finalFileName}`;
    
    // Upload vers S3
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
      Metadata: {
        originalUrl: fileUrl,
        projectUniqueId,
        uploadedAt: new Date().toISOString(),
      },
    });

    await s3Client.send(putCommand);

    // Générer l'URL S3
    const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_REGION || 'eu-north-1'}.amazonaws.com/${s3Key}`;

    return {
      s3Url,
      fileName: finalFileName,
      hash,
      mimeType: contentType,
      size: buffer.length,
    };
  } catch (error) {
    console.error(`Error uploading file from ${fileUrl}:`, error);
    throw new Error(`Failed to upload file from URL: ${(error as Error).message}`);
  }
}

/**
 * Génère une URL pré-signée pour accéder à un fichier S3
 */
export async function generatePresignedUrl(s3Key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Extrait le nom de fichier depuis une URL
 */
function extractFileNameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const fileName = pathname.split('/').pop();
    
    if (!fileName || fileName.length === 0) {
      return null;
    }
    
    // Décoder l'URL pour gérer les caractères spéciaux
    const decodedFileName = decodeURIComponent(fileName);
    
    // Nettoyer le nom de fichier (supprimer les caractères non autorisés)
    const cleanFileName = decodedFileName.replace(/[<>:"/\\|?*]/g, '_');
    
    return cleanFileName;
  } catch {
    return null;
  }
}

/**
 * Extrait le nom de fichier depuis les headers HTTP (Content-Disposition)
 */
function extractFileNameFromHeaders(headers: Headers): string | null {
  try {
    const contentDisposition = headers.get('content-disposition');
    if (!contentDisposition) {
      return null;
    }
    
    // Chercher filename= ou filename*= dans le header
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (!filenameMatch || !filenameMatch[1]) {
      return null;
    }
    
    let fileName = filenameMatch[1].trim();
    
    // Supprimer les guillemets si présents
    if ((fileName.startsWith('"') && fileName.endsWith('"')) || 
        (fileName.startsWith("'") && fileName.endsWith("'"))) {
      fileName = fileName.slice(1, -1);
    }
    
    // Décoder si nécessaire
    const decodedFileName = decodeURIComponent(fileName);
    
    // Nettoyer le nom de fichier
    const cleanFileName = decodedFileName.replace(/[<>:"/\\|?*]/g, '_');
    
    return cleanFileName;
  } catch {
    return null;
  }
}

/**
 * Vérifie si un fichier avec le même hash existe déjà pour un projet
 */
export function getS3KeyFromHash(projectUniqueId: string, hash: string, fileName: string): string {
  return `projects/${projectUniqueId}/${hash}-${fileName}`;
}

/**
 * Extrait la clé S3 depuis une URL S3 complète
 */
export function extractS3KeyFromUrl(s3Url: string): string {
  try {
    const url = new URL(s3Url);
    let key = url.pathname.substring(1); // Enlever le "/" initial
    
    // IMPORTANT: Décoder l'URL pour éviter les problèmes d'encoding avec AWS SDK
    key = decodeURIComponent(key);
    
    console.log(`🔑 S3 Key original: ${url.pathname.substring(1)}`);
    console.log(`🔑 S3 Key décodé: ${key}`);
    
    return key;
  } catch {
    throw new Error('Invalid S3 URL format');
  }
}

/**
 * Télécharge un fichier depuis S3
 */
async function downloadFileFromS3(s3Url: string): Promise<Buffer> {
  try {
    const s3Key = extractS3KeyFromUrl(s3Url);
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error('No body in S3 response');
    }

    // Convertir le stream en buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body as Readable;
    
    return new Promise((resolve, reject) => {
      reader.on('data', (chunk) => chunks.push(chunk));
      reader.on('error', reject);
      reader.on('end', () => resolve(Buffer.concat(chunks)));
    });
  } catch (error) {
    console.error(`Error downloading file from S3: ${s3Url}`, error);
    throw error;
  }
}

/**
 * Crée un fichier ZIP à partir d'une liste de documents et l'upload vers S3
 */
export async function createZipFromDocuments(
  documents: Array<{ fileName: string; url: string }>,
  projectUniqueId: string
): Promise<{ s3Url: string; fileName: string; hash: string; size: number }> {
  try {
    console.log(`📦 Création d'un ZIP pour le projet ${projectUniqueId} avec ${documents.length} documents`);

    // Créer l'archive ZIP en mémoire
    const archive = archiver('zip', {
      zlib: { level: 9 } // Compression maximale
    });

    const chunks: Buffer[] = [];
    
    // Collecter les chunks du ZIP
    archive.on('data', (chunk) => {
      chunks.push(chunk);
    });

    // Promesse pour attendre la fin de l'archivage
    const zipPromise = new Promise<Buffer>((resolve, reject) => {
      archive.on('end', () => {
        const zipBuffer = Buffer.concat(chunks);
        console.log(`✅ ZIP créé avec succès: ${zipBuffer.length} bytes`);
        resolve(zipBuffer);
      });

      archive.on('error', (error) => {
        console.error('❌ Erreur lors de la création du ZIP:', error);
        reject(error);
      });
    });

      // Compteurs pour le suivi
  let successCount = 0;
  let failureCount = 0;
  const failedDocuments: string[] = [];

  // Ajouter chaque document au ZIP
  for (const doc of documents) {
    try {
      console.log(`📄 Tentative d'ajout du document: ${doc.fileName}`);
      console.log(`🔗 URL S3: ${doc.url}`);
      
      const fileBuffer = await downloadFileFromS3(doc.url);
      
      // Nettoyer le nom de fichier pour éviter les problèmes de chemin
      const cleanFileName = doc.fileName.replace(/[<>:"/\\|?*]/g, '_');
      archive.append(fileBuffer, { name: cleanFileName });
      
      successCount++;
      console.log(`✅ Document ajouté avec succès: ${doc.fileName} (${successCount}/${documents.length})`);
    } catch (error) {
      failureCount++;
      failedDocuments.push(doc.fileName);
      console.warn(`❌ Impossible d'ajouter le document ${doc.fileName} (${failureCount} échecs):`, error);
      // Continuer avec les autres documents même si un échoue
    }
  }

  console.log(`📊 Résumé de l'ajout des documents:`);
  console.log(`   ✅ Succès: ${successCount}/${documents.length}`);
  console.log(`   ❌ Échecs: ${failureCount}/${documents.length}`);
  if (failedDocuments.length > 0) {
    console.log(`   📋 Documents échoués: ${failedDocuments.join(', ')}`);
  }

    // Finaliser l'archive
    archive.finalize();

    // Attendre que le ZIP soit créé
    const zipBuffer = await zipPromise;

    // Calculer le hash du ZIP
    const hash = crypto.createHash('sha256').update(zipBuffer).digest('hex');

    // Générer le nom du fichier ZIP
    const zipFileName = `${projectUniqueId}-documents-${Date.now()}.zip`;
    const s3Key = `projects/${projectUniqueId}/zips/${hash}-${zipFileName}`;

    // Upload du ZIP vers S3
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: zipBuffer,
      ContentType: 'application/zip',
      Metadata: {
        projectUniqueId,
        documentCount: documents.length.toString(),
        createdAt: new Date().toISOString(),
      },
    });

    await s3Client.send(putCommand);

    // Générer l'URL S3
    const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_REGION || 'eu-north-1'}.amazonaws.com/${s3Key}`;

    console.log(`✅ ZIP uploadé vers S3: ${s3Url}`);

    return {
      s3Url,
      fileName: zipFileName,
      hash,
      size: zipBuffer.length,
    };
  } catch (error) {
    console.error('❌ Erreur lors de la création du ZIP:', error);
    throw new Error(`Failed to create ZIP: ${(error as Error).message}`);
  }
} 