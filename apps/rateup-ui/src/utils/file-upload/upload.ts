import axios from "axios";
import { toast } from "sonner";

import type { RequestPayload } from "@/types/api.ts";

import { getApiErrorData, getApiErrorMessage } from "../apiError.ts";
import { fallbackImage } from "../constants.ts";

export const uploadFile = async (
  // FormData accepts a Blob just as it does a File; the theme uploader passes both.
  file: File | Blob,
  withThumbnails = false,
  data = { allowAll: false },
) => {
  const formData = new FormData();
  formData.append("metadata", JSON.stringify(data));
  formData.append("size", file?.size?.toString());
  formData.append("file", file);
  try {
    toast.loading("Uploading file...", {
      id: "upload-file",
    });
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/public/upload/${
        withThumbnails ? "fileWithThumb" : "file"
      }`,
      formData,
      {
        timeout: 0,
      },
    );
    toast.success("File uploaded successfully", {
      id: "upload-file",
    });
    return response?.data?.data?.key as string;
  } catch (error) {
    toast.dismiss("upload-file");
    throw getApiErrorMessage(error);
  }
};

export const deleteUploadedFiles = async (data: RequestPayload) => {
  try {
    toast.loading("Deleting file...", {
      id: "delete-file",
    });
    const response = await axios.put(
      `${import.meta.env.VITE_API_URL}/api/public/upload/file/delete`,
      data,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
    toast.success("File deleted successfully", {
      id: "delete-file",
    });
    return response?.data;
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Error deleting file"), {
      id: "delete-file",
    });
    return getApiErrorData(error);
  }
};
export const getFileUrlFromKey = (key: string, s3Upload = true, unsplashImage = false) => {
  if (!key) return;
  if (unsplashImage)
    return key?.startsWith("https") ? key : `${import.meta.env.VITE_UNSPLASH_URL}${key}`;

  const imgUrl = s3Upload
    ? `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${key}`
    : `${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}${key}`;
  return imgUrl;
};
const joinUrl = (base: string, path: string) =>
  `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

type AssetProvider = "s3" | "web" | "unsplash";

export const resolveAssetUrl = (key?: string, provider: AssetProvider = "s3"): string => {
  if (!key) return "";

  if (key.startsWith("http")) return key;

  const providers = {
    s3: import.meta.env.VITE_AWS_CLOUDFRONT_URL,
    web: import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL,
    unsplash: import.meta.env.VITE_UNSPLASH_URL,
  };

  return joinUrl(providers[provider], key);
};

export const getFileNameFromKey = (key: string) => {
  return key.split("-")[key.split("-").length - 1];
};

export const dataURItoBlob = (dataURI: string) => {
  const byteString = atob(dataURI.split(",")[1]);
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.codePointAt(i) ?? 0;
  }
  return new Blob([ab], { type: mimeString });
};

export const getImageValue = (
  image: File | string | null | undefined,
  fallback = false,
  unsplashImage = false,
) => {
  if (image && typeof image === "object") {
    return URL.createObjectURL(image);
  } else if (unsplashImage) {
    return image?.startsWith("http") ? image : `${import.meta.env.VITE_UNSPLASH_URL}${image}`;
  } else if (fallback || (image && image.startsWith("blob:"))) {
    return image;
  } else if (image) {
    return getFileUrlFromKey(image);
  } else {
    return fallbackImage;
  }
};

export const getLabel = (data: File | string, label: string) => {
  if (data instanceof File) return `${data?.name}`;
  else if (data && typeof data === "string" && data.length > 0) return `Update ${label}`;
  else return `Select a ${label}`;
};

/** Uploads and returns the public CloudFront URL, or `null` when the upload failed. */
export async function uploadToCdn(file: File | Blob): Promise<string | null> {
  try {
    const key = await uploadFile(file);
    return `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${key}`;
  } catch {
    return null;
  }
}
