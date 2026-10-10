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
import { normalizeMimeType, validateFile } from "../../utils/upload/validate.js";
import { log } from "../../utils/logger.js";
import type { PutObjectCommandInput } from "@aws-sdk/client-s3";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const bucket = () => process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads";

function objectKey(filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9-.]/g, "");
  return `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;
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
  const { filename, file } = data;
  const mimetype = normalizeMimeType(data.mimetype);
  const isVideo = VIDEO_TYPES.includes(mimetype);
  // `?voice=1`: a recording sent as a voice note, which WhatsApp shows as one only when
  // it is OGG/Opus. The phone records AAC, so it is converted here.
  const isVoiceNote =
    (req.query as { voice?: string } | undefined)?.voice === "1" &&
    VOICE_NOTE_SOURCE_TYPES.includes(mimetype);
  // A re-encoded file takes the extension of what it became, so its key says so.
  const extension = isVideo ? ".mp4" : isVoiceNote ? ".ogg" : null;
  const uniqueFilename = objectKey(
    extension ? filename.replace(/\.[^.]*$/, "") + extension : filename,
  );


  let params: PutObjectCommandInput = {
    Bucket: bucket(),
    Key: uniqueFilename,
    Body: file,
    ContentType: mimetype,
  };
  let tempRawPath: string | undefined, tempOutputPath: string | undefined;

  try {
    if (isVoiceNote) {
      const tmpDir = path.join(".", "tmp");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      tempRawPath = path.join(tmpDir, `${randomUUID()}_${filename}`);
      tempOutputPath = path.join(tmpDir, `${randomUUID()}_voice.ogg`);

      await pumpToFile(file, tempRawPath);
      await convertToVoiceNote(tempRawPath, tempOutputPath);

      params = {
        Bucket: bucket(),
        Key: uniqueFilename,
        Body: await fsp.readFile(tempOutputPath),
        ContentType: "audio/ogg",
      };
    } else if (
      mimetype === "audio/mp4" ||
      mimetype === "audio/mpeg" ||
      mimetype === "audio/ogg"
    ) {
      const tmpDir = path.join(".", "tmp");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      tempRawPath = path.join(tmpDir, `${randomUUID()}_${filename}`);
      tempOutputPath = path.join(tmpDir, `${randomUUID()}_output.m4a`);

      await pumpToFile(file, tempRawPath);

      let outputType: string;
      if (mimetype === "audio/ogg") {
        await convertToWhatsAppCompatibleOGG(tempRawPath, tempOutputPath);
        outputType = "audio/ogg";
      } else {
        await convertToM4A(tempRawPath, tempOutputPath);
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
      const tmpDir = path.join(".", "tmp");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      tempRawPath = path.join(tmpDir, `${randomUUID()}_${filename}`);
      tempOutputPath = path.join(tmpDir, `${randomUUID()}_output.mp4`);

      await pumpToFile(file, tempRawPath);
      await convertToWhatsAppCompatibleMP4(tempRawPath, tempOutputPath);

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

/** WhatsApp's voice note format: Opus in an OGG container, mono, at speech bitrate. */
function convertToVoiceNote(input: string, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
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
    ffmpeg(input)
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
  const uniqueFilename = objectKey(filename);
  const thumbnailFilename = "thumb300x200-" + uniqueFilename;

  try {
    const buffer = await data.toBuffer();
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
