import { FastifyReply, FastifyRequest } from "fastify";
import { deleteFile, uploadFile } from "../../utils/upload/s3Upload";
import { allowedMimeTypes, fileDeleteInput } from "./fileUpload.schema";
import sharp from "sharp";
import { log } from "../../utils/logger";
import fs from "fs";
import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function uploadController(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const data = await req.file();
  const metadata = data?.fields?.metadata
    ? JSON.parse(data?.fields?.metadata?.["value"])
    : null;
  if (!metadata || !metadata.allowAll) {
    if (!allowedMimeTypes.includes(data?.mimetype) || data.type !== "file") {
      log.debug("mime => %o", data?.mimetype);
      log.debug("type => %o", data.type);
      return reply
        .code(400)
        .send({ message: "This file type is not permitted." });
    }
  }
  const { filename, file } = data;
  const uniqueFilename = `${Date.now()}-${filename.replace(
    /[^a-zA-Z0-9-.]/g,
    "",
  )}`;

  let params;
  params = {
    Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
    Key: uniqueFilename,
    Body: file,
    ContentType: data.mimetype,
  };
  let tempRawPath, tempOutputPath;
  if (
    data.mimetype === "audio/mp4" ||
    data.mimetype === "audio/mpeg" ||
    data.mimetype === "audio/ogg"
  ) {
    const tmpDir = path.join(".", "tmp");
    // Check if the directory exists, and create it if it doesn't
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    tempRawPath = path.join(tmpDir, `${randomUUID()}_${filename}`);
    tempOutputPath = tempRawPath.replace(/\.[^/.]+$/, "") + ".m4a"; // Convert to .m4a

    await pumpToFile(file, tempRawPath);

    let finalBuffer: Buffer;
    let mimetype;
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
    if (["audio/mp4", "audio/ogg"].includes(params.ContentType)) {
      fs.unlinkSync(tempRawPath);
      fs.unlinkSync(tempOutputPath);
    }

    const data = {
      fileUrl,
      key: uniqueFilename,
    };
    reply.code(200).send({ message: "File uploaded successfully", data });
  } catch (err) {
    reply.code(500).send(err);
  }
}

function pumpToFile(
  source: NodeJS.ReadableStream,
  filePath: string,
): Promise<void> {
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
      .on("end", resolve)
      .on("error", reject)
      .save(output);
  });
}

function convertToWhatsAppCompatibleOGG(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec("libopus")
      .audioBitrate("64k")
      .format("ogg")
      .on("end", resolve)
      .on("error", reject)
      .save(outputPath);
  });
}

export async function uploadWithThumbnailsController(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const data = await req.file();
  if (!allowedMimeTypes.includes(data?.mimetype) || data.type !== "file") {
    return reply
      .code(400)
      .send({ message: "This file type is not permitted." });
  }
  const { filename, file } = data;
  const uniqueFilename = `${Date.now()}-${filename.replace(
    /[^a-zA-Z0-9-.]/g,
    "",
  )}`;
  const thumbnailFilename = "thumb300x200-" + uniqueFilename;

  const buffer = await data.toBuffer();
  const params = {
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

  const paramsThumb = {
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
