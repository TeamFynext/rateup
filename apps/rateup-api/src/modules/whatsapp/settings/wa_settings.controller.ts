import { FastifyReply, FastifyRequest } from "fastify";
import {
  BusinessProfileInput,
  ByAdAccountIdParamsSchema,
  ByFbPageQuerySchema,
  ByLeadGenFormIdParamsSchema,
  ByWaSettingsIdParamsSchema,
  ContactTagSchema,
  ConversationalAutomationInput,
  createWaSettingsInput,
  PaginationQuery,
  updateWaSettingsInput,
  UpdateDisplayNameInput,
  whatsappSettingsIdParamSchema,
} from "./wa_settings.schema.js";
import {
  createWaSettings,
  deleteWaSettings,
  getAdAccountsFromWa,
  getAdsFromWa,
  getAccessibleWaSettings,
  getContactTag,
  getConversationalAutomation,
  syncConversationalAutomation,
  getFbPagesFromWa,
  getLeadgenFormQuestionsFromWa,
  getLeadgenFormsFromWa,
  getMetaAssets,
  getMetaDatasetsFromWa,
  buildBusinessProfileBody,
  getBusinessProfile,
  getWaSettings,
  getWaSettingsById,
  reRegisterPhoneNumber,
  subscribeFieldtoPage,
  syncDisplayName,
  updateBusinessProfile,
  updateDisplayName,
  updateProfilePicture,
  syncMetaAssetstoDb,
  updateContactTag,
  updateConversationalAutomation,
  updateWaSettings,
  updateWaSettingsById,
  upsertWaSettings,
} from "./wa_settings.service.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import { WaConfigType } from "../../../types/enums.js";
import { recordAuditEvent } from "../../../utils/auditLog.js";
import { log } from "../../../utils/logger.js";
import { callMetaApi, GraphApiError } from "../wa_axios.js";
import { getGraphApiErrorMessage } from "../wa_error_handler.js";
import { validateFile } from "../../../utils/upload/validate.js";

/**
 * These onboarding-sync payloads are already plain JSON (parsed by axios out of a Meta
 * Graph API response), but their TypeScript shapes — the `MetaGraph*` interfaces from
 * wa_settings.service.ts, and looser fields like a leadgen form's `questions` — aren't
 * structurally recognized as JSON by Prisma's `InputJsonValue`, or by the stricter
 * `MetaAsset` shape the same data gets read back as. Round-tripping through JSON
 * re-expresses the same values as a plain JSON type instead of asserting it with a cast.
 */
function asJson<T>(value: T[]): Prisma.InputJsonValue[] {
  return JSON.parse(JSON.stringify(value));
}

async function requireOwnedChannel(whatsappSettingsId: string, orgId: string, reply: FastifyReply) {
  const settings = await getWaSettingsById(whatsappSettingsId, orgId);
  if (!settings) {
    reply.code(404).send({ message: "WhatsApp settings not found" });
    return null;
  }
  return settings;
}

export async function createWaSettingsHandler(
  req: FastifyRequest<{ Body: createWaSettingsInput }>,
  res: FastifyReply,
) {
  const org = { orgId: req.user.orgId };
  const waSettings = await createWaSettings(org.orgId, {
    accessToken: req.body.accessToken,
    wabaId: req.body.wabaId,
    phoneId: req.body.phoneId,
    appId: req.body.appId,
    type: WaConfigType.Manual,
  });
  await recordAuditEvent(req, "Channel added", {
    phoneId: waSettings?.phoneId,
    phone: waSettings?.phone,
  });
  return res.status(200).send(waSettings);
}

export async function getWaSettingsHandler(req: FastifyRequest, res: FastifyReply) {
  const { orgId, userId, role } = req.user;
  const waSettings = await getAccessibleWaSettings(req.actor!);
  if (!waSettings?.length) {
    return res.status(200).send([]);
  }
  const response = waSettings?.map((data) => {
    const {
      // The flow key pair, the WhatsApp system token and the Facebook page token
      // are all redacted before the settings leave the API.
      encryption: _encryption,
      accessToken: _accessToken,
      pageAccessToken: _pageAccessToken,
      // Legacy Messenger/Instagram columns, copied to MetaChannel and no longer kept
      // current; /api/meta/channels is the source for those channels.
      fbPageId: _fbPageId,
      ibaId: _ibaId,
      fbUserName: _fbUserName,
      igUserName: _igUserName,
      igDisplayName: _igDisplayName,
      instagramIceBreakers: _instagramIceBreakers,
      instagramPersistentMenu: _instagramPersistentMenu,
      ...safe
    } = data;
    return { ...safe, encryption: undefined };
  });
  return res.status(200).send(response);
}

