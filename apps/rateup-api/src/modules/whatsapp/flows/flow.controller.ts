import { FastifyReply, FastifyRequest } from "fastify";
import {
  cloneFlow,
  cloneFlowInWa,
  createFlowCopyInDb,
  createFlowInWa,
  deleteFlowInDb,
  deleteFlowInWa,
  deprecateFlowInWa,
  getFlowFromDb,
  getFlowFromWa,
  getFlowJsonFromWa,
  getFlowPreview,
  getFlowsFromDb,
  getFlowsFromWa,
  getFlowWithSurveyTeamMapIds,
  getUnsyncedFlows,
  publishFlowInWa,
  sendFlow,
  syncLocalFlowToWhatsapp,
  updateFlowIdAndStatusInDb,
  updateFlowInDb,
  updateFlowMetaDataInWa,
} from "./flow.service.js";
import {
  ByDbFlowIdParams,
  ByWaFlowIdParams,
  CloneFlowBody,
  CreateFlowInput,
  ImportFlowsBody,
  SendFlowBody,
  UpdateFlowInput,
  UpdateFlowMetaInput,
  WaFlowSourceQuery,
} from "./flow.schema.js";
import { createSurveyFromFlow } from "./flow.utils.js";
import { log } from "../../../utils/logger.js";
import {
  QuestionType,
  SubscriptionFeaturePathName,
  SurveyType,
  WaFlowStatus,
} from "../../../types/enums.js";
import { createSurvey, deleteSurveyById } from "../../survey/survey.service.js";
import { Survey } from "../../../../generated/prisma/client.js";
import { GraphApiError, callMetaApi } from "../wa_axios.js";
import { getWaSettings } from "../settings/wa_settings.service.js";
import { getGraphApiErrorMessage } from "../wa_error_handler.js";
import { updateMonthlyStat } from "../../stats/stats.service.js";
import { createSession, deleteSession, getSession } from "../whatsappSurvey/wasurvey.service.js";
import { validateSession } from "../whatsappSurvey/wasurvey.utils.js";

/**
 * Get flows from whatsapp api or our database.
 * @param req
 * @param res
 */
export async function getFlowsHandler(
  req: FastifyRequest<{
    Querystring: WaFlowSourceQuery;
  }>,
  res: FastifyReply,
) {
  const { orgId, userId } = req.user;
  if (req.query.source === "wa") {
    const flows = await getFlowsFromWa(orgId);
    res.send(flows);
  } else if (req.query.source === "db") {
    const flows = await getFlowsFromDb(orgId, userId);
    res.send(flows);
  }
}

export async function getFlowHandler(
  req: FastifyRequest<{
    Params: ByWaFlowIdParams;
  }>,
  res: FastifyReply,
) {
  const { waFlowId } = req.params;

  const flow = await getFlowFromDb(waFlowId);

  res.send(flow);
}

export async function getFlowMetricsHandler(
  req: FastifyRequest<{
    Params: ByWaFlowIdParams;
  }>,
  res: FastifyReply,
) {
  try {
    const { waFlowId } = req.params;
    const { orgId } = req.user;
    const { accessToken } = await getWaSettings(orgId);
    const response = await callMetaApi(
      `/${waFlowId}?fields=metric.name(ENDPOINT_REQUEST_COUNT).granularity(LIFETIME)`,
      "GET",
      accessToken,
    );
    res.send(response?.data);
  } catch (error) {
    log.error("error while getting flow metrics");
    return res.status(500).send(error?.response);
  }
}
export async function getUnsyncedFlowsHandler(req: FastifyRequest, _res: FastifyReply) {
  return await getUnsyncedFlows(req.user.orgId, req.userId);
}

export async function getFlowJsonHandler(
  req: FastifyRequest<{
    Params: ByWaFlowIdParams;
  }>,
  res: FastifyReply,
) {
  const { orgId } = req.user;
  const { waFlowId } = req.params;

  const json = await getFlowJsonFromWa(orgId, waFlowId);

  res.send(json);
}

export async function importFlowsHandler(
  req: FastifyRequest<{
    Body: ImportFlowsBody;
  }>,
  _res: FastifyReply,
) {
  const { orgId } = req.user;
  const { waFlowIds, mapData } = req.body;
  // TODO: convert to prisma transaction
  log.trace("Importing flows: %o", waFlowIds);
  for (const waFlowId of waFlowIds) {
    log.trace("fetching flow from wa %s", waFlowId);
    const waFlow = await getFlowFromWa(orgId, waFlowId);
    log.trace("fetching flow json %s", waFlowId);
    const json = await getFlowJsonFromWa(orgId, waFlowId); // TODO: cache?
    log.trace("creating survey from flow %s", waFlowId);
    const { survey, flowMap: flowMapWithQuestionId } = await createSurveyFromFlow({
      orgId: orgId,
      flowJson: json,
      flowMap: mapData[waFlowId],
      req: req,
      teamIds: req.body.teamIds,
      title: waFlow.name,
    });

    log.trace("creating flow copy in db %s", waFlowId);
    await createFlowCopyInDb({
      orgId,
      flowId: waFlowId,
      name: waFlow.name,
      status: waFlow.status,
      surveyId: survey.id,
      json,
      flowMap: flowMapWithQuestionId,
    });
  }
  log.trace("Imported flows successfully!");
}

