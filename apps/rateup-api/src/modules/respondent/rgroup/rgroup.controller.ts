import { FastifyReply, FastifyRequest } from "fastify";
import { addRespondentsToGroup, createRGroupFromPhoneNumbers, deleteRGroupById, deleteRespondentFromRGroup, getRGroupSurveyHistory, getRGroups, getRespondentsByRGroupId, updateRGroup } from "./rgroup.service";
import { AddRespondentsToRGroupInput, CreateRGroupInput, DeleteRespondentFromRGroupParams, RGroupsByIdParams, UpdateRgroupInput } from "./rgroup.schema";
import Session from "supertokens-node/recipe/session";
import { getTeamsByUserId } from "../../team/team.service";

export async function createRGroupFromPhoneNumbersHandler(
    request: FastifyRequest<{ Body: CreateRGroupInput }>,
    reply: FastifyReply
) {
    const { body } = request;
    await createRGroupFromPhoneNumbers(body);
    reply.code(201).send();
}

export async function getAllRGroupsHandler(request: FastifyRequest, reply: FastifyReply) {

    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();
    const teams = await getTeamsByUserId(userId);
    const teamIds = teams.map((team) => team.teamId);

    const rgroups = await getRGroups(teamIds);
    reply.code(200).send(rgroups);
}

export async function getRGroupsByTeamIdHandler(
    request: FastifyRequest<{ Params: { teamId: string } }>,
    reply: FastifyReply
) {
    const { teamId } = request.params;
    const rgroups = await getRGroups([teamId]);
    reply.code(200).send(rgroups);
}

export async function getRespondentsByRGroupIdHandler(request: FastifyRequest<{ Params: RGroupsByIdParams }>, reply: FastifyReply) {
    const { rgroupId } = request.params;
    const rgroups = await getRespondentsByRGroupId(rgroupId);
    reply.code(200).send(rgroups);
}

export async function getRGroupsSurveyHistoryByGroupIdHandler(
    request: FastifyRequest<{ Params: RGroupsByIdParams }>,
    reply: FastifyReply
) {
    const { rgroupId } = request.params;
    const surveyHistory = await getRGroupSurveyHistory(rgroupId);
    reply.send(surveyHistory);
}

export async function deleteRespondentFromRGroupHandler(
    request: FastifyRequest<{ Params: DeleteRespondentFromRGroupParams }>,
    reply: FastifyReply
) {
    const { rgroupId, respondentId } = request.params;
    await deleteRespondentFromRGroup(rgroupId, respondentId);
    reply.code(204).send();
}

export async function deleteRGroupByIdHandler(
    request: FastifyRequest<{ Params: RGroupsByIdParams }>,
    reply: FastifyReply
) {
    const { rgroupId } = request.params;
    await deleteRGroupById(rgroupId);
    reply.code(204).send();
}

export async function updateRGroupHandler(
    request: FastifyRequest<{ Params: RGroupsByIdParams; Body: UpdateRgroupInput }>,
    reply: FastifyReply
) {
    const { rgroupId } = request.params;
    const { body } = request;
    await updateRGroup(rgroupId, body);
    reply.code(200).send();
}

export async function addRespondentsToRGroupHandler(
    request: FastifyRequest<{ Params: RGroupsByIdParams; Body: AddRespondentsToRGroupInput }>,
    reply: FastifyReply
) {
    const { rgroupId } = request.params;
    const { body } = request;
    await addRespondentsToGroup(rgroupId, body);
    reply.code(200).send();
}
