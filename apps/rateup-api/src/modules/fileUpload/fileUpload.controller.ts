import { FastifyReply, FastifyRequest } from "fastify";
import { uploadFile } from "../../utils/upload/s3Upload";

interface MultipartRequest extends FastifyRequest {
    file: () => Promise<{
      filename: string;
      mimetype: string;
      file: Buffer;
    }>;
  }
  
  export async function uploadController(req: FastifyRequest, reply: FastifyReply) {
    const multipartReq = req as MultipartRequest;
    const data = await multipartReq.file();
    const { filename, mimetype, file } = data;
    const uniqueFilename = `${Date.now()}-${filename}`;
  
    const params = {
      Bucket: process?.env?.AWS_S3_BUCKET || 'rateup-survey-uploads',
      Key: uniqueFilename,
      ContentType: mimetype,
      Body: file,
    };
  
    try {
      const fileUrl = await uploadFile(params);
      const data = {
        fileUrl,
        key: uniqueFilename
      }
      reply.code(200).send({ message: 'File uploaded successfully', data });
      console.log("............Upload succesful")
    } catch (err) {
      reply.code(500).send(err);
    }
  }