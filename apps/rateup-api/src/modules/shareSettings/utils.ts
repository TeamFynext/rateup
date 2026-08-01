import { randomUUID } from "node:crypto";
import { uploadFile, deleteFile } from "../../utils/upload/s3Upload.js";

/**
 * The share settings as they are stored in the `shareSettings` JSON column,
 * once the controller has resolved the logo to an S3 key (or null).
 */
export interface StoredShareSettings {
  qrBgColor?: string;
  qrColor?: string;
  logoSize?: number;
  logoFillType?: string;
  logoBorderRadius?: number;
  logoFile?: string | null;
  isLogoEnabled?: boolean;
}

const isStoredShareSettings = (value: unknown): value is StoredShareSettings =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Prisma types the column as JsonValue; it only ever holds null or a settings
 * object, so anything else is treated as "nothing configured".
 */
export const toStoredShareSettings = (value: unknown): StoredShareSettings | null =>
  isStoredShareSettings(value) ? value : null;

/**
 * What onFile attaches to a multipart part — and therefore what the parsed body
 * carries for the logo field under `attachFieldsToBody: "keyValues"`.
 */
export interface UploadedFilePart {
  fileBuffer: Buffer;
  filename: string;
  fieldname: string;
  mimetype: string;
  fileExtension: string;
}

/** The subset of a @fastify/multipart file part this module reads and writes. */
interface MultipartFilePart {
  filename: string;
  fieldname: string;
  mimetype: string;
  toBuffer: () => Promise<Buffer>;
  value?: UploadedFilePart;
}

async function onFile(part: MultipartFilePart) {
  const buff = await part.toBuffer();
  const { filename, fieldname, mimetype } = part;
  const fileExtension = filename.split(".").pop();
  part.value = {
    fileBuffer: buff,
    filename,
    fieldname,
    mimetype,
    fileExtension: fileExtension!,
  };
}

async function uploadFileToS3(fileBuffer: Buffer, mimetype: string, fileExtension: string) {
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

async function deleteFileFromS3(keyObjArr: Array<{ Key: string }>) {
  const s3Params = {
    Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
    Delete: {
      Objects: [...keyObjArr],
    },
  };
  await deleteFile(s3Params);
}

export { onFile, uploadFileToS3, deleteFileFromS3 };
