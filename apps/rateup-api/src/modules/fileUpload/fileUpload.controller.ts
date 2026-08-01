import { FastifyReply, FastifyRequest } from "fastify";
import { deleteFile, uploadFile } from "../../utils/upload/s3Upload.js";
import { fileDeleteInput } from "./fileUpload.schema.js";
import sharp from "sharp";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import ffmpeg from "fluent-ffmpeg";
import path from "node:path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { validateFile } from "../../utils/upload/validate.js";
import type { PutObjectCommandInput } from "@aws-sdk/client-s3";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function uploadController(req: FastifyRequest, reply: FastifyReply) {
  const data = await req.file();
  if (!data) {
    return reply.code(400).send({ message: "No file uploaded." });
  }
  const metadataField = data.fields.metadata;
  const metadataValue =
    metadataField && !Array.isArray(metadataField) && "value" in metadataField
      ? metadataField.value
      : undefined;
  const metadata =
    metadataValue !== undefined ? JSON.parse(String(metadataValue)) : { allowAll: false };
  const validation = validateFile({
    data,
    allowAll: metadata?.allowAll || false,
  });
  if (!validation.valid) {
    data.file.resume();
    return reply.code(400).send({ message: validation.message });
  }
  const { filename, file } = data;
  const uniqueFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9-.]/g, "")}`;

  let params: PutObjectCommandInput = {
    Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
    Key: uniqueFilename,
    Body: file,
    ContentType: data.mimetype,
  };
  let tempRawPath: string | undefined, tempOutputPath: string | undefined;
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

    let finalBuffer: Buffer;
    let mimetype: string;
    if (data.mimetype === "audio/ogg") {
      await convertToWhatsAppCompatibleOGG(tempRawPath, tempOutputPath);
      mimetype = "audio/ogg";
    } else {
      await convertToM4A(tempRawPath, tempOutputPath);
      mimetype = "audio/mp4";
    }

    finalBuffer = fs.readFileSync(tempOutputPath);
    params = {
      Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
      Key: uniqueFilename,
      Body: finalBuffer,
      ContentType: mimetype,
    };
  }

  try {
    const fileUrl = await uploadFile(params);
    const data = {
      fileUrl,
      key: uniqueFilename,
    };
    reply.code(200).send({ message: "File uploaded successfully", data });
  } catch (err) {
    reply.code(500).send(err);
  } finally {
    if (
      tempRawPath &&
      tempOutputPath &&
      params.ContentType &&
      ["audio/mp4", "audio/ogg"].includes(params.ContentType)
    ) {
      fs.unlinkSync(tempRawPath);
      fs.unlinkSync(tempOutputPath);
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
  const { filename } = data;
  const uniqueFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9-.]/g, "")}`;
  const thumbnailFilename = "thumb300x200-" + uniqueFilename;

  const buffer = await data.toBuffer();
  const params: PutObjectCommandInput = {
    Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
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
    Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
    Key: thumbnailFilename,
    Body: resizedImage,
    ContentType: data.mimetype,
  };

  try {
    const [fileThumbUrl, fileUrl] = await Promise.all([
      uploadFile(paramsThumb),
      uploadFile(params),
    ]);

    const data = {
      fileUrl,
      key: uniqueFilename,
      fileThumbUrl,
      thumbKey: thumbnailFilename,
    };

    reply.code(200).send({ message: "File uploaded successfully", data });
  } catch (err) {
    reply.code(500).send(err);
  }
}

export async function deleteUploadedFileController(
  req: FastifyRequest<{ Body: fileDeleteInput }>,
  reply: FastifyReply,
) {
  let { fileKeyArray } = req.body;
  const params = {
    Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
    Delete: {
      Objects: fileKeyArray,
    },
  };
  try {
    await deleteFile(params);
    reply.code(200).send({ message: "File delete successfully" });
  } catch (err) {
    reply.code(500).send(err);
  }
}
