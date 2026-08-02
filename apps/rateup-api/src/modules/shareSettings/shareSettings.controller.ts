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

/**
 * A logo sent as a file arrives as the object onFile attached to the part.
 *
 * The original condition was `typeof logoFile === "object" && logoFile !== "null"`
 * — the second clause compares an object against a four-character string, so it
 * was always true and added nothing, while `typeof null === "object"` meant a
 * JSON null would have taken the upload path and destructured null. Only the
 * body schema rejecting null kept that unreachable. See issues.txt 35.6.
 */
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
    // filename and key both are same in s3 bucket.
    // uploadFileToS3 throws when the upload returns no key, rather than yielding
    // null for the template literal below to stringify to "null".
    // See issues.txt 35.2.
    settingsObj.logoFile = await uploadFileToS3(fileBuffer!, mimetype!, fileExtension!);

    // delete old file if present. Awaited: the promise used to float, so a
    // rejection inside deleteFileFromS3 would surface as an unhandled rejection
    // rather than a logged failure. It still cannot fail the save — the helper
    // catches and logs. See issues.txt 35.4.
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
