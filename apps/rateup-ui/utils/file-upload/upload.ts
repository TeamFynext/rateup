import axios from "axios";

export const uploadFile = async (file, withThumbnails = false) => {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/public/upload/${
        withThumbnails ? "fileWithThumb" : "file"
      }`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response?.data?.data?.key as string;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const deleteUploadedFiles = async (data) => {
  try {
    const response = await axios.put(
      `${process.env.NEXT_PUBLIC_API_URL}/api/public/upload/file/delete`,
      data,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
    return response?.data;
  } catch (error) {
    return error?.data;
  }
};
export const getFileUrlFromKey = (key: string) => {
  const imgUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${key}`;
  return imgUrl;
};

export const getFileNameFromKey = (key: string) => {
  return key.split("-")[key.split("-").length - 1];
};
