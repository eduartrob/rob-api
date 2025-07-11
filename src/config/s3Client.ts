import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();

export const s3Client = new S3Client({
  region: process.env.IDRIVE_REGION || "us-west-1",
  endpoint: process.env.IDRIVE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.IDRIVE_ACCESS_KEY!,
    secretAccessKey: process.env.IDRIVE_SECRET_KEY!,
  },
  forcePathStyle: true,
});

export async function generateSignedUrl(bucketName: string, key: string, expiresInSeconds = 3600) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  return signedUrl;
}