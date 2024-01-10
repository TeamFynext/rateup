import { FastifyRequest, FastifyReply } from "fastify";
import { ByContactIdParams, CreateContactInput, GetContactQuery, createMultipleContactInput, updateContactSchema } from "./contact.schema";
import { log } from "../../utils/logger";
import { createContact, createMultipleContacts, deleteContactById, getContactById, getContactsByOrgId, getContactsByTeamId, updateContactById } from "./contact.service";
import { ByTeamIdParams } from "../team/team.schema";
import { verifyRole } from "../../utils/auth";
import { Prisma, Role } from "@prisma/client";

export async function createContactHandler(
    request: FastifyRequest<{ Body: CreateContactInput }>,
    reply: FastifyReply
) {
    try {
        const contact = await createContact(request.body);
        reply.code(201).send(contact);
    } catch (error) {
        log.error(error);
        if(error instanceof Prisma.PrismaClientKnownRequestError){
            if (error.code === 'P2002') {
                reply.code(500).send({ error: "Contact already exist" });
              }
        }else {
            reply.code(500).send({ error: "Something went wrong" });
        }
    }
}

export async function createMultipleContactsHandler(
    request: FastifyRequest<{ Body: createMultipleContactInput }>,
    reply: FastifyReply
) {
    try {
        const existingcontacts = await getContactsByOrgId(request.user.orgId)
        const contacts = request.body;
        const newContacts = contacts.filter(c => !existingcontacts.some(contact => contact.teamId == c.teamId && (contact.phone && contact.phone == c.phone || contact.email && contact.email == c.email)));
        if(!newContacts.length) throw new Error("Contacts already Exist")
        const res = await createMultipleContacts(newContacts);
        reply.code(201).send(res)
    } catch (error) {
        log.error(error)
        reply.code(500).send({ error: error.message || "Something went wrong" })
    }
}

export async function getContactsHandler(
    request: FastifyRequest<{ Querystring: GetContactQuery }>,
    reply: FastifyReply
) {
    try {
        let res = null;
        if (request.query.contactId) {
            // get individual contact group by id
            res = await getContactById(request.query.contactId);
        } else if (request.query.teamId) {
            // get all contact groups for a specific team
            res = await getContactsByTeamId(request.query.teamId);
        } else {
            // get all contact groups for all teams
            if (verifyRole(request, reply, Role.SUPER_ADMIN)) {
                res = await getContactsByOrgId(request.user.orgId);
            }
        }
        reply.code(200).send(res);
    } catch (error) {
        log.error(error);
        reply.code(500).send({ error: "Something went wrong" });
    }
}

export async function deleteContactByIdHandler(
    request: FastifyRequest<{ Params: ByContactIdParams }>,
    reply: FastifyReply
) {
    try {
        const contact = await deleteContactById(request.params.contactId);
        return reply.code(200).send(contact);
    } catch (error) {
        log.error(error);
        reply.code(500).send({ error: "Something went wrong" });
    }
}

export async function updateContactByIdHandler(
    request: FastifyRequest<{ Params: ByContactIdParams, Body: updateContactSchema }>,
    reply: FastifyReply
) {
    try {
        const contact = await updateContactById(request.params.contactId, request.body);
        return reply.code(200).send(contact);
    } catch (error) {
        log.error(error);
        if(error instanceof Prisma.PrismaClientKnownRequestError){
            if (error.code === 'P2002') {
                reply.code(500).send({ error: "Contact already exist" });
              }
        }else {
            reply.code(500).send({ error: "Something went wrong" });
        }
    }
}