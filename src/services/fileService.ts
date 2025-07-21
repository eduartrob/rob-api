import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";

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


export async function uploadImageProfile(file: Express.Multer.File, userId: string) {
  const bucket = process.env.IDRIVE_BUCKET || "storage-rob";
  const key = `profile-images/${userId}/profile.jpg`;

  return uploadToS3({
    bucket,
    key,
    body: file.buffer,
    contentType: file.mimetype,
  });
}



export async function uploadAppIcon(file: Express.Multer.File, appId: string) {
  const bucket = process.env.IDRIVE_BUCKET || "storage-rob";
  const key = `apps/${appId}/icon${path.extname(file.originalname)}`; // Clave: apps/{appId}/icon.ext

  const result = await uploadToS3({
    bucket,
    key,
    body: file.buffer,
    contentType: file.mimetype,
  });
  return { Key: result.Key, Location: result.Location };
}

export async function uploadAppScreenshot(file: Express.Multer.File, appId: string, index: number) {
  const bucket = process.env.IDRIVE_BUCKET || "storage-rob";
  const key = `apps/${appId}/screenshots/screenshot_${index}${path.extname(file.originalname)}`;

  const result = await uploadToS3({
    bucket,
    key,
    body: file.buffer,
    contentType: file.mimetype,
  });
  return { Key: result.Key, Location: result.Location };
}

export async function uploadAppApk(file: Express.Multer.File, appId: string) {
  const bucket = process.env.IDRIVE_BUCKET || "storage-rob";
  const key = `apps/${appId}/apk/${path.basename(file.originalname)}`; // Clave: apps/{appId}/apk/nombre_original.ext

  const result = await uploadToS3({
    bucket,
    key,
    body: file.buffer,
    contentType: file.mimetype,
  });
  return { Key: result.Key, Location: result.Location };
}

export async function deleteFileFromS3(key: string): Promise<void> {
  const bucket = process.env.IDRIVE_BUCKET || "storage-rob";
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  await s3Client.send(command);
  console.log(`Successfully deleted object with key: ${key} from bucket: ${bucket}`);
}

export async function generatePresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.IDRIVE_BUCKET!,
    Key: key,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
}
