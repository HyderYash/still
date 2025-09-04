import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// AWS Configuration
const AWS_REGION = import.meta.env.VITE_AWS_REGION;
const S3_BUCKET = import.meta.env.VITE_S3_BUCKET;

// Debug logging
console.log("AWS Configuration:", {
  region: AWS_REGION,
  bucket: S3_BUCKET,
  hasAccessKey: !!import.meta.env.VITE_AWS_ACCESS_KEY_ID,
  hasSecretKey: !!import.meta.env.VITE_AWS_SECRET_ACCESS_KEY
});

// Initialize S3 Client
export const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || "",
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || "",
  },
});

// Common S3 Operations
export const getSignedUrlForObject = async (key: string, expiresIn: number = 3600): Promise<string> => {
  try {
    console.log("Generating signed URL for:", { key, bucket: S3_BUCKET, region: AWS_REGION, expiresIn });

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    console.log("Generated signed URL successfully:", signedUrl.substring(0, 100) + "...");

    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", {
      error,
      key,
      bucket: S3_BUCKET,
      region: AWS_REGION,
      hasCredentials: !!(import.meta.env.VITE_AWS_ACCESS_KEY_ID && import.meta.env.VITE_AWS_SECRET_ACCESS_KEY)
    });
    throw error;
  }
};

export const deleteObjectFromS3 = async (key: string): Promise<boolean> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error("Error deleting object from S3:", error);
    return false;
  }
};

// Export constants
export const AWS_CONFIG = {
  region: AWS_REGION,
  bucket: S3_BUCKET,
}; 