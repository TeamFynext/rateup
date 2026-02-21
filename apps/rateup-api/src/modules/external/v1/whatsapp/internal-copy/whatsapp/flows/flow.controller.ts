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
import {
  createSurveyFromFlow,
  getFlowJsonWithTitleAndDescription,
} from "./flow.utils.js";
import { Survey } from "../../../../../../../../generated/prisma/client.js";
import { callWhatsappApi } from "../wa_axios.js";
import { getWaSettings } from "../settings/wa_settings.service.js";
import { SurveyType, WaFlowStatus } from "../../../../../../../types/enums.js";
import { log } from "../../../../../../../utils/logger.js";
import {
  createSurvey,
  deleteSurveyById,
} from "../../../../../../survey/survey.service.js";

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
  const { orgId } = req.user;
  if (req.query.source === "wa") {
    const flows = await getFlowsFromWa(orgId);
    res.send(flows);
  } else if (req.query.source === "db") {
    const flows = await getFlowsFromDb(orgId);
    res.send(flows);
  }
}

export async function getFlowHandler(
  req: FastifyRequest<{
    Params: ByWaFlowIdParams;
  }>,
  res: FastifyReply,
) {
  const { orgId } = req.user;
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
    const response = await callWhatsappApi(
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
export async function getUnsyncedFlowsHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  return await getUnsyncedFlows(req.user.orgId);
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
  res: FastifyReply,
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
    const { survey, flowMap: flowMapWithQuestionId } =
      await createSurveyFromFlow({
        orgId: orgId,
        flowJson: json,
        flowMap: mapData[waFlowId],
        req: req,
        teamIds: req.body.teamIds,
        title: waFlow.name,
      });

    log.trace("creating flow copy in db %s", waFlowId);
    const dbFlow = await createFlowCopyInDb({
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
      },
      req,
    )) as Survey;
    log.trace("creating flow copy in db %s", name);
    await createFlowCopyInDb({
      orgId,
      flowId,
      json: {
        version: "5.0",
        screens: [],
      } as WaFlowJson,
      flowMap: {},
      surveyId: survey.id,
      status: WaFlowStatus.DRAFT,
      name: name,
    });
  } catch (error) {
    return res
      .status(400)
      .send(
        error?.message?.split("error_message:")?.[1] ?? "Creating flow Error",
      );
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

  // add data_channel_uri if logic jumps are updated
  if (
    Object.keys(previousFlow.logicJumps).length === 0 &&
    Object.keys(updatedFlow.logicJumps).length > 0
  ) {
    log.trace("updating data_channel_uri in wa %s", updatedFlow.flowId);

    const domain = process.env.API_URL;
    const server_url = domain.startsWith("https")
      ? domain
      : `https://${domain}`;
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
    const { data } = await callWhatsappApi(
      `/${previousFlow?.flowId}`,
      "POST",
      accessToken,
      req.body,
    );
    if (!data?.success) {
      log.error("Flow Not updated in whatsapp\n%o", data);
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
    log.error({ err: error }, "Error cloning and deprecating flow");
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
    const { id: flowId } = await cloneFlowInWa(orgId, {
      name: `${previousFlow.name} ${previousFlow.flowId}`,
      categories,
      clone_flow_id: previousFlow.flowId,
    });
    let waFlow = await cloneFlow(previousFlow, flowId, userId, teamId);
    if (typeof waFlow === "string") {
      return res.status(400).send({ message: waFlow });
    }
    return res.status(201).send();
  } catch (error) {
    log.error({ err: error }, "Error cloning flow");
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

  log.trace("deleting flow in wa %s", flow.flowId);
  await deleteFlowInWa(orgId, flow.flowId);

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
  res: FastifyReply,
) {
  const { orgId } = req.user;
  const { dbFlowId } = req.params;

  const flow = await getFlowFromDb(dbFlowId);
  if (flow.status === WaFlowStatus.DRAFT) {
    throw new Error("Cannot deprecate a draft flow. Delete it instead.");
  }

  await deprecateFlowInWa(orgId, flow.flowId);
  await updateFlowInDb(orgId, dbFlowId, { status: WaFlowStatus.DEPRECATED });
}

export async function publishFlowHandler(
  req: FastifyRequest<{
    Params: ByDbFlowIdParams;
  }>,
  res: FastifyReply,
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
    const { orgId } = request.user;
    const { dbFlowId } = request.params;
    const { phone } = request.body;
    const serviceParam = {
      orgId,
      dbFlowId,
      phone,
    };
    await sendFlow(serviceParam);
    reply.status(201).send();
  } catch (error) {
    reply.status(500).send(error.message);
  }
}
