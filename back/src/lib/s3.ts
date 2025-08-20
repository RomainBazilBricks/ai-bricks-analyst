import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import dotenv from 'dotenv';
import archiver from 'archiver';
import { Readable } from 'stream';
import yauzl from 'yauzl';
import { promisify } from 'util';

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
 * Si c'est un fichier ZIP, le dézippe et upload les fichiers individuels
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
  extractedFiles?: Array<{ s3Url: string; fileName: string; hash: string; mimeType: string; size: number }>;
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
    
    // Vérifier si c'est un fichier ZIP
    const isZipFile = contentType === 'application/zip' || 
                     finalFileName.toLowerCase().endsWith('.zip') ||
                     contentType === 'application/x-zip-compressed';
    
    if (isZipFile) {
      console.log(`📦 Fichier ZIP détecté: ${finalFileName}, début du dézippage...`);
      
      try {
        // Dézipper le fichier et extraire les fichiers (en filtrant les images)
        const extractedFiles = await unzipFile(buffer, projectUniqueId);
        
        if (extractedFiles.length === 0) {
          console.log(`⚠️ Aucun fichier valide trouvé dans le ZIP ${finalFileName}`);
          // Traiter comme un fichier normal si aucun fichier extrait
        } else {
          // Upload les fichiers extraits vers S3
          const uploadResults = await uploadExtractedFilesToS3(extractedFiles, projectUniqueId);
          
          console.log(`✅ ZIP traité: ${uploadResults.length} fichiers extraits et uploadés`);
          
          // Créer la clé S3 pour le ZIP original (optionnel, pour garder une trace)
          const s3Key = `projects/${projectUniqueId}/zips/${hash}-${finalFileName}`;
          
          // Upload le ZIP original vers S3 pour référence
          const putCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: buffer,
            ContentType: contentType,
            // ACL supprimé car le bucket ne les autorise pas
            Metadata: {
              originalUrl: fileUrl,
              projectUniqueId,
              isZipFile: 'true',
              extractedFilesCount: extractedFiles.length.toString(),
              uploadedAt: new Date().toISOString(),
            },
          });

          await s3Client.send(putCommand);
          
          // Générer l'URL S3 du ZIP original
          const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_REGION || 'eu-north-1'}.amazonaws.com/${s3Key}`;
          
          return {
            s3Url,
            fileName: finalFileName,
            hash,
            mimeType: contentType,
            size: buffer.length,
            extractedFiles: uploadResults,
          };
        }
      } catch (zipError) {
        console.error(`❌ Erreur lors du traitement du ZIP ${finalFileName}:`, zipError);
        console.log(`📄 Traitement comme fichier normal...`);
        // Continuer avec le traitement normal si le dézippage échoue
      }
    }
    
    // Traitement normal pour les fichiers non-ZIP ou en cas d'erreur de dézippage
    const s3Key = `projects/${projectUniqueId}/${hash}-${finalFileName}`;
    
    // Upload vers S3
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
      // ACL supprimé car le bucket ne les autorise pas
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
 * Génère une URL pré-signée depuis une URL S3 complète
 */
export async function generatePresignedUrlFromS3Url(s3Url: string, expiresIn = 3600): Promise<string> {
  try {
    const s3Key = extractS3KeyFromUrl(s3Url);
    return await generatePresignedUrl(s3Key, expiresIn);
  } catch (error) {
    console.error('Erreur lors de la génération de l\'URL pré-signée:', error);
    throw new Error(`Failed to generate presigned URL: ${(error as Error).message}`);
  }
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
 * Extrait la clé S3 depuis une URL S3 complète sans décoder (pour les clés stockées encodées)
 */
export function extractS3KeyFromUrlRaw(s3Url: string): string {
  try {
    const url = new URL(s3Url);
    const key = url.pathname.substring(1); // Enlever le "/" initial, sans décoder
    
    console.log(`🔑 S3 Key brut: ${key}`);
    
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
  projectUniqueId: string,
  projectData?: { conversation?: string; fiche?: string }
): Promise<{ s3Url: string; fileName: string; hash: string; size: number }> {
  try {
    console.log(`📦 Création d'un ZIP pour le projet ${projectUniqueId} avec ${documents.length} documents`);
    
    // Filtrer les images avant de créer le ZIP
    const filteredDocuments = filterNonImageDocuments(documents);

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
  for (const doc of filteredDocuments) {
    try {
      console.log(`📄 Tentative d'ajout du document: ${doc.fileName}`);
      console.log(`🔗 URL S3: ${doc.url}`);
      
      const fileBuffer = await downloadFileFromS3(doc.url);
      
      // Nettoyer le nom de fichier pour éviter les problèmes de chemin
      const cleanFileName = doc.fileName.replace(/[<>:"/\\|?*]/g, '_');
      archive.append(fileBuffer, { name: cleanFileName });
      
      successCount++;
      console.log(`✅ Document ajouté avec succès: ${doc.fileName} (${successCount}/${filteredDocuments.length})`);
    } catch (error) {
      failureCount++;
      failedDocuments.push(doc.fileName);
      console.warn(`❌ Impossible d'ajouter le document ${doc.fileName} (${failureCount} échecs):`, error);
      // Continuer avec les autres documents même si un échoue
    }
  }

  console.log(`📊 Résumé de l'ajout des documents:`);
  console.log(`   ✅ Succès: ${successCount}/${filteredDocuments.length}`);
  console.log(`   ❌ Échecs: ${failureCount}/${filteredDocuments.length}`);
  if (failedDocuments.length > 0) {
    console.log(`   📋 Documents échoués: ${failedDocuments.join(', ')}`);
  }

    // Ajouter les fichiers conversation.txt et fiche.txt si les données sont disponibles et non vides
    if (projectData?.conversation && projectData.conversation.trim() !== '') {
      try {
        const conversationIntro = "Voici un aperçu de la conversation entre les membres de l'équipe Bricks et le porteur de projet";
        const conversationContent = `${conversationIntro}\n\n${projectData.conversation.trim()}`;
        const conversationBuffer = Buffer.from(conversationContent, 'utf-8');
        
        archive.append(conversationBuffer, { name: 'conversation.txt' });
        console.log(`✅ Fichier conversation.txt ajouté au ZIP (${conversationBuffer.length} bytes)`);
      } catch (error) {
        console.warn(`❌ Impossible d'ajouter conversation.txt:`, error);
        // L'erreur ne bloque pas le processus, on continue
      }
    } else {
      console.log(`ℹ️ Aucune conversation valide disponible pour ce projet`);
    }

    if (projectData?.fiche && projectData.fiche.trim() !== '') {
      try {
        const ficheIntro = "Voici ce qu'à indiqué le porteur de projet dans sa rédaction en autonomie de la fiche opportunité pour présenter le projet aux investisseurs";
        const ficheContent = `${ficheIntro}\n\n${projectData.fiche.trim()}`;
        const ficheBuffer = Buffer.from(ficheContent, 'utf-8');
        
        archive.append(ficheBuffer, { name: 'fiche.txt' });
        console.log(`✅ Fichier fiche.txt ajouté au ZIP (${ficheBuffer.length} bytes)`);
      } catch (error) {
        console.warn(`❌ Impossible d'ajouter fiche.txt:`, error);
        // L'erreur ne bloque pas le processus, on continue
      }
    } else {
      console.log(`ℹ️ Aucune fiche valide disponible pour ce projet`);
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
      // ACL supprimé car le bucket ne les autorise pas
      Metadata: {
        projectUniqueId,
        documentCount: filteredDocuments.length.toString(),
        originalDocumentCount: documents.length.toString(),
        imagesFiltered: (documents.length - filteredDocuments.length).toString(),
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

/**
 * Extensions d'images à filtrer lors de la création du ZIP
 */
const IMAGE_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.heic', '.tiff', '.tif', '.svg', '.ico'
];

/**
 * Vérifie si un fichier est une image basé sur son extension
 */
function isImageFile(fileName: string): boolean {
  const extension = fileName.toLowerCase().split('.').pop();
  return extension ? IMAGE_EXTENSIONS.includes(`.${extension}`) : false;
}

/**
 * Filtre les documents pour exclure les images
 */
export function filterNonImageDocuments(documents: Array<{ fileName: string; url: string }>): Array<{ fileName: string; url: string }> {
  const filteredDocuments = documents.filter(doc => !isImageFile(doc.fileName));
  
  const originalCount = documents.length;
  const filteredCount = filteredDocuments.length;
  const imageCount = originalCount - filteredCount;
  
  console.log(`🖼️ Filtrage des images: ${originalCount} documents → ${filteredCount} documents (${imageCount} images exclues)`);
  
  if (imageCount > 0) {
    const imageFiles = documents.filter(doc => isImageFile(doc.fileName)).map(doc => doc.fileName);
    console.log(`📋 Images exclues: ${imageFiles.join(', ')}`);
  }
  
  return filteredDocuments;
}

/**
 * Dézippe un fichier ZIP et retourne la liste des fichiers extraits
 */
export async function unzipFile(
  zipBuffer: Buffer,
  projectUniqueId: string
): Promise<Array<{ fileName: string; buffer: Buffer; mimeType: string }>> {
  return new Promise((resolve, reject) => {
    const extractedFiles: Array<{ fileName: string; buffer: Buffer; mimeType: string }> = [];
    
    yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        console.error('❌ Erreur lors de l\'ouverture du ZIP:', err);
        return reject(err);
      }
      
      if (!zipfile) {
        return reject(new Error('Impossible d\'ouvrir le fichier ZIP'));
      }
      
      console.log(`📦 Début du dézippage: ${zipfile.entryCount} entrées trouvées`);
      
      zipfile.readEntry();
      
      zipfile.on('entry', (entry) => {
        // Ignorer les dossiers
        if (entry.fileName.endsWith('/')) {
          console.log(`📁 Dossier ignoré: ${entry.fileName}`);
          zipfile.readEntry();
          return;
        }
        
        // Ignorer les fichiers système et cachés
        const fileName = entry.fileName.split('/').pop() || '';
        if (fileName.startsWith('.') || fileName.startsWith('__MACOSX')) {
          console.log(`🚫 Fichier système ignoré: ${entry.fileName}`);
          zipfile.readEntry();
          return;
        }
        
        // Ignorer les images
        if (isImageFile(fileName)) {
          console.log(`🖼️ Image ignorée: ${entry.fileName}`);
          zipfile.readEntry();
          return;
        }
        
        console.log(`📄 Extraction du fichier: ${entry.fileName} (${entry.uncompressedSize} bytes)`);
        
        zipfile.openReadStream(entry, (err, readStream) => {
          if (err) {
            console.error(`❌ Erreur lors de l'ouverture du stream pour ${entry.fileName}:`, err);
            zipfile.readEntry();
            return;
          }
          
          if (!readStream) {
            console.error(`❌ Stream vide pour ${entry.fileName}`);
            zipfile.readEntry();
            return;
          }
          
          const chunks: Buffer[] = [];
          
          readStream.on('data', (chunk) => {
            chunks.push(chunk);
          });
          
          readStream.on('end', () => {
            const fileBuffer = Buffer.concat(chunks);
            
            // Déterminer le type MIME basé sur l'extension
            let mimeType = 'application/octet-stream';
            const extension = fileName.toLowerCase().split('.').pop();
            
            switch (extension) {
              case 'pdf':
                mimeType = 'application/pdf';
                break;
              case 'doc':
                mimeType = 'application/msword';
                break;
              case 'docx':
                mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                break;
              case 'xls':
                mimeType = 'application/vnd.ms-excel';
                break;
              case 'xlsx':
                mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                break;
              case 'ppt':
                mimeType = 'application/vnd.ms-powerpoint';
                break;
              case 'pptx':
                mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
                break;
              case 'txt':
                mimeType = 'text/plain';
                break;
              case 'csv':
                mimeType = 'text/csv';
                break;
            }
            
            extractedFiles.push({
              fileName: fileName,
              buffer: fileBuffer,
              mimeType: mimeType
            });
            
            console.log(`✅ Fichier extrait: ${fileName} (${fileBuffer.length} bytes, ${mimeType})`);
            zipfile.readEntry();
          });
          
          readStream.on('error', (err) => {
            console.error(`❌ Erreur lors de la lecture du stream pour ${entry.fileName}:`, err);
            zipfile.readEntry();
          });
        });
      });
      
      zipfile.on('end', () => {
        console.log(`✅ Dézippage terminé: ${extractedFiles.length} fichiers extraits`);
        resolve(extractedFiles);
      });
      
      zipfile.on('error', (err) => {
        console.error('❌ Erreur lors du dézippage:', err);
        reject(err);
      });
    });
  });
}

