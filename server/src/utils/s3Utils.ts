import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";

const s3 = new S3Client({
  region: env.aws.region,
  credentials: {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  },
});

export const uploadToS3 = async (fileBuffer: Buffer, path: string) => {
  try {
    const command = new PutObjectCommand({
      Bucket: env.aws.bucket,
      Key: path,
      Body: fileBuffer,
      ContentType: "image/png",
    });

    await s3.send(command);
    return path;
  } catch (error) {
    throw new Error('Failed to upload file to S3');
  }
};

export const getSignedUrlFromPath = async (path: string) => {
  try {
    const command = new GetObjectCommand({
      Bucket: env.aws.bucket,
      Key: path,
    });
    
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 60 * 24 * 7 });
    return signedUrl;
  } catch (error) {
    throw new Error('Failed to generate signed URL');
  }
}; 