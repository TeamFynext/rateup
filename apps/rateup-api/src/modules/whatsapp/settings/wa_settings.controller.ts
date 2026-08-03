import { FastifyReply, FastifyRequest } from "fastify";
import {
  ByAdAccountIdParamsSchema,
  ByFbPageQuerySchema,
  ByLeadGenFormIdParamsSchema,
  ByWaSettingsIdParamsSchema,
  ContactTagSchema,
  ConversationalAutomationInput,
  createWaSettingsInput,
  PaginationQuery,
  updateWaSettingsInput,
  whatsappSettingsIdParamSchema,
} from "./wa_settings.schema.js";
import { getOrgIdAndRole } from "../../user/user.service.js";
import { Role } from "../../org/org.services.js";
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
  getWaLogs,
  getWaSettings,
  getWaSettingsById,
  subscribeFieldtoPage,
  syncMetaAssetstoDb,
  updateContactTag,
  updateConversationalAutomation,
  updateWaSettings,
  updateWaSettingsById,
  upsertWaSettings,
} from "./wa_settings.service.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import { WaConfigType } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import { callMetaApi } from "../wa_axios.js";

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

export async function createWaSettingsHandler(
  req: FastifyRequest<{ Body: createWaSettingsInput }>,
  res: FastifyReply,
) {
  const org = await getOrgIdAndRole({ id: req.userId });
  if (!org || org.role !== Role.SUPER_ADMIN) {
    return res.status(403).send({
      statusCode: 403,
      message: "You are not authorized to perform this action",
    });
  }
  const waSettings = await createWaSettings(org.orgId, {
    accessToken: req.body.accessToken,
    wabaId: req.body.wabaId,
    phoneId: req.body.phoneId,
    appId: req.body.appId,
    type: WaConfigType.Manual,
  });
  return res.status(200).send(waSettings);
}

export async function getWaSettingsHandler(req: FastifyRequest, res: FastifyReply) {
  const { orgId, userId, role } = req.user;
  const waSettings = await getAccessibleWaSettings(orgId, userId!, role);
  if (!waSettings?.length) {
    return res.status(200).send([]);
  }
  const response = waSettings?.map((data) => {
    // The flow key pair is redacted before the settings leave the API.
    const encryption: undefined = undefined;
    return { ...data, encryption };
  });
  return res.status(200).send(response);
}

export async function updateWaSettingsHandler(
  req: FastifyRequest<{
    Body: updateWaSettingsInput & { encryption?: WaEncryptionKeys };
  }>,
  res: FastifyReply,
) {
  const org = await getOrgIdAndRole({ id: req.userId });
  if (!org || org.role !== Role.SUPER_ADMIN) {
    return res.status(403).send({
      statusCode: 403,
      message: "You are not authorized to perform this action",
    });
  }
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
    const org = await getOrgIdAndRole({ id: req.userId });
    if (!org || org.role !== Role.SUPER_ADMIN) {
      return res.status(403).send({
        statusCode: 403,
        message: "You are not authorized to perform this action",
      });
    }
    if (!req.body.phoneId) {
      return res.status(400).send({
        statusCode: 400,
        message: "phoneId is required",
      });
    }
    const waSettings = await upsertWaSettings(org.orgId, req.body.phoneId, req.body);
    return res.status(200).send(waSettings);
  } catch (e) {
    log.error({ err: e }, "Error while upserting WhatsApp settings");
    res.code(500).send(e);
  }
}

export async function subscribePageToApp(
  pageId: string,
  pageAccessToken: string,
  fields: string[],
) {
  await callMetaApi(
    `/${pageId}/subscribed_apps?subscribed_fields=${fields.join(",")}&access_token=${pageAccessToken}`,
    "POST",
  );
}

