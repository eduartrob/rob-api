import { Upload } from "@aws-sdk/lib-storage";
import { s3Client } from "../config/s3Client";
import { Readable } from "stream";

interface UploadParams {
  bucket: string;
  key: string;
  body: Buffer | Readable;
  contentType?: string;
}

export async function uploadToS3({ bucket, key, body, contentType }: UploadParams) {
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: "public-read"
    },
  });

  return upload.done(); // lanza error si falla
}
