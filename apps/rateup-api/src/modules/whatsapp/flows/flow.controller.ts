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
  getFlowFromWa,
  getFlowJsonFromWa,
  getFlowPreview,
  getFlowsFromDb,
  getFlowsFromWa,
  getFlowWithSurveyTeamMapIdsWithDbFlowId,
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
    const flows = await getFlowsFromDb(orgId, userId!);
    res.send(flows);
  } else {
    // Unreachable through the route today (the querystring schema is an enum
    // defaulting to "wa"), but leaving the reply untouched made fastify send a
    // bare 200 that a client could not tell from a real answer.
    // See issues.txt 11.13.
    res.status(400).send({ message: `Unknown flow source: ${req.query.source}` });
  }
}

export async function getFlowHandler(
  req: FastifyRequest<{
    Params: ByWaFlowIdParams;
  }>,
  res: FastifyReply,
) {
  // NOTE: the route declares this param as ":waFlowId" but it is our own
  // dbFlowId — getFlowFromDb queries by dbFlowId. See issues.txt 11.16.
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
    const waSettings = await getWaSettings(orgId);
    if (!waSettings) {
      throw new Error(`WhatsApp settings not found for org: ${orgId}`);
    }
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
  res: FastifyReply,
) {
  const { orgId } = req.user;
  const { waFlowIds, mapData } = req.body;
  // TODO: convert to prisma transaction. STILL OPEN — a failure partway through
  // leaves the earlier flows imported and the caller cannot tell which.
  // See issues.txt 11.14.
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
  // Sends its own 201 rather than leaving fastify to fall back to a bare 200.
  // See issues.txt 11.13.
  res.status(201).send();
}

export async function createFlowHandler(
  req: FastifyRequest<{
    Body: CreateFlowInput;
  }>,
  res: FastifyReply,
) {
  const { orgId } = req.user;
  const { name, categories, teamIds } = req.body;
  let createdFlowId: string | undefined;
  try {
    log.trace("creating flow in wa %s", name);
    const { id: flowId } = await createFlowInWa(orgId, { name, categories });
    createdFlowId = flowId;
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
    });
    return res.status(200).send(dbFlow?.dbFlowId);
  } catch (error) {
    log.error({ err: error }, "Error creating flow");
    if (createdFlowId) {
      // The Meta flow is created first, so every failure after that point used
      // to leave one behind that nothing in our database pointed at.
      // See issues.txt 11.14.
      await deleteOrphanedMetaFlow(orgId, createdFlowId);
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

  // Wrapped, consistent with the rest of the file. This handler had no
  // try/catch at all, so a service failure escaped to fastify's default error
  // handler and a flow id matching nothing answered 500 rather than 404.
  // See issues.txt 11.4.
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

      await updateFlowMetaDataInWa(orgId, updatedFlow.flowId, {
        endpoint_uri,
      });
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
    const waSettings = await getWaSettings(orgId);
    if (!waSettings) {
      throw new Error(`WhatsApp settings not found for org: ${orgId}`);
    }
    // Meta first, then our copy. The other order left the local row carrying the
    // new name while WhatsApp still had the old one whenever Meta refused, with
    // nothing to tell the caller which half took. See issues.txt 11.14.
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
    // send(error.message), not send(error): an Error's own properties are
    // non-enumerable, so the client used to receive {}. See issues.txt 11.14.
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
    const { categories } = await getFlowFromWa(orgId, previousFlow.flowId);
    //flowid of new cloned flow
    const { id: flowId } = await cloneFlowInWa(orgId, {
      name: `${previousFlow.name} ${previousFlow.flowId}`,
      categories,
      clone_flow_id: previousFlow.flowId,
    });

    await deprecateFlowInWa(orgId, previousFlow.flowId);
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
    const { categories } = await getFlowFromWa(orgId, previousFlow.flowId);
    const uniqueSuffix = Date.now();
    const { id: flowId } = await cloneFlowInWa(orgId, {
      name: `${previousFlow.name} ${previousFlow.flowId} ${uniqueSuffix}`,
      categories,
      clone_flow_id: previousFlow.flowId,
    });
    let waFlow = await cloneFlow(previousFlow, flowId, userId!, teamId);
    if (typeof waFlow === "string") {
      // The Meta clone already exists at this point, so it is deleted rather
      // than left behind with nothing pointing at it. See issues.txt 11.14.
      await deleteOrphanedMetaFlow(orgId, flowId);
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
async function deleteOrphanedMetaFlow(orgId: string, flowId: string) {
  try {
    await deleteFlowInWa(orgId, flowId);
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
    // 409, not a bare `throw`: this is a legitimate refusal with an explanation
    // the caller can act on, and it used to arrive as an opaque 500.
    // See issues.txt 11.4.
    return res.status(409).send({
      message: "Cannot delete a published flow. Deprecate it instead.",
    });
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
    // See the note in deleteFlowHandler. issues.txt 11.4.
    return res.status(409).send({
      message: "Cannot deprecate a draft flow. Delete it instead.",
    });
  }

  try {
    if (!flow.flowId) {
      throw new Error(`Flow ${dbFlowId} has not been created in WhatsApp yet (missing flowId)`);
    }
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
    await deleteFlowInDb(dbFlowId, orgId);
  }

  // Sends its own 204, matching deleteFlowHandler. Leaving the reply untouched
  // made fastify fall back to a bare 200. See issues.txt 11.13.
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

  await publishFlowInWa(orgId, flow.flowId);
  await updateFlowInDb(orgId, dbFlowId, { status: WaFlowStatus.PUBLISHED });

  // Sends its own 204 rather than leaving fastify to fall back to a bare 200.
  // See issues.txt 11.13.
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
      // Awaited: an unawaited failure here became an unhandled promise
      // rejection rather than a failed request. See issues.txt 11.15.
      await updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
    }
    // Both the session and the flow now come from the path dbFlowId. The session
    // used to be set up from body.flowId (Meta's id) with nothing checking the
    // two named the same flow, so a mismatched pair opened a session against one
    // survey and sent a different flow — answers landed on the wrong survey.
    // See issues.txt 11.15.
    const dbFlow = await getFlowWithSurveyTeamMapIdsWithDbFlowId(dbFlowId, orgId);
    if (!dbFlow) {
      return reply.status(404).send({ message: "Flow not found" });
    }
    const surveyTeamMapId = dbFlow?.survey?.teams?.find((t) => t.teamId === teamId)?.id;
    const session = await getSession(orgId, phone);
    if (!session || !validateSession(session) || session.surveyTeamMapId !== surveyTeamMapId) {
      await deleteSession(orgId, phone);
      if (!surveyTeamMapId) {
        throw new Error(`No survey team mapping found for team ${teamId} on flow ${dbFlowId}`);
      }
      await createSession({
        phone,
        orgId,
        surveyTeamMapId,
        language: dbFlow?.survey?.languages[0],
      });
    }
    // sendFlow catches its own failures and reports false. Discarding that told
    // the user the flow went out when WhatsApp had rejected it.
    // See issues.txt 11.4.
    const sent = await sendFlow(serviceParam);
    if (!sent) {
      return reply.status(502).send({ message: "The flow could not be sent to WhatsApp" });
    }
    reply.status(201).send();
  } catch (error) {
    reply.status(500).send(error instanceof Error ? error.message : "Unknown error");
  }
}
