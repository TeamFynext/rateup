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

/**
 * The logo is an image on a QR code. Nothing used to restrict the content type or
 * the extension, so text/html with a .html extension was written to the shared
 * uploads bucket and served from CloudFront as readily as image/png — and the
 * fileUpload module's validateFile helper, which exists precisely for this, was
 * not used here. See issues.txt 35.3.
 */
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
  // Was `resultObj ? resultObj["Key"] : null`, and the controller then wrote
  // `${key}` through a template literal — so a failed upload stored the
  // four-character string "null", a truthy value the read turned into
  // `https://cdn/null` and the next update asked S3 to delete.
  // See issues.txt 35.2.
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
  // deleteFile propagates now (issues.txt 24.3) and both call sites here fire this
  // without awaiting it — removing an old logo is best-effort cleanup and must not
  // fail the settings update, or become an unhandled rejection.
  try {
    await deleteFile(s3Params);
  } catch (error) {
    log.error({ err: error, keys: keyObjArr }, "Could not remove the previous share-settings logo");
  }
}

export { onFile, uploadFileToS3, deleteFileFromS3, ALLOWED_LOGO_TYPES, MAX_LOGO_BYTES };
