import { FastifyReply, FastifyRequest } from "fastify";
import { createRespondentsIndividually, getRGroupsByRespondentId, getRespondentById, getRespondentResponseHistory as getRespondentResponseHistory, getRespondentSurveyHistory, updateRespondentById, getRespondents, getRGroupsByPhone, getRespondentSurveyHistoryByPhone, deleteRespondentById } from "./respondent.service";
import { CreateRespondentsInput, RespondentByIdParams, UpdateRespondentInput, respondentByPhoneParamsSchema } from "./respondent.schema";
import Session from "supertokens-node/recipe/session";
import { getTeamsByUserId } from "../../team/team.service";

/**
 * Returns all respondents across all teams that the user has access to
 * @param request 
 * @param reply 
 */
export async function getAllRespondentsHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    // TODO: attatch userId to request while verifying session for easier access
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();
    const teams = await getTeamsByUserId(userId);
    const teamIds = teams.map(team => team.teamId);

    const respondents = await getRespondents(teamIds);
    reply.send(respondents);
}

/**
 * Returns all respondents belonging to a team
 * @param request 
 * @param reply 
 */
export async function getRespondentsByTeamIdHandler(
    request: FastifyRequest<{ Params: { teamId: string } }>,
    reply: FastifyReply
) {
    const { teamId } = request.params;
    const respondents = await getRespondents([teamId]);
    reply.send(respondents);
}

export async function createRespondentsHandler(
    request: FastifyRequest<{ Body: CreateRespondentsInput }>,
    reply: FastifyReply

) {
    const { body: { respondents, teamId } } = request;
    // TODO: replace with batch operation
    if (!respondents.every(r => r.phone != undefined || r.phone != null)) {
        throw new Error("Phone should not be null")
        return
    }
    // TODO: fix the below hacky type-error-fix. Find out why phone is marked as optional in respondents array.
    await createRespondentsIndividually(teamId, respondents as Array<{ phone: string, name?: string }>);
    reply.code(201).send();
}

export async function getRespondentByIdHandler(
    request: FastifyRequest<{ Params: RespondentByIdParams }>,
    reply: FastifyReply
) {
    const { respondentId } = request.params;
    const respondent = await getRespondentById(respondentId);
    reply.send(respondent)
}

/**
 * Returns all survey-send history for a phone number across all teams that the user has access to
 * @param request 
 * @param reply 
 */
export async function getAllRespondentSurveyHistoryHandler(
    request: FastifyRequest<{ Params: respondentByPhoneParamsSchema }>,
    reply: FastifyReply
) {
    const { phone } = request.params;
    const teamIds = await getTeamIdsFromSession(request, reply);

    const surveyHistory = await getRespondentSurveyHistoryByPhone(phone, teamIds)
    reply.send(surveyHistory);
}

export async function getRespSurveyHistoryByRespondentIdHandler(
    request: FastifyRequest<{ Params: RespondentByIdParams }>,
    reply: FastifyReply
) {
    const { respondentId } = request.params;
    const surveyHistory = await getRespondentSurveyHistory(respondentId);
    reply.send(surveyHistory);
}

export async function getAllRespondentResponseHistoryHandler(
    request: FastifyRequest<{ Params: RespondentByIdParams }>,
    reply: FastifyReply
) {
    const { respondentId } = request.params;

    const surveyHistory = await getRespondentResponseHistory(respondentId);
    reply.send(surveyHistory);
}

export async function getRespResponseHistoryByRespondentIdHandler(
    request: FastifyRequest<{ Params: RespondentByIdParams }>,
    reply: FastifyReply
) {

    const { respondentId } = request.params;

    const surveyHistory = await getRespondentResponseHistory(respondentId);
    reply.send(surveyHistory);
}

export async function updateRespondentByIdHandler(
    request: FastifyRequest<{ Params: RespondentByIdParams, Body: UpdateRespondentInput }>,
    reply: FastifyReply
) {
    const { respondentId } = request.params;
    const { body } = request;

    const res = await updateRespondentById(respondentId, body);
    reply.send(res)
}

export async function getAllRGroupsByPhoneHandler(
    request: FastifyRequest<{ Params: respondentByPhoneParamsSchema }>,
    reply: FastifyReply
) {
    const teamIds = await getTeamIdsFromSession(request, reply);
    const { phone } = request.params;

    const rGroups = await getRGroupsByPhone(phone, teamIds)
    reply.send(rGroups);
}

export async function getRGroupsByRespondentIdHandler(
    request: FastifyRequest<{ Params: RespondentByIdParams }>,
    reply: FastifyReply
) {
    const { respondentId } = request.params;

    const rGroups = await getRGroupsByRespondentId(respondentId);
    reply.send(rGroups);
}

// TODO: move?
/**
 * Returns TeamIds in which the client is a member of
 * @param request 
 * @param reply 
 * @returns 
 */
export async function getTeamIdsFromSession(request: FastifyRequest, reply: FastifyReply) {
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();
    const teams = await getTeamsByUserId(userId);
    const teamIds = teams.map(team => team.teamId);
    return teamIds;
}

export async function deleteRespondentByIdHandler(
    request: FastifyRequest<{ Params: RespondentByIdParams }>,
    reply: FastifyReply
) {
    const { respondentId } = request.params;

    const res = await deleteRespondentById(respondentId);
    reply.send(res)
}