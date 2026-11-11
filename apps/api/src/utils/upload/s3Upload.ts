import {
  S3Client,
  DeleteObjectsCommand,
  GetObjectCommand,
  type DeleteObjectsCommandInput,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { log } from "../logger.js";
import { mediaUrl, webImageUrl } from "../url.js";

export const s3 =
  process.env.AWS_S3_ACCESS_KEY_ID && process.env.AWS_S3_SECRET_ACCESS_KEY
    ? new S3Client({
        region: process.env.AWS_S3_REGION,
        credentials: {
          accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
        },
      })
    : new S3Client({ region: process.env.AWS_S3_REGION });

export async function uploadFile(params: PutObjectCommandInput) {
  const parallelUploads3 = new Upload({
    client: s3,
    params: params,

    tags: [/*...*/], // optional tags
    queueSize: 4, // optional concurrency configuration
    partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
    leavePartsOnError: false, // optional manually handle dropped parts
  });

  return await parallelUploads3.done();
}

export async function deleteFile(params: DeleteObjectsCommandInput) {
  const command = new DeleteObjectsCommand(params);
  return await s3.send(command);
}

export const getAWSObject = async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
    Key: key,
  });

  try {
    const response = await s3.send(command);
    // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
    const str = await response.Body;
    if (str) console.log(str.transformToString());
    return str;
  } catch (err) {
    console.error(err);
  }
};

export const getFileUrlFromKey = (key: string, s3Upload = true) =>
  s3Upload ? mediaUrl(key) : webImageUrl(key);

/**
 * Bucket for files that must never have a public URL (invoices with customer addresses), one
 * CloudFront does not front. Production refuses to fall back to the public bucket; elsewhere
 * the fallback keeps local setups working.
 */
export function privateBucket() {
  const bucket = process.env.AWS_S3_PRIVATE_BUCKET;
  if (bucket) return bucket;
  if (process.env.NODE_ENV === "production") {
    log.error("AWS_S3_PRIVATE_BUCKET is not set; refusing to store private files publicly");
    throw new Error("AWS_S3_PRIVATE_BUCKET must be set in production");
  }
  return process.env.AWS_S3_BUCKET || "rateup-survey-uploads";
}

/** A link to a private object that stops working after `expiresIn` seconds (at most 7 days). */
export function signedFileUrl(
  key: string,
  opts: { expiresIn: number; filename?: string; bucket?: string },
) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: opts.bucket ?? privateBucket(),
      Key: key,
      ResponseContentType: opts.filename?.endsWith(".pdf") ? "application/pdf" : undefined,
      ResponseContentDisposition: opts.filename
        ? `inline; filename="${opts.filename.replace(/[^A-Za-z0-9._-]/g, "")}"`
        : undefined,
    }),
    { expiresIn: Math.min(opts.expiresIn, 7 * 24 * 3600) },
  );
}
