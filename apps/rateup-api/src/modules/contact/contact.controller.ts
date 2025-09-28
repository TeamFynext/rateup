import { FastifyRequest, FastifyReply } from "fastify";
import {
  ByContactIdParams,
  createMultipleContactInput,
  deleteManyContactsInput,
  updateContactSchema,
  ContactCore,
  PaginationQuery,
  UpdateContactLabelsSchema,
} from "./contact.schema";
import { log } from "../../utils/logger";
import {
  createContact,
  createMultipleContacts,
  deleteContactById,
  deleteManyContacts,
  getContactById,
  getContactsByOrgId,
  getExistingContactCountByPhno,
  importCSVContacts,
  updateContactById,
  updateContactLabelsById,
} from "./contact.service";
import { ContactGroupType, Prisma } from "../../../generated/prisma/client";
import { dataExtractFileMimeTypes } from "../fileUpload/fileUpload.schema";
import { isValidPhoneNumber } from "libphonenumber-js";
import {
  createLCustomer,
  handlePostRegisterAction,
  handleSendTemplate,
} from "../loyalty/customer/customer.service";
import {
  LoyaltyTemplateTypes,
  WaAutomatedReplyResponseType,
} from "../../types/enums";
import {
  getLoyaltyWaCommandByType,
  replacedContentByDynamicVariable,
} from "../loyalty/settings/settings.service";
import { sendTextMessage } from "../whatsapp/whatsappSurvey/wasurvey.service";

//used in zapier
export async function createContactHandler(
  request: FastifyRequest<{
    Body: ContactCore;
    Querystring: { orgId?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user ?? request.query; // orgId appended in query in case of zapier
    if (!isValidPhoneNumber(`+${request.body.phone}`))
      return reply.code(400).send({ error: "Phone number is not valid" });
    if (request.body.source === ContactGroupType.LOYALTY) {
      const contact = await createLCustomer({
        ...request.body,
        orgId,
      });
      reply.code(201).send(contact);
      const loyaltyWaCommand = await getLoyaltyWaCommandByType(
        LoyaltyTemplateTypes.CustomerRegistration,
        orgId,
      );
      if (loyaltyWaCommand) {
        const { responseType, waTemplateId, content } = loyaltyWaCommand;
        const dynamicVariables = [contact.name];
        if (responseType === WaAutomatedReplyResponseType.Template)
          await handleSendTemplate(
            waTemplateId,
            orgId,
            contact.phone,
            dynamicVariables,
          );
        else if (responseType === WaAutomatedReplyResponseType.Text) {
          const message = replacedContentByDynamicVariable(
            content,
            dynamicVariables,
          );
          await sendTextMessage(
            {
              phone: contact.phone,
              orgId,
            },
            null,
            message,
          );
        }
      }
      await handlePostRegisterAction(orgId, contact.id);
    } else {
      const contact = await createContact({ ...request.body, orgId });
      reply.code(201).send(contact);
    }
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

export async function createMultipleContactsHandler(
  request: FastifyRequest<{ Body: createMultipleContactInput }>,
  reply: FastifyReply,
) {
  try {
    const newContacts = request.body;
    const { orgId } = request.user;
    const filterNewContacts = await getExistingContactCountByPhno(
      newContacts.map((item) => item.phone),
      orgId,
    );
    if (filterNewContacts === (newContacts?.length ?? 0))
      throw new Error("All contacts already exist");
    const res = await createMultipleContacts(newContacts, orgId);
    reply.code(201).send(res);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: error.message || "Something went wrong" });
  }
}

export async function getAllContactsHandler(
  request: FastifyRequest<{ Querystring: PaginationQuery }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const contacts = await getContactsByOrgId(orgId, request.query);
    return reply.code(200).send(contacts);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function getContactByIdHandler(
  request: FastifyRequest<{ Params: ByContactIdParams }>,
  reply: FastifyReply,
) {
  try {
    const contact = await getContactById(request.params.contactId);
    return reply.code(200).send(contact);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function deleteContactByIdHandler(
  request: FastifyRequest<{ Params: ByContactIdParams }>,
  reply: FastifyReply,
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
  request: FastifyRequest<{
    Params: ByContactIdParams;
    Body: updateContactSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const contact = await updateContactById(
      request.params.contactId,
      request.body,
    );
    return reply.code(200).send(contact);
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

export async function updateContactLabelsByIdHandler(
  request: FastifyRequest<{
    Params: ByContactIdParams;
    Body: UpdateContactLabelsSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const contact = await updateContactLabelsById(
      request.params.contactId,
      request.body?.lifecycleId,
    );
    return reply.code(200).send(contact);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function deleteManyContactsHandler(
  request: FastifyRequest<{ Body: deleteManyContactsInput }>,
  reply: FastifyReply,
) {
  try {
    const { contactIds } = request.body;
    const res = await deleteManyContacts(contactIds);
    return reply.code(200).send(res);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function importCSVContactsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const file = await request.file();
    const orgId = request.user.orgId;
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
    const res: any = await importCSVContacts(file, orgId, tags, update);
    if (res.status === "error") {
      return reply.code(400).send({ error: "VALIDATION_ERR", data: res.data });
    }
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e?.message || "Something went wrong" });
  }
}
