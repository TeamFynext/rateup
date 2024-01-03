import { FastifyReply, FastifyRequest } from "fastify";
import { deleteFile, uploadFile } from "../../utils/upload/s3Upload";
import { allowedMimeTypes, fileDeleteInput } from "./fileUpload.schema";

export async function uploadController(
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

  const params = {
    Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
    Key: uniqueFilename,
    Body: file,
    ContentType: data.mimetype,
  };

  try {
    const fileUrl = await uploadFile(params);
    const data = {
      fileUrl,
      key: uniqueFilename,
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
