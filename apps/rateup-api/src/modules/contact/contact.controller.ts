import { FastifyRequest, FastifyReply } from "fastify";
import {
  ByContactIdParams,
  createMultipleContactInput,
  deleteManyContactsInput,
  updateContactSchema,
  ContactCore,
  PaginationQuery,
  UpdateContactLabelsSchema,
  CustomFieldSchema,
} from "./contact.schema";
import { log } from "../../utils/logger";
import {
  addCustomField,
  createContact,
  createMultipleContacts,
  deleteContactById,
  deleteCustomField,
  deleteManyContacts,
  getContactById,
  getContactsByOrgId,
  getCustomFields,
  getExistingContactCountByPhno,
  importCSVContacts,
  updateContactById,
  updateContactLabelsById,
  updateCustomField,
  updateLifecycleStageofContacts,
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
import prisma from "../../utils/prisma";
import Papa from "papaparse";
import xlsx from "node-xlsx";
import { LifecycleIdParamSchema } from "../lifecycle/lifecycle.schema";
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
      const contact = await createContact(
        { ...request.body, orgId },
        request.userId,
      );
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
    Body: Required<updateContactSchema>;
  }>,
  reply: FastifyReply,
) {
  try {
    const contact = await updateContactById(
      request.params.contactId,
      request.body,
      request.userId,
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

export async function getCustomFieldHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const data = await getCustomFields(orgId);
    reply.code(200).send(data ?? { contactTags: [] });
  } catch (error) {
    log.error("Error while getting custom fields", error);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function addCustomFieldHandler(
  request: FastifyRequest<{ Body: Required<CustomFieldSchema> }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await addCustomField(orgId, request.body);
    reply.code(200).send(res);
  } catch (e) {
    if (e.code === "P2002") {
      return reply.code(409).send({ message: "Field already exists" });
    }
    log.error(e);
    reply.code(500).send({ message: "Error creating field" });
  }
}

export async function updateCustomFieldHandler(
  request: FastifyRequest<{
    Body: CustomFieldSchema;
    Params: { fieldId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { fieldId } = request.params;
    const res = await updateCustomField(orgId, fieldId, request.body);
    reply.code(200).send(res);
  } catch (e) {
    if (e.code === "P2002") {
      return reply.code(409).send({ message: "Field already exists" });
    }
    log.error(e);
    reply.code(500).send({ message: "Error updating field" });
  }
}

export async function deleteCustomFieldHandler(
  request: FastifyRequest<{ Params: { fieldId: string } }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { fieldId } = request.params;
    const res = await deleteCustomField(orgId, fieldId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error deleting field" });
  }
}

export async function exportContactHandler(
  request: FastifyRequest<{
    Body: { type?: "csv" | "xlsx"; fields?: string[] };
  }>,
  reply: FastifyReply,
) {
  const { type = "csv", fields = ["id", "name", "phone"] } = request.body || {};
  const { orgId } = request.user;
  if (!orgId) {
    reply.code(400).send({ error: "orgId is required" });
    return;
  }

  const standardFields = [
    "id",
    "name",
    "phone",
    "blockedOnWhatsApp",
    "other",
    "source",
    "consent",
    "createdAt",
  ];
  const customFields = fields.filter((f) => !standardFields.includes(f));
  const requestedStandardFields = fields.filter((f) =>
    standardFields.includes(f),
  );

  const PAGE_SIZE = 10000;
  let cursor = undefined;
  const allContacts = [];

  // Paginate through contacts
  while (true) {
    const contacts = await prisma.contact.findMany({
      where: { orgId },
      take: PAGE_SIZE,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ...Object.fromEntries(requestedStandardFields.map((f) => [f, true])),
        ...(customFields.length > 0 && {
          customFields: {
            select: {
              value: true,
              field: {
                select: {
                  name: true,
                },
              },
            },
          },
        }),
      },
    });

    if (contacts.length === 0) break;

    // Transform contacts to flatten custom fields
    const transformedContacts = contacts.map((contact) => {
      const result = { ...contact };

      if (contact.customFields) {
        // Add custom field values to the contact object
        for (const cfv of contact.customFields) {
          if (customFields.includes(cfv.field.name)) {
            result[cfv.field.name] = cfv.value;
          }
        }
        // Remove the nested customFields from result
        delete result.customFields;
      }

      // Ensure all requested custom fields are present (with empty string if missing)
      for (const fieldName of customFields) {
        if (!(fieldName in result)) {
          result[fieldName] = "";
        }
      }

      return result;
    });

    allContacts.push(...transformedContacts);
    cursor = contacts.at(-1).id;
  }

  // --- CSV export ---
  if (type === "csv") {
    const csv = Papa.unparse(allContacts, { columns: fields });
    reply
      .header("Content-Type", "text/csv")
      .header(
        "Content-Disposition",
        `attachment; filename="contacts_${orgId}.csv"`,
      )
      .send(csv);
    return;
  }

  // --- Excel export ---
  if (type === "xlsx") {
    const sheetData = [
      fields, // headers
      ...allContacts.map((row) => fields.map((f) => row[f] ?? "")),
    ];
    const buffer = xlsx.build([
      { name: "Contacts", data: sheetData, options: {} },
    ]);

    reply
      .header(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      )
      .header(
        "Content-Disposition",
        `attachment; filename="contacts_${orgId}.xlsx"`,
      )
      .send(buffer);
    return;
  }

  reply.code(400).send({ error: 'Invalid export type. Use "csv" or "excel".' });
}

export async function updateLifecycleStageofContactsHandler(
  request: FastifyRequest<{
    Body: deleteManyContactsInput;
    Params: LifecycleIdParamSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await updateLifecycleStageofContacts(
      request.params.lifecycleId,
      request.body.contactIds,
    );
    reply.send(res);
  } catch (e) {
    log.error(e);
    reply
      .code(500)
      .send({ message: "Error updating lifecycle stage of contacts" });
  }
}
