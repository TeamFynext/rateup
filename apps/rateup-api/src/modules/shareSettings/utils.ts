import { randomUUID } from "node:crypto";
import { uploadFile, deleteFile } from "../../utils/upload/s3Upload.js";

async function onFile(part) {
  const buff = await part.toBuffer();
  const { filename, fieldname, mimetype } = part;
  const fileExtension = filename.split(".").pop();
  part.value = {
    fileBuffer: buff,
    filename,
    fieldname,
    mimetype,
    fileExtension,
  };
}

async function uploadFileToS3(fileBuffer, mimetype, fileExtension) {
  const s3Params = {
    Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
    Key: `${randomUUID()}.${fileExtension}`,
    Body: fileBuffer,
    ContentType: mimetype,
  };

  const resultObj = await uploadFile(s3Params);
  const key = resultObj ? resultObj["Key"] : null;
  return key;
}

async function deleteFileFromS3(keyObjArr) {
  const s3Params = {
    Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
    Delete: {
      Objects: [...keyObjArr],
    },
  };
  await deleteFile(s3Params);
}

export { onFile, uploadFileToS3, deleteFileFromS3 };
