import { emitSurveyResponseSubmitted } from "../integrations/events/emitIntegrationEvent.js";
import axios from "axios";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  CreateResponseInput,
  GetResponsesParams,
  DeleteResponseParamsSchema,
  GenerateBodyInput,
  generateXlsxBody,
  SummarizeInput,
  ResponseFilterQuery,
} from "./response.schema.js";
import {
  createResponse,
  deleteResponse,
  downloadExcelResponse,
  downloadExcelResponseV2,
  exportContactResponseToContacts,
  generateResponse,
  getAllResponses,
  getResponseAnalyticsForGraph,
  getResponseBySurveyById,
  getResponseCountForCamparison,
  getResponses,
  getResponseSummary,
  getSurveyList,
  getSurveyResponseBySurveyId,
  getSurveyResponseCount,
  resetResponsesStats,
  saveResponseToGoogleSheet,
  sendEmailOnResponseCreation,
  sendResponseToWebhook,
  syncResponseToGoogleSheet,
  updateResponse,
  happyIndexResponsesBySurveyId,
} from "./response.service.js";
import { fetchLocation } from "../../utils/location.js";
import { getIp } from "../../utils/http.js";
import { getTeamIdsBySurveyMapId, getTeamIdsByUserId } from "../team/team.service.js";
import { createTestimonial } from "../testimonial/testimonial.service.js";
import { getQuestionsBySurveyId } from "../question/question.service.js";
import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";
import { getSubscription } from "../subscription/subscription.service.js";
import { getFlowFromDb } from "../whatsapp/flows/flow.service.js";
import { BySurveyIdParamsInput } from "../testimonial/testimonial.schema.js";
import { PrismaClientKnownRequestError } from "../../../generated/prisma/internal/prismaNamespace.js";
import { getSpreadsheetContentType, getSpreadsheetFilename } from "../../utils/spreadsheet.js";

export async function getResponsesHandler(
  request: FastifyRequest<{
    Params: GetResponsesParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyTeamMapId = request.params.surveyTeamMapId;
    if (!surveyTeamMapId) {
      return reply.code(400).send({ message: "surveyTeamMapId is required" });
    }
    const responses = await getResponses(surveyTeamMapId);
    reply.send(responses);
  } catch (e) {
    console.error(e);
    reply.code(500).send();
  }
}

export async function getAllResponsesHandler(
  request: FastifyRequest<{
    Params: GetResponsesParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    const teamIds = await getTeamIdsByUserId(request.userId);
    const responses = await getAllResponses(surveyId, teamIds);
    reply.code(200).send(responses);
  } catch (e) {
    console.error(e);
    reply.code(500).send();
  }
}
//to get response of survey by id for external api
export async function getResponsesBySurveyIdHandler(
  req: FastifyRequest<{
    Params: GetResponsesParams;
  }>,
  res: FastifyReply,
) {
  try {
    const { surveyId } = req.params;
    const response = await getResponseBySurveyById(surveyId);
    res.send(response);
  } catch (error) {
    log.error("error while geResponsesBySurveyId");
    res.code(500).send(error);
  }
}

//to get survey lisit for external api
export async function getSurveyListHandler(req: FastifyRequest, res: FastifyReply) {
  try {
    const { orgId } = req.user;
    const response = await getSurveyList(orgId);
    res.send(response);
  } catch (error) {
    log.error("error while getSurveyListHandler");
    res.code(500).send(error);
  }
}

