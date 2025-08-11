import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import dotenv from 'dotenv';

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
    const finalFileName = fileName || extractFileNameFromUrl(fileUrl) || `file-${Date.now()}`;
    
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
    return fileName && fileName.length > 0 ? fileName : null;
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
    return url.pathname.substring(1); // Enlever le "/" initial
  } catch {
    throw new Error('Invalid S3 URL format');
  }
} 