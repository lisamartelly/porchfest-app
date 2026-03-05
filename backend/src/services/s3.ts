import {
  S3Client,
  type S3ClientConfig,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3Client: S3Client;

function getS3Client() {
  if (!s3Client) {
    const config: S3ClientConfig = {
      region: process.env.AWS_REGION || "us-east-2",
    };
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    s3Client = new S3Client(config);
  }
  return s3Client;
}

function getBucket() {
  return process.env.S3_BUCKET_NAME || "porchfest-band-photos-dev";
}

export async function getPresignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: 300,
  });

  return uploadUrl;
}

export async function deleteObject(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  await getS3Client().send(command);
}

export function getPublicUrl(key: string) {
  const bucket = getBucket();
  const region = process.env.AWS_REGION || "us-east-2";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
