import { FastifyReply, FastifyRequest } from "fastify";
import { AxiosError } from "axios";
import {
  cloneFlow,
  cloneFlowInWa,
  createFlowCopyInDb,
  createFlowInWa,
  deleteFlowInDb,
  deleteFlowInWa,
  deprecateFlowInWa,
  getFlowFromDb,
  getFlowFromDbByFlowId,
  getFlowFromWa,
  getFlowJsonFromWa,
  getFlowPreview,
  getFlowsFromDb,
  getFlowsFromWa,
  getFlowWithSurveyTeamMapIdsWithDbFlowId,
  getUnsyncedFlows,
  getWaSettingsForFlow,
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
  const { whatsappSettingsPhoneId } = req.query;
  let whatsappSettingsId: string | undefined;
  if (whatsappSettingsPhoneId) {
    const waSettings = await getWaSettings(orgId, whatsappSettingsPhoneId);
    if (!waSettings) {
      return res.status(404).send({
        message: `WhatsApp settings not found for phone: ${whatsappSettingsPhoneId}`,
      });
    }
    whatsappSettingsId = waSettings.id;
  }
  if (req.query.source === "wa") {
    const flows = await getFlowsFromWa(orgId, whatsappSettingsId);
    res.send(flows);
  } else if (req.query.source === "db") {
    const flows = await getFlowsFromDb(orgId, userId!, whatsappSettingsId);
    res.send(flows);
  } else {
    res.status(400).send({ message: `Unknown flow source: ${req.query.source}` });
  }
}

export async function getFlowHandler(
  req: FastifyRequest<{
    Params: ByWaFlowIdParams;
  }>,
  res: FastifyReply,
) {
  const { waFlowId } = req.params;
  const { orgId } = req.user;

  const flow = await getFlowFromDb(waFlowId, orgId);
  if (!flow) {
    // 404, not 403: a flow belonging to another org is indistinguishable from
    // one that never existed, so this cannot be used to probe for flow ids.
    return res.status(404).send({ message: "Flow not found" });
  }

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
    const flow = await getFlowFromDbByFlowId(orgId, waFlowId);
    const waSettings = await getWaSettingsForFlow(orgId, flow?.whatsappSettingsId);
    const response = await callMetaApi(
      `/${waFlowId}?fields=metric.name(ENDPOINT_REQUEST_COUNT).granularity(LIFETIME)`,
      "GET",
      waSettings.accessToken,
    );
    res.send(response?.data);
  } catch (error) {
    log.error("error while getting flow metrics");
    const response = error instanceof AxiosError ? error.response : undefined;
    return res.status(500).send(response);
  }
}
export async function getUnsyncedFlowsHandler(
  req: FastifyRequest<{
    Querystring: WaFlowSourceQuery;
  }>,
  res: FastifyReply,
) {
  const { orgId, userId } = req.user;
  const { whatsappSettingsPhoneId } = req.query;
  let whatsappSettingsId: string | undefined;
  if (whatsappSettingsPhoneId) {
    const waSettings = await getWaSettings(orgId, whatsappSettingsPhoneId);
    if (!waSettings) {
      return res.status(404).send({
        message: `WhatsApp settings not found for phone: ${whatsappSettingsPhoneId}`,
      });
    }
    whatsappSettingsId = waSettings.id;
  }
  return await getUnsyncedFlows(orgId, userId!, whatsappSettingsId);
}

export async function getFlowJsonHandler(
  req: FastifyRequest<{
    Params: ByWaFlowIdParams;
  }>,
  res: FastifyReply,
) {
  const { orgId } = req.user;
  const { waFlowId } = req.params;

  const flow = await getFlowFromDbByFlowId(orgId, waFlowId);
  const json = await getFlowJsonFromWa(orgId, waFlowId, flow?.whatsappSettingsId);

  res.send(json);
}

