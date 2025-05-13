import axios from "../config/axios";

export const getFileUrlFromKey = (
  key: string,
  s3Upload = true,
  unsplashImage = false
) => {
  if (!key) return;
  if (unsplashImage)
    return key?.startsWith("https")
      ? key
      : `${process.env.EXPO_PUBLIC_UNSPLASH_URL}${key}`;

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
    console.log("File removed successfully");
    return response?.data;
  } catch (error) {
    console.log("error", error);
  }
};

export const uploadFile = async (
  file: File,
  withThumbnails = false,
  data = { allowAll: false }
): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("metadata", JSON.stringify(data));

  try {
    console.log("Uploading file...");
    const response = await axios.post(
      `/api/public/upload/${withThumbnails ? "fileWithThumb" : "file"}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    console.log("File uploaded successfully");
    return response?.data?.data?.key as string;
  } catch (error: any) {
    console.log("File upload failed:", error?.response?.data?.message);
    throw error?.response?.data?.message;
  }
};
