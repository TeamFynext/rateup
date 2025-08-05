import axios from "axios";

import { fallbackImage } from "../constants";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "../notifications";

export const uploadFile = async (
  file,
  withThumbnails = false,
  data = { allowAll: false },
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("metadata", JSON.stringify(data));
  try {
    showLoadingToast(
      "Uploading file...",
      "upload-file",
      true,
      undefined,
      undefined,
      false,
    );
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
    showSuccessToast("File uploaded successfully", "upload-file", null, true);
    return response?.data?.data?.key as string;
  } catch (error) {
    throw error?.response?.data?.message;
  }
};

export const deleteUploadedFiles = async (data) => {
  try {
    showLoadingToast("Deleting file...", "delete-file");
    const response = await axios.put(
      `${process.env.NEXT_PUBLIC_API_URL}/api/public/upload/file/delete`,
      data,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
    showSuccessToast("File deleted successfully", "delete-file", null, true);
    return response?.data;
  } catch (error) {
    showErrorToast(
      error?.response?.data?.message || "Error deleting file",
      "delete-file",
      null,
      true,
    );
    return error?.data;
  }
};
export const getFileUrlFromKey = (
  key: string,
  s3Upload = true,
  unsplashImage = false,
) => {
  if (!key) return;
  if (unsplashImage)
    return key?.startsWith("https")
      ? key
      : `${process.env.NEXT_PUBLIC_UNSPLASH_URL}${key}`;

  const imgUrl = s3Upload
    ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${key}`
    : `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}${key}`;
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

export const getImageValue = (
  image,
  fallback = false,
  unsplashImage = false,
) => {
  if (typeof image === "object") {
    return URL.createObjectURL(image);
  } else if (unsplashImage) {
    return image?.startsWith("http")
      ? image
      : `${process.env.NEXT_PUBLIC_UNSPLASH_URL}${image}`;
  } else if (fallback || (image && image.startsWith("blob:"))) {
    return image;
  } else if (image) {
    return getFileUrlFromKey(image);
  } else {
    return fallbackImage;
  }
};

export const getFileNameFromFile = (data: File | string, label: string) => {
  if (data instanceof File) return data.name;
  else if (data?.length > 0) return data;
  else return label;
};
export const getLabel = (data: File | string, label: string) => {
  if (data) return `Update ${label}`;
  else return `Select a ${label}`;
};
