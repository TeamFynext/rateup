import { FastifyReply, FastifyRequest } from "fastify";
import { addWaCustomersToGroup, createWaCustomerGroupFromPhoneNumbers, deleteWaCustomerGroupById, deleteWaCustomerFromWaCustomerGroup, getWaCustomerGroupSurveyHistory, getWaCustomerGroups, getWaCustomersByWaCustomerGroupId, updateWaCustomerGroup } from "./waCustomerGroup.service";
import { AddWaCustomersToWaCustomerGroupInput, CreateWaCustomerGroupInput, DeleteWaCustomerFromWaCustomerGroupParams, WaCustomerGroupsByIdParams, UpdateWaCustomerGroupInput } from "./waCustomerGroup.schema";
import Session from "supertokens-node/recipe/session";
import { getTeamsByUserId } from "../../../team/team.service";

export async function createWaCustomerGroupFromPhoneNumbersHandler(
    request: FastifyRequest<{ Body: CreateWaCustomerGroupInput }>,
    reply: FastifyReply
) {
    const { body } = request;
    await createWaCustomerGroupFromPhoneNumbers(body);
    reply.code(201).send();
}

export async function getAllWaCustomerGroupsHandler(request: FastifyRequest, reply: FastifyReply) {

    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();
    const teams = await getTeamsByUserId(userId);
    const teamIds = teams.map((team) => team.teamId);

    const waCustomerGroups = await getWaCustomerGroups(teamIds);
    reply.code(200).send(waCustomerGroups);
}

export async function getWaCustomerGroupsByTeamIdHandler(
    request: FastifyRequest<{ Params: { teamId: string } }>,
    reply: FastifyReply
) {
    const { teamId } = request.params;
    const waCustomerGroups = await getWaCustomerGroups([teamId]);
    reply.code(200).send(waCustomerGroups);
}

export async function getWaCustomersByWaCustomerGroupIdHandler(request: FastifyRequest<{ Params: WaCustomerGroupsByIdParams }>, reply: FastifyReply) {
    const { waCustomerGroupId } = request.params;
    const waCustomerGroups = await getWaCustomersByWaCustomerGroupId(waCustomerGroupId);
    reply.code(200).send(waCustomerGroups);
}

export async function getWaCustomerGroupsSurveyHistoryByGroupIdHandler(
    request: FastifyRequest<{ Params: WaCustomerGroupsByIdParams }>,
    reply: FastifyReply
) {
    const { waCustomerGroupId } = request.params;
    const surveyHistory = await getWaCustomerGroupSurveyHistory(waCustomerGroupId);
    reply.send(surveyHistory);
}

export async function deleteWaCustomerFromWaCustomerGroupHandler(
    request: FastifyRequest<{ Params: DeleteWaCustomerFromWaCustomerGroupParams }>,
    reply: FastifyReply
) {
    const { waCustomerGroupId, waCustomerId } = request.params;
    await deleteWaCustomerFromWaCustomerGroup(waCustomerGroupId, waCustomerId);
    reply.code(204).send();
}

export async function deleteWaCustomerGroupByIdHandler(
    request: FastifyRequest<{ Params: WaCustomerGroupsByIdParams }>,
    reply: FastifyReply
) {
    const { waCustomerGroupId } = request.params;
    await deleteWaCustomerGroupById(waCustomerGroupId);
    reply.code(204).send();
}

export async function updateWaCustomerGroupHandler(
    request: FastifyRequest<{ Params: WaCustomerGroupsByIdParams; Body: UpdateWaCustomerGroupInput }>,
    reply: FastifyReply
) {
    const { waCustomerGroupId } = request.params;
    const { body } = request;
    await updateWaCustomerGroup(waCustomerGroupId, body);
    reply.code(200).send();
}

export async function addWaCustomersToWaCustomerGroupHandler(
    request: FastifyRequest<{ Params: WaCustomerGroupsByIdParams; Body: AddWaCustomersToWaCustomerGroupInput }>,
    reply: FastifyReply
) {
    const { waCustomerGroupId } = request.params;
    const { body } = request;
    await addWaCustomersToGroup(waCustomerGroupId, body);
    reply.code(200).send();
}
