import { FastifyReply, FastifyRequest } from "fastify";
import { deleteFile, uploadFile } from "../../utils/upload/s3Upload.js";
import { fileDeleteInput } from "./fileUpload.schema.js";
import sharp from "sharp";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { randomUUID } from "node:crypto";
import ffmpeg from "fluent-ffmpeg";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { normalizeMimeType, validateFile } from "../../utils/upload/validate.js";
import {
  matchesSignature,
  peekStream,
  SNIFF_BYTES,
  UploadTooLargeError,
} from "../../utils/upload/sniff.js";
import { resolveUploadOwner, UploadOwnerError } from "./fileUpload.owner.js";
import { log } from "../../utils/logger.js";
import type { PutObjectCommandInput } from "@aws-sdk/client-s3";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const bucket = () => process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads";

/** `<orgId>/<time>-<rand>-<name>`: the org prefix is what scopes deletion. */
function objectKey(orgId: string, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9-.]/g, "");
  return `${orgId}/${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;
}

/** A temp path for ffmpeg: never derived from the client's filename (INJ-5). */
function tempPath(tmpDir: string, extension: string) {
  return path.join(tmpDir, `${randomUUID()}.${extension}`);
}

/**
 * Transcodes run on the API replica, so they are bounded: at most this many at once per
 * process, each killed after FFMPEG_TIMEOUT_SECONDS.
 */
const MAX_CONCURRENT_TRANSCODES = Number(process.env.UPLOAD_TRANSCODE_CONCURRENCY) || 2;
const MAX_QUEUED_TRANSCODES = 20;
const FFMPEG_TIMEOUT_SECONDS = 180;
let activeTranscodes = 0;
const transcodeWaiters: (() => void)[] = [];

class TranscodeBusyError extends Error {
  statusCode = 503;
  constructor() {
    super("The server is busy converting other files. Please try again shortly.");
  }
}

async function withTranscodeSlot<T>(work: () => Promise<T>): Promise<T> {
  if (activeTranscodes >= MAX_CONCURRENT_TRANSCODES) {
    if (transcodeWaiters.length >= MAX_QUEUED_TRANSCODES) throw new TranscodeBusyError();
    await new Promise<void>((resolve) => transcodeWaiters.push(resolve));
  }
  activeTranscodes++;
  try {
    return await work();
  } finally {
    activeTranscodes--;
    transcodeWaiters.shift()?.();
  }
}

/** Maps the errors an upload can end in to a reply, or returns false for a 500. */
function replyForUploadError(reply: FastifyReply, err: unknown): boolean {
  if (err instanceof UploadOwnerError) {
    reply.code(err.statusCode).send({ message: err.message });
    return true;
  }
  if (
    err instanceof UploadTooLargeError ||
    (err as { code?: string } | null)?.code === "FST_REQ_FILE_TOO_LARGE"
  ) {
    reply.code(413).send({ message: "File size exceeds the limit for this type." });
    return true;
  }
  if (err instanceof TranscodeBusyError) {
    reply.code(503).send({ message: err.message });
    return true;
  }
  return false;
}

/**
 * Videos are re-encoded before storage. WhatsApp plays only H.264 video with AAC audio
 * in an MP4, and phones hand over HEVC, `.mov` or 4K files that it refuses.
 */
const VIDEO_TYPES = ["video/mp4", "video/3gpp", "video/quicktime"];

/** Recordings that `?voice=1` converts to a WhatsApp voice note. */
const VOICE_NOTE_SOURCE_TYPES = ["audio/mp4", "audio/aac", "audio/mpeg", "audio/ogg"];

/** The types the thumbnail endpoint can actually hand to sharp. */
const THUMBNAILABLE = ["image/jpeg", "image/png", "image/webp"];

export async function uploadController(req: FastifyRequest, reply: FastifyReply) {
  const data = await req.file();
  if (!data) {
    return reply.code(400).send({ message: "No file uploaded." });
  }
  const validation = validateFile({ data });
  if (!validation.valid) {
    data.file.resume();
    return reply.code(400).send({ message: validation.message });
  }
  const { filename } = data;
  const mimetype = normalizeMimeType(data.mimetype);
  const isVideo = VIDEO_TYPES.includes(mimetype);
  // `?voice=1`: a recording sent as a voice note, which WhatsApp shows as one only when
  // it is OGG/Opus. The phone records AAC, so it is converted here.
  const isVoiceNote =
    (req.query as { voice?: string } | undefined)?.voice === "1" &&
    VOICE_NOTE_SOURCE_TYPES.includes(mimetype);
  // A re-encoded file takes the extension of what it became, so its key says so.
  const extension = isVideo ? ".mp4" : isVoiceNote ? ".ogg" : null;

  let tempRawPath: string | undefined, tempOutputPath: string | undefined;

  try {
    const owner = await resolveUploadOwner(req, reply, data);
    const uniqueFilename = objectKey(
      owner.orgId,
      extension ? filename.replace(/\.[^.]*$/, "") + extension : filename,
    );
    const { head, stream: file } = await peekStream(data.file, SNIFF_BYTES, validation.maxSize);
    if (!matchesSignature(mimetype, head)) {
      data.file.resume();
      return reply.code(400).send({ message: "File content does not match its type." });
    }

    let params: PutObjectCommandInput = {
      Bucket: bucket(),
      Key: uniqueFilename,
      Body: file,
      ContentType: mimetype,
    };

    if (isVoiceNote) {
      const tmpDir = ensureTmpDir();
      tempRawPath = tempPath(tmpDir, "upload");
      tempOutputPath = tempPath(tmpDir, "ogg");

      await pumpToFile(file, tempRawPath);
      await withTranscodeSlot(() => convertToVoiceNote(tempRawPath!, tempOutputPath!));

      params = {
        Bucket: bucket(),
        Key: uniqueFilename,
        Body: await fsp.readFile(tempOutputPath),
        ContentType: "audio/ogg",
      };
    } else if (mimetype === "audio/mp4" || mimetype === "audio/mpeg" || mimetype === "audio/ogg") {
      const tmpDir = ensureTmpDir();
      tempRawPath = tempPath(tmpDir, "upload");
      tempOutputPath = tempPath(tmpDir, mimetype === "audio/ogg" ? "ogg" : "m4a");

      await pumpToFile(file, tempRawPath);

      let outputType: string;
      if (mimetype === "audio/ogg") {
        await withTranscodeSlot(() =>
          convertToWhatsAppCompatibleOGG(tempRawPath!, tempOutputPath!),
        );
        outputType = "audio/ogg";
      } else {
        await withTranscodeSlot(() => convertToM4A(tempRawPath!, tempOutputPath!));
        outputType = "audio/mp4";
      }

      const finalBuffer = await fsp.readFile(tempOutputPath);
      params = {
        Bucket: bucket(),
        Key: uniqueFilename,
        Body: finalBuffer,
        ContentType: outputType,
      };
    } else if (isVideo) {
      const tmpDir = ensureTmpDir();
      tempRawPath = tempPath(tmpDir, "upload");
      tempOutputPath = tempPath(tmpDir, "mp4");

      await pumpToFile(file, tempRawPath);
      await withTranscodeSlot(() => convertToWhatsAppCompatibleMP4(tempRawPath!, tempOutputPath!));

      params = {
        Bucket: bucket(),
        Key: uniqueFilename,
        Body: await fsp.readFile(tempOutputPath),
        ContentType: "video/mp4",
      };
    }

    const fileUrl = await uploadFile(params);
    reply.code(200).send({
      message: "File uploaded successfully",
      data: { fileUrl, key: uniqueFilename },
    });
  } catch (err) {
    if (replyForUploadError(reply, err)) return;
    log.error({ err }, "File upload failed");
    reply.code(500).send({ message: "Something went wrong" });
  } finally {
    // Keyed off the temp paths themselves rather than off params.ContentType, so a
    // failed transcode cleans up too, and unlinked with a catch so a file that is
    // already gone cannot throw from a finally and mask the real error.
    await removeTempFiles(tempRawPath, tempOutputPath);
  }
}

function ensureTmpDir() {
  const tmpDir = path.join(".", "tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  return tmpDir;
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
  return pipeline(source, fs.createWriteStream(filePath));
}

function convertToM4A(input: string, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input, { timeout: FFMPEG_TIMEOUT_SECONDS })
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
    ffmpeg(inputPath, { timeout: FFMPEG_TIMEOUT_SECONDS })
      .audioCodec("libopus")
      .audioBitrate("64k")
      .format("ogg")
      .on("end", () => resolve())
      .on("error", reject)
      .save(outputPath);
  });
}

/** WhatsApp's voice note format: Opus in an OGG container, mono, at speech bitrate. */
function convertToVoiceNote(input: string, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input, { timeout: FFMPEG_TIMEOUT_SECONDS })
      .audioCodec("libopus")
      .audioChannels(1)
      .audioFrequency(48000)
      .audioBitrate("32k")
      .format("ogg")
      .on("end", () => resolve())
      .on("error", reject)
      .save(output);
  });
}

/**
 * H.264 (baseline-compatible yuv420p) with AAC audio, at most 1280px on the long side,
 * with the index up front so it plays before it is fully downloaded.
 */
function convertToWhatsAppCompatibleMP4(input: string, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input, { timeout: FFMPEG_TIMEOUT_SECONDS })
      .videoCodec("libx264")
      .audioCodec("aac")
      .audioBitrate("128k")
      .outputOptions([
        "-preset veryfast",
        "-crf 26",
        "-pix_fmt yuv420p",
        // Fit inside 1280x1280 without upscaling; -2 keeps the other side even, as x264 needs.
        "-vf scale='if(gte(iw,ih),min(1280,iw),-2)':'if(gte(iw,ih),-2,min(1280,ih))'",
        "-movflags +faststart",
      ])
      .format("mp4")
      .on("end", () => resolve())
      .on("error", reject)
      .save(output);
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
  const mimetype = normalizeMimeType(data.mimetype);
  if (!THUMBNAILABLE.includes(mimetype)) {
    data.file.resume();
    return reply.code(400).send({ message: "This endpoint accepts images only." });
  }
  const { filename } = data;

  try {
    const owner = await resolveUploadOwner(req, reply, data);
    const buffer = await data.toBuffer();
    if (validation.maxSize && buffer.length > validation.maxSize) {
      throw new UploadTooLargeError();
    }
    if (!matchesSignature(mimetype, buffer.subarray(0, SNIFF_BYTES))) {
      return reply.code(400).send({ message: "File content does not match its type." });
    }
    const uniqueFilename = objectKey(owner.orgId, filename);
    // Same org prefix as the original, so deleting one is scoped like the other.
    const thumbnailFilename = uniqueFilename.replace(/^([^/]+\/)/, "$1thumb300x200-");
    const params: PutObjectCommandInput = {
      Bucket: bucket(),
      Key: uniqueFilename,
      Body: buffer,
      ContentType: mimetype,
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
    if (replyForUploadError(reply, err)) return;
    log.error({ err }, "File upload with thumbnail failed");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

/**
 * Deletes uploads of the caller's org. The route requires a session; a key is only
 * deletable when it carries the `<orgId>/` prefix uploads have been given since
 * 2026-10-20. Older, unprefixed keys have no recorded owner and are refused.
 */
export async function deleteUploadedFileController(
  req: FastifyRequest<{ Body: fileDeleteInput }>,
  reply: FastifyReply,
) {
  const { fileKeyArray } = req.body;
  const orgId = req.actor?.orgId ?? req.user?.orgId;
  if (!orgId) {
    return reply.code(401).send({ message: "Not authorized" });
  }
  const prefix = `${orgId}/`;
  const foreign = fileKeyArray.filter(
    ({ Key }) => !Key.startsWith(prefix) || Key.length === prefix.length || Key.includes(".."),
  );
  if (foreign.length) {
    return reply.code(403).send({
      message: "Some files do not belong to your organisation.",
      keys: foreign.map(({ Key }) => Key),
    });
  }
  const params = {
    Bucket: bucket(),
    Delete: {
      Objects: fileKeyArray.map(({ Key }) => ({ Key })),
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
