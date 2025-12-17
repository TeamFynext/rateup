import { FastifyRequest, FastifyReply } from "fastify";
import {
  AddExistingContactsToGroupInput,
  AddExistingContactsToMultipleGroupsInput,
  AddNewContactsToGroupInput,
  ByContactGroupIdParams,
  CreateContactGroupInput,
  DeleteManyGroupsInput,
  GetContactGroupsQuery,
  RemoveGroupContactsSchema,
  UpdateContactGroupInput,
} from "./contactGroup.schema.js";
import {
  createContactGroup,
  getContactGroupById,
  addExistingContactsToGroup,
  addNewContactsToGroup,
  updateContactGroup,
  deleteContactGroup,
  getContactGroupsByTeamId,
  getContactGroupsByOrgId,
  getContactsByContactGroupId,
  removeContactsFromGroup,
  addExistingContactsToMultipleGroups,
  deleteManyContactGroups,
} from "./contactGroup.service.js";
import {
  Prisma,
  Role,
} from "../../../../../../../../generated/prisma/client.js";
import { verifyRole } from "../../../../../../../utils/auth.js";
import { log } from "../../../../../../../utils/logger.js";

export async function getContactGroupsHandler(
  request: FastifyRequest<{
    Querystring: GetContactGroupsQuery;
  }>,
  reply: FastifyReply,
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
  request: FastifyRequest<{ Params: ByContactGroupIdParams }>,
  reply: FastifyReply,
) {
  try {
    const contacts = await getContactsByContactGroupId(
      request.params.contactGroupId,
    );
    reply.code(200).send(contacts);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function createContactGroupHandler(
  request: FastifyRequest<{ Body: CreateContactGroupInput }>,
  reply: FastifyReply,
) {
  try {
    const contactGroup = await createContactGroup(request.body);
    reply.code(201).send(contactGroup);
  } catch (error) {
    log.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        reply.code(500).send({
          error:
            "Contact group with this name already exist in the provided team",
        });
      }
    }
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function addExistingContactsToGroupHandler(
  request: FastifyRequest<{
    Body: AddExistingContactsToGroupInput;
    Params: ByContactGroupIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const contactGroup = await addExistingContactsToGroup(
      request.params.contactGroupId,
      request.body.contactIds,
      request.user.orgId,
    );
    reply.code(200).send(contactGroup);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function addNewContactsToGroupHandler(
  request: FastifyRequest<{
    Body: AddNewContactsToGroupInput;
    Params: ByContactGroupIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const contactGroup = await addNewContactsToGroup(
      request.params.contactGroupId,
      request.body,
      orgId,
    );
    reply.code(200).send(contactGroup);
  } catch (error) {
    log.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        reply.code(500).send({ error: "Contact already exist" });
      }
    } else {
      reply.code(500).send({ error: "Something went wrong" });
    }
  }
}

export async function updateContactGroupHandler(
  request: FastifyRequest<{
    Body: UpdateContactGroupInput;
    Params: ByContactGroupIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const contactGroup = await updateContactGroup(
      request.params.contactGroupId,
      request.body,
    );
    reply.code(200).send(contactGroup);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function deleteContactGroupHandler(
  request: FastifyRequest<{ Params: ByContactGroupIdParams }>,
  reply: FastifyReply,
) {
  try {
    const contactGroup = await deleteContactGroup(
      request.params.contactGroupId,
    );
    reply.code(200).send(contactGroup);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function removeContactsFromGroupHandler(
  request: FastifyRequest<{
    Params: ByContactGroupIdParams;
    Body: RemoveGroupContactsSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const contacts = await removeContactsFromGroup(
      request.params.contactGroupId,
      request.body,
    );
    reply.code(200).send(contacts);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: `Something went wrong: ${error}` });
  }
}

export async function addExistingContactsToMultipleGroupsHandler(
  request: FastifyRequest<{ Body: AddExistingContactsToMultipleGroupsInput }>,
  reply: FastifyReply,
) {
  try {
    const { contactIds, contactGroupIds } = request.body;
    const contactGroup = await addExistingContactsToMultipleGroups(
      contactIds,
      contactGroupIds,
      request.user.orgId,
    );
    reply.code(200).send(contactGroup);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function deleteManyContactGroupsHandler(
  request: FastifyRequest<{ Body: DeleteManyGroupsInput }>,
  reply: FastifyReply,
) {
  try {
    const { contactGroupIds } = request.body;
    const contactGroup = await deleteManyContactGroups(contactGroupIds);
    reply.code(200).send(contactGroup);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}