export async function updateWaSettingsByIdHandler(
  request: FastifyRequest<{
    Params: whatsappSettingsIdParamSchema;
    Body: updateWaSettingsInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { whatsappSettingsId } = request.params;
    const settings = await getWaSettingsById(whatsappSettingsId);
    // Same shape as the null check everywhere else — this just gives the "channel
    // doesn't exist" case a message instead of a bare property-access crash, both of
    // which land on the catch block below and answer 500 either way.
    if (!settings) {
      throw new Error("WhatsApp settings not found");
    }
    if (request.body.fbPageId?.length && settings.fbPageId !== request.body.fbPageId) {
      if (!request.body.pageAccessToken) {
        throw new Error("pageAccessToken is required to connect a Facebook page");
      }
      await subscribePageToApp(request.body.fbPageId, request.body.pageAccessToken, [
        "messages",
        "message_reads",
        "message_reactions",
      ]);
      const igData = await callMetaApi(
        `/${request.body.ibaId}?fields=username&access_token=${settings.accessToken}`,
        "GET",
      );
      request.body.igUserName = igData.data.username;
      const fbData = await callMetaApi(
        `/${request.body.fbPageId}?fields=name&access_token=${settings.accessToken}`,
        "GET",
      );
      request.body.fbUserName = fbData.data.name;
    }
    if (!request.body.fbPageId?.length && settings.fbPageId?.length) {
      request.body.fbPageId = null;
      request.body.ibaId = null;
      request.body.pageAccessToken = null;
      request.body.igUserName = null;
      request.body.igDisplayName = null;
      request.body.fbUserName = null;
    }
    await updateWaSettingsById(whatsappSettingsId, request.body);
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
  const org = await getOrgIdAndRole({ id: req.userId });
  if (!org || org.role !== Role.SUPER_ADMIN) {
    return res.status(403).send({
      statusCode: 403,
      message: "You are not authorized to perform this action",
    });
  }

  await deleteWaSettings(req.user.orgId, req.params.phoneId);
  return res.status(200).send();
}

export async function getContactTagHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { orgId } = request.user;
    const data = await getContactTag(orgId);
    reply.code(200).send(data ?? { contactTags: [] });
  } catch (error) {
    console.log("🚀 ~ getContactTagHandler ~ error:", error);
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

export async function getWaLogsHandler(
  request: FastifyRequest<{
    Querystring: PaginationQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const data = await getWaLogs(orgId, request.query);
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while getting wa logs");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function syncFbPagesHandler(
  request: FastifyRequest<{ Params: whatsappSettingsIdParamSchema }>,
  reply: FastifyReply,
) {
  try {
    const { whatsappSettingsId } = request.params;
    const pages = await getFbPagesFromWa(whatsappSettingsId);
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
    const { fbPageId, pageAccessToken } = request.body;

    const forms = await getLeadgenFormsFromWa(fbPageId, pageAccessToken);
    const data = forms.map((form) => ({ ...form, pageId: fbPageId }));
    await syncMetaAssetstoDb("leadgenForms", asJson(data), request.params.whatsappSettingsId);
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
    const { formId } = request.params;
    const { whatsappSettingsId } = request.query;
    const { fbPageId, pageAccessToken } = request.body;
    const data = await getLeadgenFormQuestionsFromWa(fbPageId, formId, pageAccessToken);
    const assets = await getMetaAssets(whatsappSettingsId);
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
    const { whatsappSettingsId } = request.params;
    const data = await getAdAccountsFromWa(whatsappSettingsId);
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
    const { whatsappSettingsId } = request.query;
    const { adAccountId } = request.params;
    const data = await getAdsFromWa(whatsappSettingsId, adAccountId);
    const assets = await getMetaAssets(whatsappSettingsId);
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
    const { fields, fbPageId, pageAccessToken } = request.body;
    const { whatsappSettingsId } = request.params;
    if (!fields || fields.length === 0) {
      throw new Error("fields is required to subscribe a page");
    }
    const data = await subscribeFieldtoPage(fbPageId, pageAccessToken, fields);
    if (data.success) {
      const assets = await getMetaAssets(whatsappSettingsId);

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
    const { whatsappSettingsId } = request.params;
    const data = await getMetaAssets(whatsappSettingsId);
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

export async function getMetaDatasetsHandler(
  request: FastifyRequest<{ Params: whatsappSettingsIdParamSchema }>,
  reply: FastifyReply,
) {
  try {
    const { whatsappSettingsId } = request.params;
    const data = await getMetaDatasetsFromWa(whatsappSettingsId);
    reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error while getting meta datasets");
    reply.code(500).send({ message: "Something went wrong" });
  }
}
