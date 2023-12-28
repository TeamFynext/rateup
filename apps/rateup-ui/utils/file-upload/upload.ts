import axios from "axios";

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/public/upload/file`,
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

export const dataURItoBlob = (dataURI) => {
  const byteString = atob(dataURI.split(",")[1]);
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};