export async function importFlowsHandler(
  req: FastifyRequest<{
    Body: ImportFlowsBody;
  }>,
  res: FastifyReply,
) {
  const { orgId } = req.user;
  const { waFlowIds, mapData, whatsappSettingsPhoneId } = req.body;
  let whatsappSettingsId: string | undefined;
  if (whatsappSettingsPhoneId) {
    const waSettings = await getWaSettings(orgId, whatsappSettingsPhoneId);
    if (!waSettings) {
      return res.status(404).send({
        message: `WhatsApp settings not found for phone: ${whatsappSettingsPhoneId}`,
      });
    }
    whatsappSettingsId = waSettings.id;
  }
  log.trace("Importing flows: %o", waFlowIds);
  for (const waFlowId of waFlowIds) {
    log.trace("fetching flow from wa %s", waFlowId);
    const waFlow = await getFlowFromWa(orgId, waFlowId, whatsappSettingsId);
    log.trace("fetching flow json %s", waFlowId);
    const json = await getFlowJsonFromWa(orgId, waFlowId, whatsappSettingsId); // TODO: cache?
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
      whatsappSettingsId,
    });
  }
  log.trace("Imported flows successfully!");
  res.status(201).send();
}

export async function createFlowHandler(
  req: FastifyRequest<{
    Body: CreateFlowInput;
  }>,
  res: FastifyReply,
) {
  const { orgId } = req.user;
  const { name, categories, teamIds, whatsappSettingsPhoneId } = req.body;
  let createdFlowId: string | undefined;
  let createdOnWhatsappSettingsId: string | undefined;
  try {
    let requestedWhatsappSettingsId: string | undefined;
    if (whatsappSettingsPhoneId) {
      const waSettings = await getWaSettings(orgId, whatsappSettingsPhoneId);
      if (!waSettings) {
        return res.status(404).send({
          message: `WhatsApp settings not found for phone: ${whatsappSettingsPhoneId}`,
        });
      }
      requestedWhatsappSettingsId = waSettings.id;
    }
    log.trace("creating flow in wa %s", name);
    const { id: flowId, whatsappSettingsId } = await createFlowInWa(
      orgId,
      { name, categories },
      requestedWhatsappSettingsId,
    );
    createdFlowId = flowId;
    createdOnWhatsappSettingsId = whatsappSettingsId;
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
        } satisfies WaFlowJson),
      flowMap: req.body.map ?? {},
      surveyId: survey.id,
      status: WaFlowStatus.DRAFT,
      name: name,
      whatsappSettingsId,
    });
    return res.status(200).send(dbFlow?.dbFlowId);
  } catch (error) {
    log.error({ err: error }, "Error creating flow");
    if (createdFlowId) {
      await deleteOrphanedMetaFlow(orgId, createdFlowId, createdOnWhatsappSettingsId);
    }
    if (error instanceof GraphApiError) {
      return res.status(400).send(getGraphApiErrorMessage(error));
    }
    // 500, not 400: everything reaching here is our failure, not the caller's.
    // It used to be flattened to the string "Creating flow Error" and answered
    // as a bad request, so a database outage arrived with nothing to act on.
    return res.status(500).send(error instanceof Error ? error.message : "Creating flow Error");
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

  try {
    log.trace("updating flow %o", req.body);
    const previousFlow = await getFlowFromDb(dbFlowId, orgId);
    if (!previousFlow) {
      return res.status(404).send({ message: "Flow not found" });
    }
    const updatedFlow = await updateFlowInDb(orgId, dbFlowId, {
      ...req.body,
      pendingSave: true,
    });
    const updatedWaAppIntegration = (
      updatedFlow?.survey?.questions as unknown as Question[] | undefined
    )?.some((qs) => qs.type === QuestionType.Date && qs?.onSelectAction && qs?.waAppName);

    // add data_channel_uri if logic jumps are updated
    if (
      (Object.keys(previousFlow.logicJumps).length === 0 &&
        Object.keys(updatedFlow.logicJumps).length > 0) ||
      updatedWaAppIntegration
    ) {
      log.trace("updating data_channel_uri in wa %s", updatedFlow.flowId);

      const domain = process.env.API_URL;
      if (!domain) {
        throw new Error("API_URL environment variable is not set");
      }
      if (!updatedFlow.flowId) {
        throw new Error(
          `Flow ${updatedFlow.dbFlowId} has not been created in WhatsApp yet (missing flowId)`,
        );
      }
      const server_url = domain.startsWith("https") ? domain : `https://${domain}`;
      const endpoint_uri = `${server_url}/api/wa/endpoint/${orgId}/${updatedFlow.dbFlowId}`;

      await updateFlowMetaDataInWa(
        orgId,
        updatedFlow.flowId,
        {
          endpoint_uri,
        },
        updatedFlow.whatsappSettingsId,
      );
      log.trace("uri set to %s", endpoint_uri);
    }
    res.status(201).send();
  } catch (error) {
    log.error({ err: error }, "Error updating flow");
    res.status(500).send({ message: error instanceof Error ? error.message : "Unknown error" });
  }
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
    res.status(500).send(error instanceof Error ? error.message : "Unknown error");
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
    const previousFlow = await getFlowFromDb(dbFlowId, orgId);
    if (!previousFlow) {
      return res.status(404).send({ message: "Flow not found" });
    }
    const waSettings = await getWaSettingsForFlow(orgId, previousFlow.whatsappSettingsId);
    const { data } = await callMetaApi(
      `/${previousFlow.flowId}`,
      "POST",
      waSettings.accessToken,
      req.body,
    );
    if (!data?.success) {
      log.error({ err: data }, "Flow Not updated in whatsapp");
      throw new Error("Flow Not updated in whatsapp");
    }
    await updateFlowInDb(orgId, dbFlowId, req.body);
    res.status(204).send();
  } catch (error) {
    log.error({ err: error }, "Error Updating flow meta data");
    res.status(500).send({ message: error instanceof Error ? error.message : "Unknown error" });
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
    const previousFlow = await getFlowFromDb(dbFlowId, orgId);
    if (!previousFlow) {
      return res.status(404).send({ message: "Flow not found" });
    }
    if (!previousFlow.flowId) {
      throw new Error(`Flow ${dbFlowId} has not been created in WhatsApp yet (missing flowId)`);
    }
    const { categories } = await getFlowFromWa(
      orgId,
      previousFlow.flowId,
      previousFlow.whatsappSettingsId,
    );
    //flowid of new cloned flow
    const { id: flowId } = await cloneFlowInWa(
      orgId,
      {
        name: `${previousFlow.name} ${previousFlow.flowId}`,
        categories,
        clone_flow_id: previousFlow.flowId,
      },
      previousFlow.whatsappSettingsId,
    );

    await deprecateFlowInWa(orgId, previousFlow.flowId, previousFlow.whatsappSettingsId);
    await updateFlowIdAndStatusInDb(dbFlowId, flowId, previousFlow.surveyId, orgId);
    res.status(204).send();
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : "Unknown error");
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
    const previousFlow = await getFlowFromDb(dbFlowId, orgId);
    if (!previousFlow) {
      return res.status(404).send({ message: "Flow not found" });
    }
    if (!previousFlow.flowId) {
      throw new Error(`Flow ${dbFlowId} has not been created in WhatsApp yet (missing flowId)`);
    }
    const { categories } = await getFlowFromWa(
      orgId,
      previousFlow.flowId,
      previousFlow.whatsappSettingsId,
    );
    const uniqueSuffix = Date.now();
    const { id: flowId } = await cloneFlowInWa(
      orgId,
      {
        name: `${previousFlow.name} ${previousFlow.flowId} ${uniqueSuffix}`,
        categories,
        clone_flow_id: previousFlow.flowId,
      },
      previousFlow.whatsappSettingsId,
    );
    let waFlow = await cloneFlow(previousFlow, flowId, userId!, teamId);
    if (typeof waFlow === "string") {
      await deleteOrphanedMetaFlow(orgId, flowId, previousFlow.whatsappSettingsId);
      return res.status(400).send({ message: waFlow });
    }
    return res.status(201).send();
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : "Unknown error");
  }
}

