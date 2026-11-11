import { joinUrl } from "@rateup/utils/url";
import { toast } from "sonner";

import { axiosClient } from "@/backend/apiClient";
import type { RequestPayload } from "@/types/api.ts";
import { mediaUrl, unsplashImageUrl, webImageUrl } from "@/utils/cdn";

import { getApiErrorData, getApiErrorMessage } from "../apiError.ts";
import { fallbackImage } from "../constants.ts";

export interface UploadOptions {
  /** Lets any file type through, not just media (the survey "file" question). */
  allowAll?: boolean;
  /**
   * The form link an anonymous survey respondent is answering. Without a session the API
   * keys the upload under that form's org, and refuses an upload that names no live form.
   */
  surveyTeamMapId?: string;
}

/**
 * The multipart body for an upload. The API reads only the fields that precede the file
 * part, so every field (`surveyTeamMapId` above all) is appended before `file`.
 */
export const buildUploadFormData = (file: File | Blob, options: UploadOptions = {}) => {
  const formData = new FormData();
  formData.append("metadata", JSON.stringify({ allowAll: options.allowAll ?? false }));
  formData.append("size", file.size.toString());
  if (options.surveyTeamMapId) formData.append("surveyTeamMapId", options.surveyTeamMapId);
  formData.append("file", file);
  return formData;
};

export const uploadFile = async (
  // FormData accepts a Blob just as it does a File; the theme uploader passes both.
  file: File | Blob,
  withThumbnails = false,
  options: UploadOptions = {},
) => {
  const formData = buildUploadFormData(file, options);
  try {
    toast.loading("Uploading file...", {
      id: "upload-file",
    });
    // The app client, so a signed-in caller's upload carries the session and is keyed
    // under their org; uploads can take far longer than its default timeout.
    const response = await axiosClient.post(
      `/public/upload/${withThumbnails ? "fileWithThumb" : "file"}`,
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

/** Needs a session: the API deletes only keys under the caller's own org. */
export const deleteUploadedFiles = async (data: RequestPayload) => {
  try {
    toast.loading("Deleting file...", {
      id: "delete-file",
    });
    const response = await axiosClient.put("/public/upload/file/delete", data);
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
  if (unsplashImage) return key?.startsWith("https") ? key : unsplashImageUrl(key);

  const imgUrl = s3Upload ? mediaUrl(key) : webImageUrl(key);
  return imgUrl;
};

type AssetProvider = "s3" | "web" | "unsplash";

export const resolveAssetUrl = (key?: string, provider: AssetProvider = "s3"): string => {
  if (!key) return "";

  if (key.startsWith("http")) return key;

  const providers = {
    s3: import.meta.env.VITE_MEDIA_CDN_URL,
    web: import.meta.env.VITE_WEB_IMAGES_CDN_URL,
    unsplash: import.meta.env.VITE_UNSPLASH_IMAGES_URL,
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
    return image?.startsWith("http") ? image : unsplashImageUrl(image);
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
    return mediaUrl(key);
  } catch {
    return null;
  }
}