export async function updateWaSettingsHandler(
  req: FastifyRequest<{
    Body: updateWaSettingsInput & { encryption?: WaEncryptionKeys };
  }>,
  res: FastifyReply,
) {
  const org = { orgId: req.user.orgId };
  if (!req.body.phoneId) {
    return res.status(400).send({
      statusCode: 400,
      message: "phoneId is required",
    });
  }
  const waSettings = await updateWaSettings(org.orgId, req.body.phoneId, req.body);
  return res.status(200).send(waSettings);
}

export async function upsertWaSettingsHandler(
  req: FastifyRequest<{ Body: updateWaSettingsInput & { encryption?: WaEncryptionKeys } }>,
  res: FastifyReply,
) {
  try {
    const org = { orgId: req.user.orgId };
    if (!req.body.phoneId) {
      return res.status(400).send({
        statusCode: 400,
        message: "phoneId is required",
      });
    }
    const existing = await getWaSettings(org.orgId, req.body.phoneId);
    const waSettings = await upsertWaSettings(org.orgId, req.body.phoneId, req.body);
    await recordAuditEvent(req, existing ? "Channel updated" : "Channel added", {
      phoneId: waSettings?.phoneId,
      phone: waSettings?.phone,
    });
    return res.status(200).send(waSettings);
  } catch (e) {
    log.error({ err: e }, "Error while upserting WhatsApp settings");
    // `return` matters: without it the async handler resolves before the async onSend
    // hook has written this reply, Fastify sends a second one, and the process logs
    // ERR_HTTP_HEADERS_SENT as an unhandled rejection.
    return res.code(500).send({
      statusCode: 500,
      message: e instanceof Error ? e.message : "Something went wrong",
    });
  }
}

export async function updateWaSettingsByIdHandler(
  request: FastifyRequest<{
    Params: whatsappSettingsIdParamSchema;
    Body: updateWaSettingsInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const org = { orgId: request.user.orgId };
    const { whatsappSettingsId } = request.params;
    const settings = await getWaSettingsById(whatsappSettingsId, orgId);
    if (!settings) {
      return reply.code(404).send({ message: "WhatsApp settings not found" });
    }
    await updateWaSettingsById(whatsappSettingsId, orgId, request.body);
    reply.code(200).send();
  } catch (e) {
    log.error({ err: e }, "Error while updating WhatsApp settings by id");
    reply.code(500).send();
  }
}

export async function deleteWaSettingsHandler(
  req: FastifyRequest<{
    Params: ByWaSettingsIdParamsSchema;
  }>,
  res: FastifyReply,
) {
  const org = { orgId: req.user.orgId };

  const deleted = await deleteWaSettings(req.user.orgId, req.params.phoneId);
  await recordAuditEvent(req, "Channel removed", {
    phoneId: deleted?.phoneId,
    phone: deleted?.phone,
  });
  return res.status(200).send();
}

