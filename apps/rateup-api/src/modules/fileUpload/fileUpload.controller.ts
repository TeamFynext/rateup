import { FastifyReply, FastifyRequest } from "fastify";
import { deleteFile, uploadFile } from "../../utils/upload/s3Upload";
import { fileDeleteInput } from "./fileUpload.schema";

export async function uploadController(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const data = await req.file();
  const { filename, file} = data;
  const uniqueFilename = `${Date.now()}-${filename}`;

  const params = {
    Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
    Key: uniqueFilename,
    Body: file,
  };

  try {
    const fileUrl = await uploadFile(params);
    const data = {
      fileUrl,
      key: uniqueFilename,
    };
    reply.code(200).send({ message: "File uploaded successfully", data });
    console.log("............Upload succesful");
  } catch (err) {
    reply.code(500).send(err);
  }
}

export async function deleteUploadedFileController(
  req: FastifyRequest<{ Body: fileDeleteInput }>,
  reply: FastifyReply
) {
  let { fileKey } = req.body;
  const params = {
    Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
    Key: fileKey,
  };
  try {
    await deleteFile(params);
    reply.code(200).send({ message: "File delete successfully" });
  } catch (err) {
    reply.code(500).send(err);
  }
}
