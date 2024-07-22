import { uploadFile as uploadFileFuncFromUtils } from "../../../../../../utils/file-upload/upload";

const uploadFile = async (prop, file) => {
  if (file) {
    try {
      const uploadedFileKey = await uploadFileFuncFromUtils(file);
      return {
        prop,
        url: `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${uploadedFileKey}`,
      };
    } catch (err) {
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
