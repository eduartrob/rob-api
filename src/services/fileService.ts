import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { uploadToS3 } from "../utils/uploadToS3";

const s3Client = new S3Client({
  region: process.env.IDRIVE_REGION,
  endpoint: process.env.IDRIVE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.IDRIVE_ACCESS_KEY!,
    secretAccessKey: process.env.IDRIVE_SECRET_KEY!,
  },
  forcePathStyle: true,
});


export async function uploadImageProfile(file: Express.Multer.File) {
  const bucket = process.env.IDRIVE_BUCKET || "default-bucket";
  const key = `profile-images/${Date.now()}_${file.originalname}`; 
  // Use a timestamp to ensure unique keys
  return uploadToS3({
    bucket,
    key,
    body: file.buffer,
    contentType: file.mimetype,
  });
}

export async function uploadIcon(file: Express.Multer.File) {
  const bucket = process.env.IDRIVE_BUCKET || "default-bucket";
  const key = `icons/${Date.now()}_${file.originalname}`;

  return uploadToS3({
    bucket,
    key,
    body: file.buffer,
    contentType: file.mimetype,
  });
}

export async function uploadScreenshot(file: Express.Multer.File) {
  const bucket = process.env.IDRIVE_BUCKET || "default-bucket";
  const key = `screenshots/${Date.now()}_${file.originalname}`;

  return uploadToS3({
    bucket,
    key,
    body: file.buffer,
    contentType: file.mimetype,
  });
}

export async function uploadApk(file: Express.Multer.File) {
  const bucket = process.env.IDRIVE_BUCKET || "default-bucket";
  const key = `apks/${Date.now()}_${file.originalname}`;

  return uploadToS3({
    bucket,
    key,
    body: file.buffer,
    contentType: file.mimetype,
  });
}

export async function generatePresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.IDRIVE_BUCKET!,
    Key: key,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
}