export async function downloadExcelResponseHandler(
  request: FastifyRequest<{
    Body: generateXlsxBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const teamIds =
      request.body.filterTeams?.length > 0
        ? await getTeamIdsBySurveyMapId(request.body.filterTeams, request.userId)
        : await getTeamIdsByUserId(request.userId);
    const campaignParticipantIds = await prisma.campaignParticipant.findMany({
      where: {
        campaignId: {
          in: request.body.campaignIds,
        },
      },
    });
    const surveyId = request.body.surveyId;
    const allResponse = await getAllResponses(
      surveyId,
      teamIds,
      campaignParticipantIds.map((data) => data.contactId),
      request.body.columnFilters,
      request.body.ranges,
      request.body.tz,
    );
    const format = request.body.format || "xlsx";

    let question;
    if (request.body.dbFlowId) {
      let flow = await getFlowFromDb(request.body.dbFlowId, request.user.orgId);
      // WaFlowScreen.layout.children is declared as WaFlowForm[], but at runtime (for the
      // flattened question list used here) these are actually flow form elements — same
      // dynamic-shape cast pattern used for this exact "flow screens -> questions" flattening
      // in response.service.ts (e.g. downloadExcelResponse's WhatsApp-flow branch).
      question = flow?.json?.screens?.flatMap((screen) =>
        screen?.layout?.children?.filter((child) => child?.type !== "Footer" && child.name),
      ) as unknown as Parameters<typeof downloadExcelResponseV2>[1];
      const data = await downloadExcelResponseV2(
        allResponse,
        question,
        request.body.visibleColumn,
        request.body.tz,
        format,
      );
      reply
        .status(200)
        .header("Content-Type", getSpreadsheetContentType(format))
        .header(
          "Content-Disposition",
          `attachment; filename="${getSpreadsheetFilename("responses", format)}"`,
        )
        .send(data);
    } else {
      question = await getQuestionsBySurveyId(surveyId);
      const data = await downloadExcelResponse(
        surveyId,
        allResponse,
        question,
        request.body.defaultLanguage,
        request.body.visibleColumn,
        request.body.tz,
        format,
      );
      reply
        .status(200)
        .header("Content-Type", getSpreadsheetContentType(format))
        .header(
          "Content-Disposition",
          `attachment; filename="${getSpreadsheetFilename("responses", format)}"`,
        )
        .send(data);
    }
  } catch (error) {
    log.error({ err: error }, "Error downloading excel");
    reply.status(500).send(error);
  }
}

