import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../../utils/logger";
import { AddExistingContactsToGroupInput, AddNewContactsToGroupInput, ByContactGroupIdParams, CreateContactGroupInput, GetContactGroupsQuery, UpdateContactGroupInput } from "./contactGroup.schema";
import { createContactGroup, getContactGroupById, addExistingContactsToGroup, addNewContactsToGroup, updateContactGroup, deleteContactGroup, getContactGroupsByTeamId, getContactGroupsByOrgId, getContactsByContactGroupId } from "./contactGroup.service";
import { verifyRole } from "../../../utils/auth";
import { Role } from "@prisma/client";

export async function getContactGroupsHandler(
    request: FastifyRequest<{
        Querystring: GetContactGroupsQuery
    }>,
    reply: FastifyReply
) {
    // TODO: auth
    try {
        let res = null;
        if (request.query.contactGroupId) {
            // get individual contact group by id
            res = await getContactGroupById(request.query.contactGroupId);
        } else if (request.query.teamId) {
            // get all contact groups for a specific team
            res = await getContactGroupsByTeamId(request.query.teamId);
        } else {
            // get all contact groups for all teams
            if (verifyRole(request, reply, Role.SUPER_ADMIN)) {
                res = await getContactGroupsByOrgId(request.user.orgId);
            }
        }
        reply.code(200).send(res);
    } catch (error) {
        log.error(error);
        reply.code(500).send({ error: "Something went wrong" });
    }
}

export async function getContactsByContactGroupIdHandler(
    request: FastifyRequest<{ Params: ByContactGroupIdParams}>,
    reply: FastifyReply
) {
    try{
        const contacts = await getContactsByContactGroupId(request.params.contactGroupId)
        reply.code(200).send(contacts)
    } catch (error) {
        log.error(error);
        reply.code(500).send({ error: "Something went wrong" }); 
    }
}

export async function createContactGroupHandler(
    request: FastifyRequest<{ Body: CreateContactGroupInput }>,
    reply: FastifyReply
) {
    try {
        const contactGroup = await createContactGroup(request.body);
        reply.code(201).send(contactGroup);
    } catch (error) {
        log.error(error);
        reply.code(500).send({ error: "Something went wrong" });
    }
}

export async function addExistingContactsToGroupHandler(
    request: FastifyRequest<{ Body: AddExistingContactsToGroupInput, Params: ByContactGroupIdParams }>,
    reply: FastifyReply
) {
    try {
        const contactGroup = await addExistingContactsToGroup(request.params.contactGroupId, request.body.contactIds);
        reply.code(200).send(contactGroup);
    } catch (error) {
        log.error(error);
        reply.code(500).send({ error: "Something went wrong" });
    }
}

export async function addNewContactsToGroupHandler(
    request: FastifyRequest<{ Body: AddNewContactsToGroupInput, Params: ByContactGroupIdParams }>,
    reply: FastifyReply
) {
    try {
        const contactGroup = await addNewContactsToGroup(request.params.contactGroupId, request.body);
        reply.code(200).send(contactGroup);
    } catch (error) {
        log.error(error);
        reply.code(500).send({ error: "Something went wrong" });
    }
}

export async function updateContactGroupHandler(
    request: FastifyRequest<{ Body: UpdateContactGroupInput, Params: ByContactGroupIdParams }>,
    reply: FastifyReply
) {
    try {
        const contactGroup = await updateContactGroup(request.params.contactGroupId, request.body);
        reply.code(200).send(contactGroup);
    } catch (error) {
        log.error(error);
        reply.code(500).send({ error: "Something went wrong" });
    }
}

export async function deleteContactGroupHandler(
    request: FastifyRequest<{ Params: ByContactGroupIdParams }>,
    reply: FastifyReply
) {
    try {
        const contactGroup = await deleteContactGroup(request.params.contactGroupId);
        reply.code(200).send(contactGroup);
    } catch (error) {
        log.error(error);
        reply.code(500).send({ error: "Something went wrong" });
    }
}

