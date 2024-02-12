import { FastifyReply, FastifyRequest } from "fastify";
import {
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
  updateFlowInDb,
  updateFlowJsonInWa,
  updateFlowMetaDataInWa,
} from "./flow.service";
import {
  ByDbFlowIdParams,
  ByWaFlowIdParams,
  CreateFlowInput,
  ImportFlowsBody,
  UpdateFlowInput,
  WaFlowSourceQuery,
} from "./flow.schema";
import {
  createSurveyFromFlow,
  getFlowJsonWithTitleAndDescription,
} from "./flow.utils";
import { log } from "../../../utils/logger";
import { SurveyType, WaFlowStatus } from "../../../types/enums";
import { createSurvey, deleteSurveyById } from "../../survey/survey.service";
import { Survey, WaFlow } from "@prisma/client";

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
        flowJson: json,
        flowMap: mapData[waFlowId],
        userId: req.user.userId,
        teamIds: req.body.teamIds,
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
    },
    req.user.userId,
  )) as Survey;
  log.trace("creating flow copy in db %s", name);
  await createFlowCopyInDb({
    orgId,
    flowId,
    json: {
      version: "3.1",
      screens: [],
    } as WaFlowJson,
    flowMap: {},
    surveyId: survey.id,
    status: WaFlowStatus.DRAFT,
    name: name,
  });
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

  const previousFlow = await getFlowFromDb(dbFlowId);
  const updatedFlow = await updateFlowInDb(orgId, dbFlowId, req.body);
  const jsonWithTitle = getFlowJsonWithTitleAndDescription(
    updatedFlow.json as unknown as WaFlowJson,
    updatedFlow.map,
    updatedFlow.survey,
  );
  const response = await updateFlowJsonInWa(
    orgId,
    updatedFlow.flowId,
    jsonWithTitle as WaFlowJson,
  );

  // add data_channel_uri if logic jumps are updated
  if (
    Object.keys(previousFlow.logicJumps).length === 0 &&
    Object.keys(updatedFlow.logicJumps).length > 0
  ) {
    log.trace("updating data_channel_uri in wa %s", updatedFlow.flowId);
    await updateFlowMetaDataInWa(orgId, updatedFlow.flowId, {
      endpoint_uri: `${process.env.API_URL}/api/wa/endpoint/${orgId}/${updatedFlow.dbFlowId}`,
    });
  }
  res.status(201).send();
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
