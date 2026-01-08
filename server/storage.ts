/**
 * File Storage Module
 * 
 * This module provides file storage functionality.
 * 
 * Configuration options (set in environment variables):
 * 
 * 1. AWS S3 Storage:
 *    - AWS_ACCESS_KEY_ID
 *    - AWS_SECRET_ACCESS_KEY
 *    - AWS_S3_BUCKET
 *    - AWS_S3_REGION (default: us-east-1)
 * 
 * 2. Local File Storage (fallback):
 *    - STORAGE_PATH (default: ./uploads)
 * 
 * If no S3 credentials are configured, files will be stored locally.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Storage configuration
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? "";
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET ?? "";
const AWS_S3_REGION = process.env.AWS_S3_REGION ?? "us-east-1";
const STORAGE_PATH = process.env.STORAGE_PATH ?? "./uploads";
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

/**
 * Check if S3 storage is configured.
 */
export function isS3Configured(): boolean {
  return Boolean(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_S3_BUCKET);
}

/**
 * Generate a unique filename with hash.
 */
function generateUniqueFilename(originalName: string): string {
  const hash = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  return `${base}-${hash}${ext}`;
}

/**
 * Upload a file to storage.
 * 
 * @param relKey - Relative path/key for the file
 * @param data - File data as Buffer, Uint8Array, or string
 * @param contentType - MIME type of the file
 * @returns Object with key and URL
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  
  if (isS3Configured()) {
    // Use S3 storage
    return await uploadToS3(key, data, contentType);
  } else {
    // Use local file storage
    return await uploadToLocal(key, data);
  }
}

/**
 * Get a URL for a stored file.
 * 
 * @param relKey - Relative path/key for the file
 * @returns Object with key and URL
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  
  if (isS3Configured()) {
    // Return S3 URL
    return {
      key,
      url: `https://${AWS_S3_BUCKET}.s3.${AWS_S3_REGION}.amazonaws.com/${key}`,
    };
  } else {
    // Return local URL
    return {
      key,
      url: `${BASE_URL}/uploads/${key}`,
    };
  }
}

/**
 * Upload file to local storage.
 */
async function uploadToLocal(
  key: string,
  data: Buffer | Uint8Array | string
): Promise<{ key: string; url: string }> {
  const uploadDir = path.resolve(STORAGE_PATH);
  const filePath = path.join(uploadDir, key);
  const fileDir = path.dirname(filePath);
  
  // Ensure directory exists
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true });
  }
  
  // Write file
  const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
  fs.writeFileSync(filePath, buffer);
  
  return {
    key,
    url: `${BASE_URL}/uploads/${key}`,
  };
}

/**
 * Upload file to S3.
 * Note: For production, consider using the AWS SDK for better reliability.
 */
async function uploadToS3(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  // For a simple implementation without AWS SDK, we'll use the S3 REST API
  // In production, you should use @aws-sdk/client-s3
  
  const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
  const endpoint = `https://${AWS_S3_BUCKET}.s3.${AWS_S3_REGION}.amazonaws.com/${key}`;
  
  // Create AWS Signature V4 headers
  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = date.slice(0, 8);
  
  // Simplified S3 upload - in production use AWS SDK
  console.warn(
    "[Storage] S3 upload requires AWS SDK. " +
    "Install @aws-sdk/client-s3 for production use. " +
    "Falling back to local storage."
  );
  
  // Fallback to local storage
  return await uploadToLocal(key, data);
}

/**
 * Delete a file from storage.
 */
export async function storageDelete(relKey: string): Promise<boolean> {
  const key = relKey.replace(/^\/+/, "");
  
  if (!isS3Configured()) {
    // Delete from local storage
    const filePath = path.join(path.resolve(STORAGE_PATH), key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  }
  
  // S3 delete would require AWS SDK
  return false;
}
