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
} from "./wa_settings.schema";
import { getOrgIdAndRole } from "../../user/user.service";
import { Role } from "../../org/org.services";
import {
  createWaSettings,
  deleteWaSettings,
  getAdAccountsFromWa,
  getAdsFromWa,
  getAllWaSettings,
  getContactTag,
  getFbPagesFromWa,
  getLeadgenFormQuestionsFromWa,
  getLeadgenFormsFromWa,
  getMetaAssets,
  getWaLogs,
  getWaSettings,
  subscribeFieldtoPage,
  syncMetaAssetstoDb,
  updateContactTag,
  updateWaSettings,
  upsertWaSettings,
} from "./wa_settings.service";
import { getPhoneDetails } from "../auth/wa_auth.service";
import { WaConfigType } from "../../../types/enums";
import { log } from "../../../utils/logger";

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
  const { orgId } = req.user;
  const waSettings = await getAllWaSettings(orgId);
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
  const waSettings = await upsertWaSettings(
    org.orgId,
    req.body?.phoneId,
    req.body,
  );
  return res.status(200).send(waSettings);
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
    await updateContactTag(orgId, request.body.tags);
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
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const pages = await getFbPagesFromWa(orgId);
    const data = pages.map((page) => ({ ...page, subscribedFields: [] }));
    const res = await syncMetaAssetstoDb("pages", data, orgId);
    reply.code(200).send(data);
  } catch (error) {
    log.error("Error while getting fb pages %o", error);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function syncLeadgenFormsHandler(
  request: FastifyRequest<{ Body: ByFbPageQuerySchema }>,
  reply: FastifyReply,
) {
  try {
    const { fbPageId, pageAccessToken } = request.body;
    const { orgId } = request.user;
    const forms = await getLeadgenFormsFromWa(fbPageId, pageAccessToken);
    const data = forms.map((form) => ({ ...form, pageId: fbPageId }));
    const res = await syncMetaAssetstoDb("leadgenForms", data, orgId);
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
  }>,
  reply: FastifyReply,
) {
  try {
    const { formId } = request.params;
    const { orgId } = request.user;
    const { fbPageId, pageAccessToken } = request.body;
    const data = await getLeadgenFormQuestionsFromWa(
      fbPageId,
      formId,
      pageAccessToken,
    );
    const assets = await getMetaAssets(orgId);
    const newLeadgenForms = assets.leadgenForms.map((form) => {
      if (form.id === formId) {
        form["questions"] = data;
      }
      return form;
    });
    const res = await syncMetaAssetstoDb(
      "leadgenForms",
      newLeadgenForms,
      orgId,
    );
    reply.code(200).send(data);
  } catch (error) {
    log.error("Error while getting leadgen form questions %o", error);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function syncAdAccountsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const data = await getAdAccountsFromWa(orgId);
    const res = await syncMetaAssetstoDb("adAccounts", data, orgId);
    reply.code(200).send(data);
  } catch (error) {
    log.error("Error while getting ad accounts %o", error);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function syncAdsByAdAccountHandler(
  request: FastifyRequest<{ Params: ByAdAccountIdParamsSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { adAccountId } = request.params;
    const data = await getAdsFromWa(orgId, adAccountId);
    const assets = await getMetaAssets(orgId);
    const newAdaccounts = assets.adAccounts.map((acc) => {
      if (acc.id === adAccountId) {
        acc["ads"] = data;
      }
      return acc;
    });
    const res = await syncMetaAssetstoDb("adAccounts", newAdaccounts, orgId);
    reply.code(200).send(data);
  } catch (error) {
    log.error("Error while getting ads %o", error);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function subscribeFieldstoPageHandler(
  request: FastifyRequest<{ Body: ByFbPageQuerySchema }>,
  reply: FastifyReply,
) {
  try {
    const { fields, fbPageId, pageAccessToken } = request.body;
    const { orgId } = request.user;
    const data = await subscribeFieldtoPage(fbPageId, pageAccessToken, fields);
    if (data.success) {
      const assets = await getMetaAssets(orgId);

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
      const res = await syncMetaAssetstoDb("pages", newPages, orgId);
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
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const data = await getMetaAssets(orgId);
    reply.code(200).send(data);
  } catch (error) {
    log.error("Error while getting meta assets %o", error);
    reply.code(500).send({ message: "Something went wrong" });
  }
}
