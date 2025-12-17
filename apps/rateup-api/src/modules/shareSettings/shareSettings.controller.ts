import {
  saveShareSettings,
  getShareSettings,
} from "./shareSettings.service.js";
import { uploadFileToS3, deleteFileFromS3 } from "./utils.js";

const cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

const getSettings = async (req, res) => {
  const { resourceName, id } = req.params;
  const { shareSettings } = await getShareSettings(resourceName, id, req);
  if (shareSettings?.logoFile)
    shareSettings.logoFile = `https://${cloudFrontDomain}/${shareSettings.logoFile}`;
  return shareSettings;
};

const updateSettings = async (req, res) => {
  const { resourceName, id } = req.params;
  const settingsObj = { ...req.body };

  const logoFile = settingsObj.logoFile;

  const { shareSettings: oldShareSettings } = await getShareSettings(
    resourceName,
    id,
    req,
  );
  const oldLogoFile = oldShareSettings && oldShareSettings["logoFile"];

  if (typeof logoFile === "object" && logoFile !== "null") {
    const { fileBuffer, mimetype, fileExtension } = logoFile;
    // filename and key both are same in s3 bucket.
    const key = await uploadFileToS3(fileBuffer, mimetype, fileExtension);
    settingsObj.logoFile = `${key}`;

    // delete old file if present.
    if (oldLogoFile) {
      deleteFileFromS3([{ Key: oldLogoFile }]);
    }
  } else {
    if (oldLogoFile && logoFile !== "null") {
      settingsObj.logoFile = oldShareSettings["logoFile"];
    } else {
      settingsObj.logoFile = null;
      if (oldLogoFile) {
        deleteFileFromS3([{ Key: oldLogoFile }]);
      }
    }
  }

  const { shareSettings: updatedSettings } = await saveShareSettings(
    resourceName,
    id,
    settingsObj,
    req,
  );
  if (updatedSettings?.logoFile) {
    updatedSettings.logoFile = `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${updatedSettings.logoFile}`;
  }

  return updatedSettings;
};

export { getSettings, updateSettings };
