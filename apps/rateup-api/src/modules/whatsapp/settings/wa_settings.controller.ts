import { FastifyReply, FastifyRequest } from "fastify";
import {
  ByAdAccountIdParamsSchema,
  ByFbPageQuerySchema,
  ByLeadGenFormIdParamsSchema,
  ByWaSettingsIdParamsSchema,
  ContactTagSchema,
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
  getAllWaSettings,
  getAccessibleWaSettings,
  getContactTag,
  getFbPagesFromWa,
  getLeadgenFormQuestionsFromWa,
  getLeadgenFormsFromWa,
  getMetaAssets,
  getWaLogs,
  getWaSettings,
  getWaSettingsById,
  subscribeFieldtoPage,
  syncMetaAssetstoDb,
  updateContactTag,
  updateWaSettings,
  updateWaSettingsById,
  upsertWaSettings,
} from "./wa_settings.service.js";
import { getPhoneDetails } from "../auth/wa_auth.service.js";
import { WaConfigType } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import { callWhatsappApi } from "../wa_axios.js";

export async function createWaSettingsHandler(
  req: FastifyRequest<{ Body: createWaSettingsInput }>,
  res: FastifyReply,
) {
  const org = await getOrgIdAndRole({ id: req.userId });
  if (org.role !== Role.SUPER_ADMIN) {
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

export async function getWaSettingsHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  const { orgId, role } = req.user;
  const userId = req.user.id;
  const waSettings = await getAccessibleWaSettings(orgId, userId, role);
  if (!waSettings?.length) {
    return res.status(204).send();
  }
  return res.status(200).send(waSettings);
}

export async function updateWaSettingsHandler(
  req: FastifyRequest<{
    Body: updateWaSettingsInput & { encryption?: WaEncryptionKeys };
  }>,
  res: FastifyReply,
) {
  const org = await getOrgIdAndRole({ id: req.userId });
  if (org.role !== Role.SUPER_ADMIN) {
    return res.status(403).send({
      statusCode: 403,
      message: "You are not authorized to perform this action",
    });
  }
  const waSettings = await updateWaSettings(
    org.orgId,
    req.body?.phoneId,
    req.body,
  );
  return res.status(200).send(waSettings);
}

export async function upsertWaSettingsHandler(
  req: FastifyRequest<{ Body: updateWaSettingsInput }>,
  res: FastifyReply,
) {
  try {
    const org = await getOrgIdAndRole({ id: req.userId });
    if (org.role !== Role.SUPER_ADMIN) {
      return res.status(403).send({
        statusCode: 403,
        message: "You are not authorized to perform this action",
      });
    }
    const waSettings = await upsertWaSettings(
      org.orgId,
      req.body?.phoneId,
      req.body as any,
    );
    return res.status(200).send(waSettings);
  } catch (e) {
    log.error(e);
    res.code(500).send(e);
  }
}

export async function subscribePageToApp(pageId, pageAccessToken, fields) {
  const res = await callWhatsappApi(
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
    if (
      request.body.fbPageId?.length &&
      settings.fbPageId !== request.body.fbPageId
    ) {
      await subscribePageToApp(
        request.body.fbPageId,
        request.body.pageAccessToken,
        ["messages", "message_reads", "message_reactions"],
      );
      const igData = await callWhatsappApi(
        `/${request.body.ibaId}?fields=username&access_token=${settings?.accessToken}`,
        "GET",
      );
      request.body.igUserName = igData.data.username;
    }
    if (!request.body.fbPageId?.length && settings.fbPageId?.length) {
      request.body.fbPageId = null;
      request.body.ibaId = null;
      request.body.pageAccessToken = null;
      request.body.igUserName = null;
      request.body.igDisplayName = null;
    }
    await updateWaSettingsById(whatsappSettingsId, request.body);
    reply.code(200).send();
  } catch (e) {
    log.error(e);
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
  if (org.role !== Role.SUPER_ADMIN) {
    return res.status(403).send({
      statusCode: 403,
      message: "You are not authorized to perform this action",
    });
  }

  await deleteWaSettings(req.user.orgId, req.params.phoneId);
  return res.status(200).send();
}

export async function getContactTagHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const data = await getContactTag(orgId);
    reply.code(200).send(data ?? { contactTags: [] });
  } catch (error) {
    console.log("🚀 ~ getContactTagHandler ~ error:", error);
    log.error("Error while getting contact tags", error);
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
    log.error("Error while updating contact tags", error);
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
    log.error("Error while getting wa logs", error);
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
    if (!pages || !pages?.length)
      return reply.code(404).send("No fb pages found");
    const data = pages.map((page) => ({ ...page, subscribedFields: [] }));
    const res = await syncMetaAssetstoDb("pages", data, whatsappSettingsId);
    reply.code(200).send(data);
  } catch (error) {
    log.error("Error while getting fb pages %o", error);
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
    const { orgId } = request.user;
    const forms = await getLeadgenFormsFromWa(fbPageId, pageAccessToken);
    const data = forms.map((form) => ({ ...form, pageId: fbPageId }));
    const res = await syncMetaAssetstoDb(
      "leadgenForms",
      data,
      request.params.whatsappSettingsId,
    );
    reply.code(200).send(data);
  } catch (error) {
    log.error("Error while getting leadgen forms %o", error);
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
    const data = await getLeadgenFormQuestionsFromWa(
      fbPageId,
      formId,
      pageAccessToken,
    );
    const assets = await getMetaAssets(whatsappSettingsId);
    const newLeadgenForms = assets.leadgenForms.map((form) => {
      if (form.id === formId) {
        form["questions"] = data;
      }
      return form;
    });
    const res = await syncMetaAssetstoDb(
      "leadgenForms",
      newLeadgenForms,
      whatsappSettingsId,
    );
    reply.code(200).send(data);
  } catch (error) {
    log.error("Error while getting leadgen form questions %o", error);
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
    const res = await syncMetaAssetstoDb(
      "adAccounts",
      data,
      whatsappSettingsId,
    );
    reply.code(200).send(data);
  } catch (error) {
    log.error("Error while getting ad accounts %o", error);
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
    const res = await syncMetaAssetstoDb(
      "adAccounts",
      newAdaccounts,
      whatsappSettingsId,
    );
    reply.code(200).send(data);
  } catch (error) {
    log.error("Error while getting ads %o", error);
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
    const data = await subscribeFieldtoPage(fbPageId, pageAccessToken, fields);
    if (data.success) {
      const assets = await getMetaAssets(whatsappSettingsId);

      const newPages = [...assets.pages];
      const index = newPages.findIndex((i) => i.id === fbPageId);
      if (index !== -1) {
        newPages[index] = {
          ...newPages[index],
          subscribedFields: Array.from(
            new Set([...newPages[index].subscribedFields, ...fields]),
          ),
        };
      } else {
        return reply.code(404).send("Page not synced yet");
      }
      const res = await syncMetaAssetstoDb(
        "pages",
        newPages,
        whatsappSettingsId,
      );
    } else {
      return reply.code(400).send({ message: "Unable to subscribe" });
    }
    reply.code(200).send(data);
  } catch (error) {
    log.error("Error while subscribing fields %o", error);
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
    log.error("Error while getting meta assets %o", error);
    reply.code(500).send({ message: "Something went wrong" });
  }
}
