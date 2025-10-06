import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../../utils/logger";
import {
  AddExistingContactsToGroupInput,
  AddExistingContactsToMultipleGroupsInput,
  AddNewContactsToGroupInput,
  ByContactGroupIdParams,
  ContactGroupType,
  CreateContactGroupInput,
  DeleteManyGroupsInput,
  GetContactGroupsQuery,
  RemoveGroupContactsSchema,
  UpdateContactGroupInput,
} from "./contactGroup.schema";
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
  getContactsByContactGroupIdWithPagination,
} from "./contactGroup.service";
import { verifyRole } from "../../../utils/auth";
import { Prisma, Role } from "../../../../generated/prisma/client";
import { dataExtractFileMimeTypes } from "../../fileUpload/fileUpload.schema";
import { createMultipleContacts, importCSVContacts } from "../contact.service";
import { PaginationQuery } from "../contact.schema";
import {
  addNewCustomersToGroup,
  createMultipleCustomers,
} from "../../loyalty/customer/customer.service";

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
        res = await getContactGroupsByOrgId(
          request.user.orgId,
          request.query.type,
        );
      }
    }
    reply.code(200).send(res);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function getContactsByContactGroupIdHandler(
  request: FastifyRequest<{
    Params: ByContactGroupIdParams;
    Querystring: PaginationQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const contacts = await getContactsByContactGroupIdWithPagination(
      request.params.contactGroupId,
      request.query,
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
      request.body.isCustomer,
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
    let contactGroup;
    if (request.body.find((c) => c.source === ContactGroupType.LOYALTY)) {
      await createMultipleCustomers(request.body, orgId);
      contactGroup = await addNewCustomersToGroup(
        request.params.contactGroupId,
        request.body,
        orgId,
      );
    } else {
      await createMultipleContacts(request.body, orgId);
      contactGroup = await addNewContactsToGroup(
        request.params.contactGroupId,
        request.body,
        orgId,
      );
    }
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

export async function addNewContactsfromCSVToGroupHandler(
  request: FastifyRequest<{ Params: ByContactGroupIdParams }>,
  reply: FastifyReply,
) {
  try {
    const file = await request.file();
    const { orgId } = request.user;
    const contactGroupId = request.params.contactGroupId;
    if (!dataExtractFileMimeTypes.includes(file?.mimetype))
      return reply
        .code(400)
        .send({ error: "This file type is not permitted." });
    const tags = [];
    let update = false;
    for (const key in file?.fields) {
      if (key.startsWith("tags[")) {
        tags.push(file?.fields?.[key]?.["value"]);
      } else if (key === "update") {
        update = file?.fields?.[key]?.["value"] === "true";
      }
    }
    const res: any = await importCSVContacts(
      file,
      orgId,
      tags,
      update,
      contactGroupId,
    );
    if (res.status === "error") {
      return reply.code(400).send({ error: "VALIDATION_ERR", data: res.data });
    }
    reply.code(200).send(res);
  } catch (err) {
    log.error(err);
    reply.code(500).send({ error: err?.message || "Something went wrong" });
  }
}
