import { FastifyReply, FastifyRequest } from "fastify";
import { deleteFile, uploadFile } from "../../utils/upload/s3Upload.js";
import { fileDeleteInput } from "./fileUpload.schema.js";
import sharp from "sharp";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { randomUUID } from "node:crypto";
import ffmpeg from "fluent-ffmpeg";
import path from "node:path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { validateFile } from "../../utils/upload/validate.js";
import { log } from "../../utils/logger.js";
import type { PutObjectCommandInput } from "@aws-sdk/client-s3";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const bucket = () => process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads";

/**
 * An object key for an upload.
 *
 * The timestamp used to be the only thing distinguishing two uploads, so two files
 * of the same name in the same millisecond overwrote each other silently. A short
 * random component removes the collision. See issues.txt 24.8.
 */
function objectKey(filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9-.]/g, "");
  return `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;
}

/** The types the thumbnail endpoint can actually hand to sharp. */
const THUMBNAILABLE = ["image/jpeg", "image/png", "image/webp"];

export async function uploadController(req: FastifyRequest, reply: FastifyReply) {
  const data = await req.file();
  if (!data) {
    return reply.code(400).send({ message: "No file uploaded." });
  }
  // `allowAll` used to be read from a caller-supplied `metadata` form field and
  // passed into validateFile, whose first statement returns `{ valid: true }` for
  // it — ahead of the type and size checks. On an unauthenticated endpoint that is
  // the uploader switching off the allowlist. Nothing server-side ever set the
  // flag, so the field is simply not read any more; the unguarded JSON.parse that
  // read it (24.5) goes with it. See issues.txt 24.1.
  const validation = validateFile({ data });
  if (!validation.valid) {
    data.file.resume();
    return reply.code(400).send({ message: validation.message });
  }
  const { filename, file } = data;
  const uniqueFilename = objectKey(filename);

  let params: PutObjectCommandInput = {
    Bucket: bucket(),
    Key: uniqueFilename,
    Body: file,
    ContentType: data.mimetype,
  };
  let tempRawPath: string | undefined, tempOutputPath: string | undefined;

  try {
    // The transcode used to sit OUTSIDE this try, so an ffmpeg failure escaped the
    // handler as an unhandled rejection instead of a 500 — and left both temp files
    // behind, because the finally keyed its cleanup off params.ContentType, which is
    // only reassigned after a SUCCESSFUL convert. See issues.txt 24.4.
    if (
      data.mimetype === "audio/mp4" ||
      data.mimetype === "audio/mpeg" ||
      data.mimetype === "audio/ogg"
    ) {
      const tmpDir = path.join(".", "tmp");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      tempRawPath = path.join(tmpDir, `${randomUUID()}_${filename}`);
      tempOutputPath = path.join(tmpDir, `${randomUUID()}_output.m4a`);

      await pumpToFile(file, tempRawPath);

      let mimetype: string;
      if (data.mimetype === "audio/ogg") {
        await convertToWhatsAppCompatibleOGG(tempRawPath, tempOutputPath);
        mimetype = "audio/ogg";
      } else {
        await convertToM4A(tempRawPath, tempOutputPath);
        mimetype = "audio/mp4";
      }

      // fs/promises: the synchronous read blocked the event loop for the whole
      // process, on a file that can be as large as the multipart limit allows.
      // See issues.txt 24.6.
      const finalBuffer = await fsp.readFile(tempOutputPath);
      params = {
        Bucket: bucket(),
        Key: uniqueFilename,
        Body: finalBuffer,
        ContentType: mimetype,
      };
    }

    const fileUrl = await uploadFile(params);
    reply.code(200).send({
      message: "File uploaded successfully",
      data: { fileUrl, key: uniqueFilename },
    });
  } catch (err) {
    log.error({ err }, "File upload failed");
    reply.code(500).send({ message: "Something went wrong" });
  } finally {
    // Keyed off the temp paths themselves rather than off params.ContentType, so a
    // failed transcode cleans up too, and unlinked with a catch so a file that is
    // already gone cannot throw from a finally and mask the real error.
    await removeTempFiles(tempRawPath, tempOutputPath);
  }
}

async function removeTempFiles(...paths: (string | undefined)[]) {
  for (const filePath of paths) {
    if (!filePath) continue;
    try {
      await fsp.unlink(filePath);
    } catch (err) {
      log.warn({ err, filePath }, "Could not remove a temporary upload file");
    }
  }
}

function pumpToFile(source: NodeJS.ReadableStream, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(filePath);
    source.pipe(dest);
    dest.on("finish", resolve);
    dest.on("error", reject);
  });
}

function convertToM4A(input: string, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .audioCodec("aac")
      .audioBitrate("64k")
      .outputOptions("-movflags +faststart")
      .on("end", () => resolve())
      .on("error", reject)
      .save(output);
  });
}

function convertToWhatsAppCompatibleOGG(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec("libopus")
      .audioBitrate("64k")
      .format("ogg")
      .on("end", () => resolve())
      .on("error", reject)
      .save(outputPath);
  });
}

export async function uploadWithThumbnailsController(req: FastifyRequest, reply: FastifyReply) {
  const data = await req.file();
  if (!data) {
    return reply.code(400).send({ message: "No file uploaded." });
  }
  const validation = validateFile({ data });
  if (!validation.valid) {
    data.file.resume();
    return reply.code(400).send({ message: validation.message });
  }
  // This endpoint accepted every type validateFile permits — PDFs and videos
  // included — and handed the bytes straight to sharp, which threw
  // "unsupported image format" outside any try/catch. See issues.txt 24.7.
  if (!THUMBNAILABLE.includes(data.mimetype)) {
    data.file.resume();
    return reply.code(400).send({ message: "This endpoint accepts images only." });
  }
  const { filename } = data;
  const uniqueFilename = objectKey(filename);
  const thumbnailFilename = "thumb300x200-" + uniqueFilename;

  try {
    // Still buffered: both the original and the thumbnail need the same bytes, so
    // one of the two has to be materialised. The type check above bounds what can
    // reach it. See issues.txt 24.6.
    const buffer = await data.toBuffer();
    const params: PutObjectCommandInput = {
      Bucket: bucket(),
      Key: uniqueFilename,
      Body: buffer,
      ContentType: data.mimetype,
    };
    const resizedImage = await sharp(buffer)
      .resize({
        fit: "inside",
        width: 300,
        height: 200,
      })
      .webp()
      .toBuffer();

    const paramsThumb: PutObjectCommandInput = {
      Bucket: bucket(),
      Key: thumbnailFilename,
      Body: resizedImage,
      // The thumbnail is webp bytes; it used to be labelled with the ORIGINAL
      // file's type, so a JPEG upload stored webp served as image/jpeg.
      // See issues.txt 24.7.
      ContentType: "image/webp",
    };

    const [fileThumbUrl, fileUrl] = await Promise.all([
      uploadFile(paramsThumb),
      uploadFile(params),
    ]);

    reply.code(200).send({
      message: "File uploaded successfully",
      data: {
        fileUrl,
        key: uniqueFilename,
        fileThumbUrl,
        thumbKey: thumbnailFilename,
      },
    });
  } catch (err) {
    log.error({ err }, "File upload with thumbnail failed");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function deleteUploadedFileController(
  req: FastifyRequest<{ Body: fileDeleteInput }>,
  reply: FastifyReply,
) {
  const { fileKeyArray } = req.body;
  const params = {
    Bucket: bucket(),
    Delete: {
      Objects: fileKeyArray,
    },
  };
  try {
    await deleteFile(params);
    reply.code(200).send({ message: "File delete successfully" });
  } catch (err) {
    log.error({ err }, "File delete failed");
    reply.code(500).send({ message: "Something went wrong" });
  }
}
