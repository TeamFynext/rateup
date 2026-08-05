import { randomUUID } from "node:crypto";
import { uploadFile, deleteFile } from "../../utils/upload/s3Upload.js";
import { log } from "../../utils/logger.js";

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

const ALLOWED_LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

/** Bounds the part @fastify/multipart buffers in memory before anything reads it. */
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export class LogoUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LogoUploadError";
  }
}

async function onFile(part: MultipartFilePart) {
  const buff = await part.toBuffer();
  const { filename, fieldname, mimetype } = part;
  if (!ALLOWED_LOGO_TYPES[mimetype]) {
    throw new LogoUploadError(`Unsupported logo type: ${mimetype}`);
  }
  if (buff.length > MAX_LOGO_BYTES) {
    throw new LogoUploadError("Logo is larger than 2MB");
  }
  part.value = {
    fileBuffer: buff,
    filename,
    fieldname,
    mimetype,
    // Was `filename.split(".").pop()`, so the caller named the extension of an
    // object served from CloudFront — and a filename with no dot became its own
    // extension. The extension is derived from the allowlisted type instead.
    fileExtension: ALLOWED_LOGO_TYPES[mimetype]!,
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
  const key = resultObj?.["Key"];
  if (!key) {
    throw new LogoUploadError("The logo upload returned no object key");
  }
  return key;
}

async function deleteFileFromS3(keyObjArr: Array<{ Key: string }>) {
  const s3Params = {
    Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
    Delete: {
      Objects: [...keyObjArr],
    },
  };
  try {
    await deleteFile(s3Params);
  } catch (error) {
    log.error({ err: error, keys: keyObjArr }, "Could not remove the previous share-settings logo");
  }
}

export { onFile, uploadFileToS3, deleteFileFromS3, ALLOWED_LOGO_TYPES, MAX_LOGO_BYTES };
