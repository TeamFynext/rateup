import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_S3_SECRET_KEY,
  },
});

const CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN;

export async function uploadFile(params) {
  try {
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

    parallelUploads3.on("httpUploadProgress", (progress) => {
      console.log(progress);
    });

    await parallelUploads3.done();
  } catch (e) {
    console.log(e);
  }
}

export async function deleteFile(params) {
  const command = new DeleteObjectsCommand(params);
  try {
    const response = await s3.send(command);
    return response;
  } catch (err) {
    return err;
  }
}
