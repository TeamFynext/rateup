import { FastifyReply, FastifyRequest } from "fastify";
import {
  createFlowCopyInDb,
  getFlowJson,
  getFlowsFromDb,
  getFlowsFromWa,
  getUnsyncedFlows,
} from "./flow.service";
import {
  ByWaFlowIdParams,
  ImportFlowsBody,
  WaFlowSourceQuery,
} from "./flow.schema";
import { createSurveyFromFlow } from "./flow.utils";
import { log } from "../../../utils/logger";

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

  const json = await getFlowJson(orgId, waFlowId);

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
    log.trace("fetching flow json %s", waFlowId);
    const json = await getFlowJson(orgId, waFlowId); // TODO: cache?
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
      surveyId: survey.id,
      json,
      flowMap: flowMapWithQuestionId,
    });
  }

  log.trace("Imported flows successfully!");
}