export async function createFlowHandler(
  req: FastifyRequest<{
    Body: CreateFlowInput;
  }>,
  res: FastifyReply,
) {
  try {
    const { orgId } = req.user;
    const { name, categories, teamIds } = req.body;
    log.trace("creating flow in wa %s", name);
    const { id: flowId } = await createFlowInWa(orgId, { name, categories });
    log.trace("creating survey from flow %s", name);
    const survey = (await createSurvey(
      {
        title: name,
        teamIds,
        type: SurveyType.WaFlow,
        languages: ["en"],
        orgId,
        active: true,
        getLocation: false,
        welcomePageEnabled: false,
      },
      req,
    )) as Survey;
    log.trace("creating flow copy in db %s", name);
    const dbFlow = await createFlowCopyInDb({
      orgId,
      flowId,
      json:
        req.body.json ??
        ({
          version: "7.2",
          screens: [],
        } as WaFlowJson),
      flowMap: req.body.map ?? {},
      surveyId: survey.id,
      status: WaFlowStatus.DRAFT,
      name: name,
    });
    return res.status(200).send(dbFlow?.dbFlowId);
  } catch (error) {
    let message = "Creating flow Error";
    if (error instanceof GraphApiError) {
      message = getGraphApiErrorMessage(error);
    }
    return res.status(400).send(message);
  }
}

export async function updateFlowHandler(
  req: FastifyRequest<{
    Params: ByDbFlowIdParams;
    Body: UpdateFlowInput;
  }>,
  res: FastifyReply,
) {
  const { orgId } = req.user;
  const { dbFlowId } = req.params;

  log.trace("updating flow %o", req.body);
  const previousFlow = await getFlowFromDb(dbFlowId);
  const updatedFlow = await updateFlowInDb(orgId, dbFlowId, {
    ...req.body,
    pendingSave: true,
  });
  const updatedWaAppIntegration = updatedFlow?.survey?.questions?.some(
    (qs: any) => qs.type === QuestionType.Date && qs?.onSelectAction && qs?.waAppName,
  );

  // add data_channel_uri if logic jumps are updated
  if (
    (Object.keys(previousFlow.logicJumps).length === 0 &&
      Object.keys(updatedFlow.logicJumps).length > 0) ||
    updatedWaAppIntegration
  ) {
    log.trace("updating data_channel_uri in wa %s", updatedFlow.flowId);

    const domain = process.env.API_URL;
    const server_url = domain.startsWith("https") ? domain : `https://${domain}`;
    const endpoint_uri = `${server_url}/api/wa/endpoint/${orgId}/${updatedFlow.dbFlowId}`;

    await updateFlowMetaDataInWa(orgId, updatedFlow.flowId, {
      endpoint_uri,
    });
    log.trace("uri set to %s", endpoint_uri);
  }
  res.status(201).send();
}

export async function saveFlowJsonToWhatsappHandler(
  req: FastifyRequest<{
    Params: ByDbFlowIdParams;
  }>,
  res: FastifyReply,
) {
  try {
    const { orgId } = req.user;
    const { dbFlowId } = req.params;
    await syncLocalFlowToWhatsapp(orgId, dbFlowId);

    res.status(200).send();
  } catch (error) {
    log.error({ err: error }, "Error saving flow json to whatsapp");
    res.status(500).send(error.message);
  }
}

export async function updateFlowMetaDataHandler(
  req: FastifyRequest<{
    Params: ByDbFlowIdParams;
    Body: UpdateFlowMetaInput;
  }>,
  res: FastifyReply,
) {
  try {
    const { orgId } = req.user;
    const { dbFlowId } = req.params;
    const previousFlow = await getFlowFromDb(dbFlowId);
    await updateFlowInDb(orgId, dbFlowId, req.body);
    const { accessToken } = await getWaSettings(orgId);
    const { data } = await callMetaApi(`/${previousFlow?.flowId}`, "POST", accessToken, req.body);
    if (!data?.success) {
      log.error({ err: data }, "Flow Not updated in whatsapp");
      throw new Error("Flow Not updated in whatsapp");
    }
    res.status(204).send();
  } catch (error) {
    log.error({ err: error }, "Error Updating flow meta data");
    res.status(500).send(error);
  }
}
export async function cloneAndDeprecateFlowHandler(
  req: FastifyRequest<{
    Params: ByDbFlowIdParams;
  }>,
  res: FastifyReply,
) {
  try {
    const { orgId } = req.user;
    const { dbFlowId } = req.params;
    const previousFlow = await getFlowFromDb(dbFlowId);
    const { categories } = await getFlowFromWa(orgId, previousFlow.flowId);
    //flowid of new cloned flow
    const { id: flowId } = await cloneFlowInWa(orgId, {
      name: `${previousFlow.name} ${previousFlow.flowId}`,
      categories,
      clone_flow_id: previousFlow.flowId,
    });

    await deprecateFlowInWa(orgId, previousFlow.flowId);
    await updateFlowIdAndStatusInDb(dbFlowId, flowId, previousFlow.surveyId);
    res.status(204).send();
  } catch (error) {
    res.status(500).send(error.message);
  }
}