export async function getContactTagHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { orgId } = request.user;
    const data = await getContactTag(orgId);
    reply.code(200).send(data ?? { contactTags: [] });
  } catch (error) {
    log.error({ err: error }, "Error while getting contact tags");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function updateContactTagHandler(
  request: FastifyRequest<{
    Body: ContactTagSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    await updateContactTag(orgId, request.body);
    reply.code(204).send();
  } catch (error) {
    log.error({ err: error }, "Error while updating contact tags");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function syncFbPagesHandler(
  request: FastifyRequest<{ Params: whatsappSettingsIdParamSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { whatsappSettingsId } = request.params;
    const pages = await getFbPagesFromWa(whatsappSettingsId, orgId);
    if (!pages || !pages?.length) return reply.code(404).send("No fb pages found");
    const data = pages.map((page) => {
      const subscribedFields: string[] = [];
      return { ...page, subscribedFields };
    });
    await syncMetaAssetstoDb("pages", data, whatsappSettingsId);
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while getting fb pages");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function syncLeadgenFormsHandler(
  request: FastifyRequest<{
    Body: ByFbPageQuerySchema;
    Params: whatsappSettingsIdParamSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { whatsappSettingsId } = request.params;
    const { fbPageId } = request.body;
    const settings = await requireOwnedChannel(whatsappSettingsId, orgId, reply);
    if (!settings) return;

    // The token of the page picked from this channel's synced pages (lead ads), not a
    // Messenger connection: those live on MetaChannel.
    const { pageAccessToken } = request.body;

    const forms = await getLeadgenFormsFromWa(fbPageId, pageAccessToken);
    const data = forms.map((form) => ({ ...form, pageId: fbPageId }));
    await syncMetaAssetstoDb("leadgenForms", asJson(data), whatsappSettingsId);
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while getting leadgen forms");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function syncLeadgenFormQuestionsHandler(
  request: FastifyRequest<{
    Body: ByFbPageQuerySchema;
    Params: ByLeadGenFormIdParamsSchema;
    Querystring: whatsappSettingsIdParamSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { formId } = request.params;
    const { whatsappSettingsId } = request.query;
    const { fbPageId } = request.body;
    const settings = await requireOwnedChannel(whatsappSettingsId, orgId, reply);
    if (!settings) return;

    // The token of the page picked from this channel's synced pages (lead ads), not a
    // Messenger connection: those live on MetaChannel.
    const { pageAccessToken } = request.body;

    const data = await getLeadgenFormQuestionsFromWa(fbPageId, formId, pageAccessToken);
    const assets = await getMetaAssets(whatsappSettingsId, orgId);
    if (!assets?.leadgenForms) {
      return reply.code(409).send({ message: "Sync this channel's lead forms first" });
    }
    const newLeadgenForms = assets.leadgenForms.map((form) => {
      if (form.id === formId) {
        form["questions"] = data;
      }
      return form;
    });
    await syncMetaAssetstoDb("leadgenForms", asJson(newLeadgenForms), whatsappSettingsId);
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while getting leadgen form questions");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function syncAdAccountsHandler(
  request: FastifyRequest<{ Params: whatsappSettingsIdParamSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { whatsappSettingsId } = request.params;
    const data = await getAdAccountsFromWa(whatsappSettingsId, orgId);
    await syncMetaAssetstoDb("adAccounts", asJson(data), whatsappSettingsId);
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while getting ad accounts");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function syncAdsByAdAccountHandler(
  request: FastifyRequest<{
    Params: ByAdAccountIdParamsSchema;
    Querystring: whatsappSettingsIdParamSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { whatsappSettingsId } = request.query;
    const { adAccountId } = request.params;
    const data = await getAdsFromWa(whatsappSettingsId, adAccountId, orgId);
    const assets = await getMetaAssets(whatsappSettingsId, orgId);
    if (!assets?.adAccounts) {
      return reply.code(409).send({ message: "Sync this channel's ad accounts first" });
    }
    const newAdaccounts = assets.adAccounts.map((acc) => {
      if (acc.id === adAccountId) {
        acc["ads"] = data;
      }
      return acc;
    });
    await syncMetaAssetstoDb("adAccounts", newAdaccounts, whatsappSettingsId);
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while getting ads");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function subscribeFieldstoPageHandler(
  request: FastifyRequest<{
    Body: ByFbPageQuerySchema;
    Params: whatsappSettingsIdParamSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { fields, fbPageId } = request.body;
    const { whatsappSettingsId } = request.params;
    if (!fields || fields.length === 0) {
      return reply.code(400).send({ message: "fields is required to subscribe a page" });
    }
    const settings = await requireOwnedChannel(whatsappSettingsId, orgId, reply);
    if (!settings) return;

    // The token of the page picked from this channel's synced pages (lead ads), not a
    // Messenger connection: those live on MetaChannel.
    const { pageAccessToken } = request.body;

    const data = await subscribeFieldtoPage(fbPageId, pageAccessToken, fields);
    if (data.success) {
      const assets = await getMetaAssets(whatsappSettingsId, orgId);
      if (!assets?.pages) {
        return reply.code(409).send({ message: "Sync this channel's pages first" });
      }

      const newPages = [...assets.pages];
      const index = newPages.findIndex((i) => i.id === fbPageId);
      if (index !== -1) {
        newPages[index] = {
          ...newPages[index],
          subscribedFields: Array.from(new Set([...newPages[index].subscribedFields, ...fields])),
        };
      } else {
        return reply.code(404).send("Page not synced yet");
      }
      await syncMetaAssetstoDb("pages", newPages, whatsappSettingsId);
    } else {
      return reply.code(400).send({ message: "Unable to subscribe" });
    }
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while subscribing fields");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function getMetaAssetsHandler(
  request: FastifyRequest<{ Params: whatsappSettingsIdParamSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { whatsappSettingsId } = request.params;
    const data = await getMetaAssets(whatsappSettingsId, orgId);
    if (!data) {
      return reply.code(404).send({ message: "WhatsApp settings not found" });
    }
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while getting meta assets");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function getWaSettingsForOrgHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { orgId } = request.user;
    const data = await getWaSettings(orgId);
    const accessToken = data?.accessToken;
    const businessId = data?.wabaId;
    let verificationStatus = null;

    if (accessToken && businessId) {
      const res = await callMetaApi(
        `/${businessId}`,
        "GET",
        accessToken,
        undefined,
        {},
        {},
        {
          fields: "business_verification_status",
        },
      );

      verificationStatus = res.data?.business_verification_status;
    }

    reply.code(200).send({
      verificationStatus,
    });
  } catch (error) {
    log.error({ err: error }, "Error while getting meta assets for org");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function getConversationalAutomationHandler(
  request: FastifyRequest<{ Params: ByWaSettingsIdParamsSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { phoneId } = request.params;
    const data = await getConversationalAutomation(orgId, phoneId);
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while getting conversational automation");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function updateConversationalAutomationHandler(
  request: FastifyRequest<{
    Params: ByWaSettingsIdParamsSchema;
    Body: ConversationalAutomationInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { phoneId } = request.params;
    const data = await updateConversationalAutomation(orgId, phoneId, request.body);
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while updating conversational automation");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function syncConversationalAutomationHandler(
  request: FastifyRequest<{ Params: ByWaSettingsIdParamsSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { phoneId } = request.params;
    const data = await syncConversationalAutomation(orgId, phoneId);
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while syncing conversational automation");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function syncDisplayNameHandler(
  request: FastifyRequest<{ Params: ByWaSettingsIdParamsSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { phoneId } = request.params;
    const data = await syncDisplayName(orgId, phoneId);
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while syncing display name");
    replyWithMetaError(reply, error, "Error while syncing display name");
  }
}

export async function updateDisplayNameHandler(
  request: FastifyRequest<{
    Params: ByWaSettingsIdParamsSchema;
    Body: UpdateDisplayNameInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { phoneId } = request.params;
    const data = await updateDisplayName(orgId, phoneId, request.body.newDisplayName);
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while updating display name");
    replyWithMetaError(reply, error, "Error while updating display name");
  }
}

export async function reRegisterPhoneNumberHandler(
  request: FastifyRequest<{ Params: ByWaSettingsIdParamsSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { phoneId } = request.params;
    const data = await reRegisterPhoneNumber(orgId, phoneId);
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while re-registering phone number");
    replyWithMetaError(reply, error, "Error while re-registering phone number");
  }
}

export async function getBusinessProfileHandler(
  request: FastifyRequest<{ Params: ByWaSettingsIdParamsSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { phoneId } = request.params;
    const data = await getBusinessProfile(orgId, phoneId);
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while getting the business profile");
    replyWithMetaError(reply, error, "Error while getting the business profile");
  }
}

export async function updateBusinessProfileHandler(
  request: FastifyRequest<{
    Params: ByWaSettingsIdParamsSchema;
    Body: BusinessProfileInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { phoneId } = request.params;
    // Meta has no way to clear a profile field, so an all-blank request would either be a
    // no-op or a bare "(#131000) Something went wrong" — this says which it is.
    if (!Object.keys(buildBusinessProfileBody(request.body)).length) {
      return reply.code(400).send({
        message: "Nothing to update — WhatsApp does not accept an empty profile field",
      });
    }
    const data = await updateBusinessProfile(orgId, phoneId, request.body);
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while updating the business profile");
    replyWithMetaError(reply, error, "Error while updating the business profile");
  }
}

export async function updateProfilePictureHandler(
  request: FastifyRequest<{ Params: ByWaSettingsIdParamsSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { phoneId } = request.params;
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ message: "No file uploaded" });
    }

    const validation = validateFile({ data: file });
    if (!validation.valid) {
      file.file.resume();
      return reply.code(400).send({ message: validation.message });
    }
    // WhatsApp only takes a JPEG or PNG for a profile photo, so the wider media allow-list
    // that validateFile works from is narrowed here.
    if (!PROFILE_PICTURE_MIME_TYPES.has(file.mimetype)) {
      file.file.resume();
      return reply.code(400).send({ message: "Profile photo must be a JPEG or PNG image" });
    }

    const buffer = await file.toBuffer();
    const data = await updateProfilePicture(orgId, phoneId, {
      buffer,
      mimetype: file.mimetype,
      filename: file.filename,
    });
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while updating the profile photo");
    replyWithMetaError(reply, error, "Error while updating the profile photo");
  }
}

const PROFILE_PICTURE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

/**
 * Meta's display name errors are the ones a user can act on — the guideline violation, the
 * "10 changes per 30 days" cap — so they are passed through instead of being flattened
 * into a generic 500.
 */
function replyWithMetaError(reply: FastifyReply, error: unknown, fallback: string) {
  if (error instanceof GraphApiError) {
    reply.code(400).send({ message: getGraphApiErrorMessage(error) });
    return;
  }
  reply.code(500).send({ message: fallback });
}

export async function getMetaDatasetsHandler(
  request: FastifyRequest<{ Params: whatsappSettingsIdParamSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { whatsappSettingsId } = request.params;
    const data = await getMetaDatasetsFromWa(whatsappSettingsId, orgId);
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while getting meta datasets");
    reply.code(500).send({ message: "Something went wrong" });
  }
}