export async function resetResponsesHandler(
  request: FastifyRequest<{
    Params: GetResponsesParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    const reset = await resetResponsesStats(surveyId);
    reply.code(201).send({ success: true, data: reset });
  } catch (e) {
    console.error(e);
    reply
      .code(500)
      .send({ success: false, message: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function deleteResponseHandler(
  request: FastifyRequest<{
    Params: DeleteResponseParamsSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { id, surveyTeamMapId } = request.params;
    const deleteRes = await deleteResponse(id, surveyTeamMapId);
    reply.code(201).send({ success: true, data: deleteRes });
  } catch (e) {
    console.error(e);
    reply
      .code(500)
      .send({ success: false, message: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function createResponseHandler(
  request: FastifyRequest<{
    Body: CreateResponseInput;
  }>,
  reply: FastifyReply,
) {
  const { checkUniqueDevice, ...data } = request.body;
  const ip = getIp(request);

  try {
    const response = await createResponse(data, checkUniqueDevice, ip);
    reply.code(201).send();
    const {
      surveyTeamMapId,
      responses: responseArray,
      language,
      createdAt,
      Contact,
      tag,
    } = response;
    const responses = responseArray as unknown as QuestionResponse[];
    const coords = response.location?.coordinates;
    const location = (await fetchLocation(coords)) ?? undefined;
    // checking location information after response is created since we dont
    // want to leave the user waiting
    if (data.platform === "WHATSAPP") {
      // TODO: check if its possible to get location from whatsapp
    } else {
      const sideEffects = await Promise.allSettled([
        saveResponseToGoogleSheet({
          surveyTeamMapId,
          responses,
          language,
          createdAt,
          respondent: Contact?.phone,
          tag,
        }),
        sendEmailOnResponseCreation(data.surveyTeamMapId, response),
        updateResponse(response.id, { ip, location }),
        sendResponseToWebhook(response, response.surveyTeamMap.team.orgId),
        createTestimonial(data, response.id),
        emitSurveyResponseSubmitted(response.surveyTeamMap.team.orgId, response),
      ]);
      for (const [index, result] of sideEffects.entries()) {
        if (result.status === "rejected") {
          log.error(
            { err: result.reason, responseId: response.id, index },
            "Post-response side effect failed",
          );
        }
      }
    }
  } catch (e) {
    console.error(e);
    reply.code(500).send(e instanceof Error ? e.message : "Unknown error");
  }
}
export async function generateResponseHandler(
  request: FastifyRequest<{
    Body: GenerateBodyInput;
  }>,
  reply: FastifyReply,
) {
  try {
    await generateResponse(request.body);
    reply.code(201).send();
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError) reply.code(400).send("Survey Not Found");
    else reply.code(500).send(e instanceof Error ? e.message : "Unknown error");
  }
}

export async function syncResponseToGoogleSheetHandler(
  request: FastifyRequest<{
    Params: {
      surveyId: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    const orgId = request.user.orgId;
    let survey = await syncResponseToGoogleSheet(surveyId, orgId);
    reply.code(201).send(survey);
  } catch (e) {
    console.log(e);
    if (e instanceof PrismaClientKnownRequestError) reply.code(400).send("Survey Not Found");
    else if (axios.isAxiosError(e) && e.response?.data?.error)
      reply.code(500).send({ error: e.response.data.error });
    else reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function summarizeResponseHandler(
  request: FastifyRequest<{ Params: GetResponsesParams; Body: SummarizeInput }>,
  reply: FastifyReply,
) {
  try {
    const { surveyId } = request.params;
    const { type, questionId } = request.body;
    const teamId = request.body.teamId;
    const subscription = await getSubscription(request.user.orgId);
    if (!subscription) return reply.code(403).send("Subscription not found");
    const aiFeature = subscription.features.ai;
    if (!aiFeature || !aiFeature.active)
      return reply.code(403).send("You are not subscribed to AI Features");
    const usedTokens = await prisma.usageStats.findUnique({
      where: {
        orgId: request.user.orgId,
      },
      select: {
        aiCompletionTokensCount: true,
        aiPromptTokensCount: true,
      },
    });
    const res = await getResponseSummary(
      surveyId,
      request,
      aiFeature.count,
      usedTokens,
      type,
      questionId,
      teamId,
    );
    reply.code(200).send(res);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function exportContactResponseToContactsHandler(
  request: FastifyRequest<{ Params: GetResponsesParams }>,
  reply: FastifyReply,
) {
  try {
    await exportContactResponseToContacts(request.params.surveyId, request.user.orgId);
    reply.code(200).send();
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error exporting contacts" });
  }
}

export async function getSurveyResponseCountHandler(
  request: FastifyRequest<{ Params: BySurveyIdParamsInput }>,
  reply: FastifyReply,
) {
  try {
    const teamIds = await getTeamIdsByUserId(request.userId);
    const res = await getSurveyResponseCount(request.params.surveyId, teamIds);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getSurveyResponseBySurveyIdHandler(
  request: FastifyRequest<{
    Params: BySurveyIdParamsInput;
    Querystring: ResponseFilterQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const teamIds = await getTeamIdsByUserId(request.userId);
    const res = await getSurveyResponseBySurveyId(request.params.surveyId, teamIds, request.query);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getResponseAnalyticsForGraphHandler(
  request: FastifyRequest<{
    Params: BySurveyIdParamsInput;
    Querystring: { teamMapIds?: string; dateRange?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { teamMapIds, dateRange } = request.query;
    const surveyTeamMapIds = teamMapIds ? teamMapIds.split(",") : [];
    const teamIds = await getTeamIdsByUserId(request.userId);
    const res = await getResponseAnalyticsForGraph(
      request.params.surveyId,
      teamIds,
      surveyTeamMapIds,
      dateRange,
    );
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getResponseCountForCamparisonHandler(
  request: FastifyRequest<{ Params: BySurveyIdParamsInput }>,
  reply: FastifyReply,
) {
  try {
    const teamIds = await getTeamIdsByUserId(request.userId);
    const res = await getResponseCountForCamparison(request.params.surveyId, teamIds);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getHappyIndexResponsesHandler(
  request: FastifyRequest<{
    Params: { surveyId: string };
    Querystring: {
      teamMapIds: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { surveyId } = request.params;
    const { teamMapIds } = request.query;
    const surveyTeamMapIds = teamMapIds ? teamMapIds.split(",") : [];
    const teamIds = await getTeamIdsByUserId(request.userId);
    const result = await happyIndexResponsesBySurveyId(surveyId, surveyTeamMapIds, teamIds);
    reply.send(result);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e instanceof Error ? e.message : String(e));
  }
}