export async function cloneFlowHandler(
  req: FastifyRequest<{
    Params: ByDbFlowIdParams;
    Body: CloneFlowBody;
  }>,
  res: FastifyReply,
) {
  try {
    let teamId = req?.body?.teamId;
    const { orgId, userId } = req.user;
    const { dbFlowId } = req.params;
    const previousFlow = await getFlowFromDb(dbFlowId);
    const { categories } = await getFlowFromWa(orgId, previousFlow.flowId);
    const uniqueSuffix = Date.now();
    const { id: flowId } = await cloneFlowInWa(orgId, {
      name: `${previousFlow.name} ${previousFlow.flowId} ${uniqueSuffix}`,
      categories,
      clone_flow_id: previousFlow.flowId,
    });
    let waFlow = await cloneFlow(previousFlow, flowId, userId, teamId);
    if (typeof waFlow === "string") {
      return res.status(400).send({ message: waFlow });
    }
    return res.status(201).send();
  } catch (error) {
    res.status(500).send(error.message);
  }
}
export async function getFlowPreviewHandler(
  req: FastifyRequest<{
    Params: ByDbFlowIdParams;
  }>,
  res: FastifyReply,
) {
  const { orgId } = req.user;
  const { dbFlowId } = req.params;

  const preview = await getFlowPreview(orgId, dbFlowId);
  res.send(preview);
}

export async function deleteFlowHandler(
  req: FastifyRequest<{
    Params: ByDbFlowIdParams;
  }>,
  res: FastifyReply,
) {
  const { orgId } = req.user;
  const { dbFlowId } = req.params;

  const flow = await getFlowFromDb(dbFlowId);
  if (flow.status === WaFlowStatus.PUBLISHED) {
    throw new Error("Cannot delete a published flow. Deprecate it instead.");
  }

  try {
    log.trace("deleting flow in wa %s", flow.flowId);
    if (flow.flowId) await deleteFlowInWa(orgId, flow.flowId);
  } catch (error) {
    log.error({ err: error }, "Error deleting flow in wa");
  }

  if (flow.surveyId) {
    log.trace("deleting survey %s", flow.surveyId);
    await deleteSurveyById(flow.surveyId);
    // Deleting the survey will delete the flow from db as well
  } else {
    log.trace("deleting flow in db %s", dbFlowId);
    await deleteFlowInDb(dbFlowId);
  }

  res.status(204).send();
}

export async function deprecateFlowHandler(
  req: FastifyRequest<{
    Params: ByDbFlowIdParams;
  }>,
  _res: FastifyReply,
) {
  const { orgId } = req.user;
  const { dbFlowId } = req.params;

  const flow = await getFlowFromDb(dbFlowId);
  if (flow.status === WaFlowStatus.DRAFT) {
    throw new Error("Cannot deprecate a draft flow. Delete it instead.");
  }

  try {
    await deprecateFlowInWa(orgId, flow.flowId);
  } catch (error) {
    log.error("Error deprecating flow in wa %s", error);
  }

  if (flow.surveyId) {
    log.trace("deleting survey %s", flow.surveyId);
    await deleteSurveyById(flow.surveyId);
    // Deleting the survey will delete the flow from db as well
  } else {
    log.trace("deleting flow in db %s", dbFlowId);
    await deleteFlowInDb(dbFlowId);
  }
}

export async function publishFlowHandler(
  req: FastifyRequest<{
    Params: ByDbFlowIdParams;
  }>,
  _res: FastifyReply,
) {
  const { orgId } = req.user;
  const { dbFlowId } = req.params;

  const flow = await getFlowFromDb(dbFlowId);

  await publishFlowInWa(orgId, flow.flowId);
  await updateFlowInDb(orgId, dbFlowId, { status: WaFlowStatus.PUBLISHED });
}

export async function sendFlowHandler(
  request: FastifyRequest<{
    Body: SendFlowBody;
    Params: ByDbFlowIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId, userId } = request.user;
    const { dbFlowId } = request.params;
    const { phone, teamId, flowId, whatsappSettingsPhoneId } = request.body;
    const serviceParam = {
      orgId,
      dbFlowId,
      phone,
      userId,
      whatsappSettingsPhoneId,
    };
    if (orgId) {
      updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
    }
    const dbFlow = await getFlowWithSurveyTeamMapIds(orgId, flowId);
    const surveyTeamMapId = dbFlow?.survey?.teams?.find((t) => t.teamId === teamId)?.id;
    const session = await getSession(orgId, phone);
    if (!validateSession(session) || session.surveyTeamMapId !== surveyTeamMapId) {
      await deleteSession(orgId, phone);
      await createSession({
        phone,
        orgId,
        surveyTeamMapId: surveyTeamMapId,
        language: dbFlow?.survey?.languages[0],
      });
    }
    await sendFlow(serviceParam);
    reply.status(201).send();
  } catch (error) {
    reply.status(500).send(error.message);
  }
}