/**
 * Best-effort removal of a flow created at Meta whose local half then failed.
 * A failure to clean up is logged and swallowed — the caller is already
 * reporting the original failure, and an orphan is better than masking it.
 */
async function deleteOrphanedMetaFlow(
  orgId: string,
  flowId: string,
  whatsappSettingsId?: string | null,
) {
  try {
    await deleteFlowInWa(orgId, flowId, whatsappSettingsId);
    log.trace("rolled back orphaned flow %s in wa", flowId);
  } catch (error) {
    log.error({ err: error, flowId }, "Could not roll back the flow created in WhatsApp");
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

  const flow = await getFlowFromDb(dbFlowId, orgId);
  if (!flow) {
    return res.status(404).send({ message: "Flow not found" });
  }
  if (flow.status === WaFlowStatus.PUBLISHED) {
    return res.status(409).send({
      message: "Cannot delete a published flow. Deprecate it instead.",
    });
  }

  try {
    log.trace("deleting flow in wa %s", flow.flowId);
    if (flow.flowId) await deleteFlowInWa(orgId, flow.flowId, flow.whatsappSettingsId);
  } catch (error) {
    log.error({ err: error }, "Error deleting flow in wa");
  }

  if (flow.surveyId) {
    log.trace("deleting survey %s", flow.surveyId);
    await deleteSurveyById(flow.surveyId);
    // Deleting the survey will delete the flow from db as well
  } else {
    log.trace("deleting flow in db %s", dbFlowId);
    await deleteFlowInDb(dbFlowId, orgId);
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

  const flow = await getFlowFromDb(dbFlowId, orgId);
  if (!flow) {
    return res.status(404).send({ message: "Flow not found" });
  }
  if (flow.status === WaFlowStatus.DRAFT) {
    return res.status(409).send({
      message: "Cannot deprecate a draft flow. Delete it instead.",
    });
  }

  try {
    if (!flow.flowId) {
      throw new Error(`Flow ${dbFlowId} has not been created in WhatsApp yet (missing flowId)`);
    }
    await deprecateFlowInWa(orgId, flow.flowId, flow.whatsappSettingsId);
  } catch (error) {
    log.error("Error deprecating flow in wa %s", error);
  }

  if (flow.surveyId) {
    log.trace("deleting survey %s", flow.surveyId);
    await deleteSurveyById(flow.surveyId);
    // Deleting the survey will delete the flow from db as well
  } else {
    log.trace("deleting flow in db %s", dbFlowId);
    await deleteFlowInDb(dbFlowId, orgId);
  }

  res.status(204).send();
}

export async function publishFlowHandler(
  req: FastifyRequest<{
    Params: ByDbFlowIdParams;
  }>,
  res: FastifyReply,
) {
  const { orgId } = req.user;
  const { dbFlowId } = req.params;

  const flow = await getFlowFromDb(dbFlowId, orgId);
  if (!flow) {
    return res.status(404).send({ message: "Flow not found" });
  }
  if (!flow.flowId) {
    throw new Error(`Flow ${dbFlowId} has not been created in WhatsApp yet (missing flowId)`);
  }

  await publishFlowInWa(orgId, flow.flowId, flow.whatsappSettingsId);
  await updateFlowInDb(orgId, dbFlowId, { status: WaFlowStatus.PUBLISHED });

  res.status(204).send();
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
    const { phone, teamId, whatsappSettingsPhoneId } = request.body;
    const serviceParam = {
      orgId,
      dbFlowId,
      phone,
      userId,
      whatsappSettingsPhoneId,
    };
    if (orgId) {
      await updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
    }
    const dbFlow = await getFlowWithSurveyTeamMapIdsWithDbFlowId(dbFlowId, orgId);
    if (!dbFlow) {
      return reply.status(404).send({ message: "Flow not found" });
    }
    const surveyTeamMapId = dbFlow?.survey?.teams?.find((t) => t.teamId === teamId)?.id;
    if (!surveyTeamMapId) {
      throw new Error(`No survey team mapping found for team ${teamId} on flow ${dbFlowId}`);
    }
    const sent = await sendFlow({
      ...serviceParam,
      context: {
        surveyTeamMapId,
        language: dbFlow?.survey?.languages[0],
      },
    });
    if (!sent) {
      return reply.status(502).send({ message: "The flow could not be sent to WhatsApp" });
    }
    reply.status(201).send();
  } catch (error) {
    reply.status(500).send(error instanceof Error ? error.message : "Unknown error");
  }
}
