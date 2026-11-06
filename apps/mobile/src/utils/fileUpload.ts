import axios from "../config/axios";
import { logger } from "@/utils/logger";

export const getFileUrlFromKey = (key: string, s3Upload = true, unsplashImage = false) => {
  if (!key) return;
  if (unsplashImage)
    return key?.startsWith("https") ? key : `${process.env.EXPO_PUBLIC_UNSPLASH_URL}${key}`;

  const imgUrl = s3Upload
    ? `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${key}`
    : `${process.env.EXPO_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}${key}`;
  return imgUrl;
};

export const deleteUploadedFiles = async (data: any) => {
  try {
    const response = await axios.put(`/api/public/upload/file/delete`, data, {
      headers: {
        Accept: "application/json",
      },
    });
    return response?.data;
  } catch (error) {
    logger.log("error", error);
  }
};

/**
 * `voiceNote`: the API converts the recording to OGG/Opus, the format WhatsApp shows as a
 * voice message rather than an audio file. Asked for in the query string, because the
 * multipart fields after the file are not read before the file is.
 */
export const uploadFile = async (
  file: File,
  withThumbnails = false,
  data = { allowAll: false },
  { voiceNote = false } = {},
): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("metadata", JSON.stringify(data));

  try {
    const response = await axios.post(
      `/api/public/upload/${withThumbnails ? "fileWithThumb" : "file"}${voiceNote ? "?voice=1" : ""}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response?.data?.data?.key as string;
  } catch (error: any) {
    logger.log("File upload failed:", error?.response?.data?.message);
    throw error?.response?.data?.message;
  }
};
