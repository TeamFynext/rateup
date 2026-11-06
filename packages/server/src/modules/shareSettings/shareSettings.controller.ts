import type { FastifyReply, FastifyRequest } from "fastify";
import { saveShareSettings, getShareSettings } from "./shareSettings.service.js";
import {
  uploadFileToS3,
  deleteFileFromS3,
  toStoredShareSettings,
  type StoredShareSettings,
  type UploadedFilePart,
} from "./utils.js";
import type { bodySchema, paramsSchema } from "./shareSettings.schema.js";
import type z from "zod";

const cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

type ShareSettingsRequest = FastifyRequest<{
  Params: z.infer<typeof paramsSchema>;
  Body: z.infer<typeof bodySchema>;
}>;

const isFilePart = (value: unknown): value is Partial<UploadedFilePart> =>
  typeof value === "object" && value !== null;

const getSettings = async (req: ShareSettingsRequest, _res: FastifyReply) => {
  const { resourceName, id } = req.params;
  const { shareSettings: storedSettings } = (await getShareSettings(resourceName, id, req))!;
  const shareSettings = toStoredShareSettings(storedSettings);
  if (shareSettings?.logoFile)
    shareSettings.logoFile = `https://${cloudFrontDomain}/${shareSettings.logoFile}`;
  return shareSettings;
};

const updateSettings = async (req: ShareSettingsRequest, _res: FastifyReply) => {
  const { resourceName, id } = req.params;
  // logoFile is replaced below on every path — it holds either the multipart
  // file part or an existing key at this point, never the value that is stored.
  const settingsObj: StoredShareSettings = { ...req.body, logoFile: null };

  const logoFile = req.body.logoFile;

  const { shareSettings: oldStoredSettings } = (await getShareSettings(resourceName, id, req))!;
  const oldShareSettings = toStoredShareSettings(oldStoredSettings);
  const oldLogoFile = oldShareSettings && oldShareSettings["logoFile"];

  if (isFilePart(logoFile)) {
    const { fileBuffer, mimetype, fileExtension } = logoFile;
    settingsObj.logoFile = await uploadFileToS3(fileBuffer!, mimetype!, fileExtension!);

    if (oldLogoFile) {
      await deleteFileFromS3([{ Key: oldLogoFile }]);
    }
  } else {
    if (oldLogoFile && logoFile !== "null") {
      settingsObj.logoFile = oldShareSettings["logoFile"];
    } else {
      settingsObj.logoFile = null;
      if (oldLogoFile) {
        await deleteFileFromS3([{ Key: oldLogoFile }]);
      }
    }
  }

  const { shareSettings: updatedStoredSettings } = (await saveShareSettings(
    resourceName,
    id,
    settingsObj,
    req,
  ))!;
  const updatedSettings = toStoredShareSettings(updatedStoredSettings);
  if (updatedSettings?.logoFile) {
    updatedSettings.logoFile = `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${updatedSettings.logoFile}`;
  }

  return updatedSettings;
};

export { getSettings, updateSettings };