/**
 * Upload les fichiers extraits d'un ZIP vers S3
 */
export async function uploadExtractedFilesToS3(
  extractedFiles: Array<{ fileName: string; buffer: Buffer; mimeType: string }>,
  projectUniqueId: string
): Promise<Array<{ s3Url: string; fileName: string; hash: string; mimeType: string; size: number }>> {
  const uploadResults: Array<{ s3Url: string; fileName: string; hash: string; mimeType: string; size: number }> = [];
  
  console.log(`📤 Upload de ${extractedFiles.length} fichiers extraits vers S3...`);
  
  for (const file of extractedFiles) {
    try {
      // Calculer le hash du fichier
      const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
      
      // Nettoyer le nom de fichier
      const cleanFileName = file.fileName.replace(/[<>:"/\\|?*]/g, '_');
      
      // Créer la clé S3
      const s3Key = `projects/${projectUniqueId}/${hash}-${cleanFileName}`;
      
      // Upload vers S3
      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimeType,
        // ACL supprimé car le bucket ne les autorise pas
        Metadata: {
          projectUniqueId,
          originalFileName: file.fileName,
          extractedFromZip: 'true',
          uploadedAt: new Date().toISOString(),
        },
      });
      
      await s3Client.send(putCommand);
      
      // Générer l'URL S3
      const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_REGION || 'eu-north-1'}.amazonaws.com/${s3Key}`;
      
      uploadResults.push({
        s3Url,
        fileName: cleanFileName,
        hash,
        mimeType: file.mimeType,
        size: file.buffer.length,
      });
      
      console.log(`✅ Fichier uploadé: ${cleanFileName} → ${s3Url}`);
      
    } catch (error) {
      console.error(`❌ Erreur lors de l'upload de ${file.fileName}:`, error);
      // Continuer avec les autres fichiers même si un échoue
    }
  }
  
  console.log(`📊 Upload terminé: ${uploadResults.length}/${extractedFiles.length} fichiers uploadés avec succès`);
  
  return uploadResults;
} 