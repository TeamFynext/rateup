import {
  S3Client,
  DeleteObjectsCommand,
  GetObjectCommand,
  type DeleteObjectsCommandInput,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

export const s3 =
  process.env.AWS_S3_ACCESS_KEY_ID && process.env.AWS_S3_SECRET_KEY
    ? new S3Client({
        region: process.env.AWS_S3_REGION,
        credentials: {
          accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_S3_SECRET_KEY,
        },
      })
    : new S3Client({ region: process.env.AWS_S3_REGION });

export async function uploadFile(params: PutObjectCommandInput) {
  const parallelUploads3 = new Upload({
    client: s3,
    params: params,

    tags: [
      /*...*/
    ], // optional tags
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

export const getFileUrlFromKey = (key: string, s3Upload = true, unsplashImage = false) => {
  if (unsplashImage) {
    return `${process.env.UNSPLASH_URL?.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
  }

  if (s3Upload) {
    const baseUrl = process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL?.replace(/\/+$/, "") || "";
    const cleanKey = key.replace(/^\/+/, ""); // remove leading slashes
    return `${baseUrl}/${cleanKey}`;
  }

  const fallbackBase = process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL?.replace(/\/+$/, "") || "";
  const fallbackKey = key.replace(/^\/+/, "");
  return `${fallbackBase}/${fallbackKey}`;
};
