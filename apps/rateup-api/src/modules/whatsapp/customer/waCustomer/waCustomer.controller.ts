import { FastifyReply, FastifyRequest } from "fastify";
import { createWaCustomersIndividually, getWaCustomerGroupsByWaCustomerId, getWaCustomerById, getWaCustomerResponseHistory as getWaCustomerResponseHistory, getWaCustomerSurveyHistory, updateWaCustomerById, getWaCustomers, getWaCustomerGroupsByPhone, getWaCustomerSurveyHistoryByPhone, deleteWaCustomerById } from "./waCustomer.service";
import { CreateWaCustomersInput, WaCustomerByIdParams, UpdateWaCustomerInput, waCustomerByPhoneParamsSchema } from "./waCustomer.schema";
import Session from "supertokens-node/recipe/session";
import { getTeamsByUserId } from "../../../team/team.service";


/**
 * Returns all waCustomers across all teams that the user has access to
 * @param request 
 * @param reply 
 */
export async function getAllWaCustomersHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    // TODO: attatch userId to request while verifying session for easier access
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();
    const teams = await getTeamsByUserId(userId);
    const teamIds = teams.map(team => team.teamId);

    const waCustomers = await getWaCustomers(teamIds);
    reply.send(waCustomers);
}

/**
 * Returns all waCustomers belonging to a team
 * @param request 
 * @param reply 
 */
export async function getWaCustomersByTeamIdHandler(
    request: FastifyRequest<{ Params: { teamId: string } }>,
    reply: FastifyReply
) {
    const { teamId } = request.params;
    const waCustomers = await getWaCustomers([teamId]);
    reply.send(waCustomers);
}

export async function createWaCustomersHandler(
    request: FastifyRequest<{ Body: CreateWaCustomersInput }>,
    reply: FastifyReply

) {
    const { body: { waCustomers, teamId } } = request;
    // TODO: replace with batch operation
    if (!waCustomers.every(r => r.phone != undefined || r.phone != null)) {
        throw new Error("Phone should not be null")
        return
    }
    // TODO: fix the below hacky type-error-fix. Find out why phone is marked as optional in waCustomers array.
    await createWaCustomersIndividually(teamId, waCustomers as Array<{ phone: string, name?: string }>);
    reply.code(201).send();
}

export async function getWaCustomerByIdHandler(
    request: FastifyRequest<{ Params: WaCustomerByIdParams }>,
    reply: FastifyReply
) {
    const { waCustomerId } = request.params;
    const waCustomer = await getWaCustomerById(waCustomerId);
    reply.send(waCustomer)
}

/**
 * Returns all survey-send history for a phone number across all teams that the user has access to
 * @param request 
 * @param reply 
 */
export async function getAllWaCustomerSurveyHistoryHandler(
    request: FastifyRequest<{ Params: waCustomerByPhoneParamsSchema }>,
    reply: FastifyReply
) {
    const { phone } = request.params;
    const teamIds = await getTeamIdsFromSession(request, reply);

    const surveyHistory = await getWaCustomerSurveyHistoryByPhone(phone, teamIds)
    reply.send(surveyHistory);
}

export async function getRespSurveyHistoryByWaCustomerIdHandler(
    request: FastifyRequest<{ Params: WaCustomerByIdParams }>,
    reply: FastifyReply
) {
    const { waCustomerId } = request.params;
    const surveyHistory = await getWaCustomerSurveyHistory(waCustomerId);
    reply.send(surveyHistory);
}

export async function getAllWaCustomerResponseHistoryHandler(
    request: FastifyRequest<{ Params: WaCustomerByIdParams }>,
    reply: FastifyReply
) {
    const { waCustomerId } = request.params;

    const surveyHistory = await getWaCustomerResponseHistory(waCustomerId);
    reply.send(surveyHistory);
}

export async function getRespResponseHistoryByWaCustomerIdHandler(
    request: FastifyRequest<{ Params: WaCustomerByIdParams }>,
    reply: FastifyReply
) {

    const { waCustomerId } = request.params;

    const surveyHistory = await getWaCustomerResponseHistory(waCustomerId);
    reply.send(surveyHistory);
}

export async function updateWaCustomerByIdHandler(
    request: FastifyRequest<{ Params: WaCustomerByIdParams, Body: UpdateWaCustomerInput }>,
    reply: FastifyReply
) {
    const { waCustomerId } = request.params;
    const { body } = request;

    const res = await updateWaCustomerById(waCustomerId, body);
    reply.send(res)
}

export async function getAllWaCustomerGroupsByPhoneHandler(
    request: FastifyRequest<{ Params: waCustomerByPhoneParamsSchema }>,
    reply: FastifyReply
) {
    const teamIds = await getTeamIdsFromSession(request, reply);
    const { phone } = request.params;

    const waCustomerGroups = await getWaCustomerGroupsByPhone(phone, teamIds)
    reply.send(waCustomerGroups);
}

export async function getWaCustomerGroupsByWaCustomerIdHandler(
    request: FastifyRequest<{ Params: WaCustomerByIdParams }>,
    reply: FastifyReply
) {
    const { waCustomerId } = request.params;

    const waCustomerGroups = await getWaCustomerGroupsByWaCustomerId(waCustomerId);
    reply.send(waCustomerGroups);
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

export async function deleteWaCustomerByIdHandler(
    request: FastifyRequest<{ Params: WaCustomerByIdParams }>,
    reply: FastifyReply
) {
    const { waCustomerId } = request.params;

    const res = await deleteWaCustomerById(waCustomerId);
    reply.send(res)
}