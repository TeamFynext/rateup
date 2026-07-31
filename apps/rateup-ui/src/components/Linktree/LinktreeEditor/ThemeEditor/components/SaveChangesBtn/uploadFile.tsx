import { uploadFile as uploadFileFuncFromUtils } from "@/utils/file-upload/upload.ts";

const uploadFile = async (prop: string, file: File) => {
  if (file) {
    try {
      const uploadedFileKey = await uploadFileFuncFromUtils(file);
      return {
        prop,
        url: `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${uploadedFileKey}`,
      };
    } catch {
      return {
        prop,
        url: null,
      };
    }
  } else {
    return {
      prop,
      url: null,
    };
  }
};

export { uploadFile };
