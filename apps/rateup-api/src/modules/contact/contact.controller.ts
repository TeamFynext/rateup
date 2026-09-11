import { FastifyRequest, FastifyReply } from "fastify";
import dayjs from "dayjs";
import { getMultipartFieldValue } from "../../utils/upload/validate.js";
import {
  ByContactIdParams,
  createMultipleContactInput,
  deleteManyContactsInput,
  updateContactSchema,
  ContactCore,
  PaginationQuery,
  UpdateContactLabelsSchema,
  CustomFieldSchema,
  BulkUpdateContactStatusSchema,
} from "./contact.schema.js";
import { ContactNotFoundError } from "./contact.errors.js";
import { log } from "../../utils/logger.js";
import {
  addCustomField,
  bulkUpdateWaMessageAssignStatus,
  createContact,
  createMultipleContacts,
  deleteContactById,
  deleteCustomField,
  deleteManyContacts,
  getContactById,
  getContactFullDetailsById,
  getContactsByOrgId,
  getCustomFields,
  getExistingContactCountByPhno,
  importCSVContacts,
  updateContactById,
  updateContactLabelsById,
  updateCustomField,
  updateLifecycleStageofContacts,
} from "./contact.service.js";
import { ContactGroupType, Prisma } from "../../../generated/prisma/client.js";
import { dataExtractFileMimeTypes } from "../fileUpload/fileUpload.schema.js";
import { isValidPhoneNumber } from "libphonenumber-js";
import { createLCustomer, handlePostRegisterAction, handleSendTemplate } from "./contact.utils.js";
import { LoyaltyTemplateTypes, WaAutomatedReplyResponseType } from "../../types/enums.js";
import {
  getLoyaltyWaCommandByType,
  replacedContentByDynamicVariable,
  richTextToPlainText,
} from "../loyalty/settings/settings.service.js";
import { sendTextMessage } from "../whatsapp/whatsappSurvey/wasurvey.service.js";
import prisma from "../../utils/prisma.js";
import {
  getSpreadsheetContentType,
  getSpreadsheetFilename,
  spreadsheetExportFormatSchema,
  SpreadsheetExportFormat,
} from "../../utils/spreadsheet.js";
import { write, type CellValue } from "hucre";
import { LifecycleIdParamSchema } from "../lifecycle/lifecycle.schema.js";
//used in zapier
function replyForError(reply: FastifyReply, error: unknown, context: string) {
  if (error instanceof ContactNotFoundError) {
    return reply.code(404).send({ error: error.message });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return reply.code(404).send({ error: "Contact not found" });
  }
  log.error({ err: error }, context);
  return reply.code(500).send({ error: "Something went wrong" });
}

export async function createContactHandler(
  request: FastifyRequest<{
    Body: ContactCore;
  }>,
  reply: FastifyReply,
) {
  try {
    // orgId appended in query in case of zapier; the zapier route declares no
    // querystring schema, so the query is only typed here.
    const { orgId } = request.user ?? (request.query as { orgId?: string });
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
        // Already validated by `isValidPhoneNumber` above, but the field is
        // nullable on `Contact` itself — guard rather than assert.
        if (!contact.phone) {
          throw new Error(`Newly created contact ${contact.id} has no phone number`);
        }
        const { responseType, waTemplateId, content } = loyaltyWaCommand;
        // `name` is nullable on Contact; it is passed through as-is, exactly as
        // it always has been.
        const dynamicVariables = [contact.name!];
        if (responseType === WaAutomatedReplyResponseType.Template)
          await handleSendTemplate(waTemplateId, orgId, contact.phone, dynamicVariables);
        else if (responseType === WaAutomatedReplyResponseType.Text) {
          const message = replacedContentByDynamicVariable(content, dynamicVariables);
          await sendTextMessage(
            {
              phone: contact.phone,
              orgId,
            },
            null,
            richTextToPlainText(message),
          );
        }
      }
      await handlePostRegisterAction(orgId, contact.id);
    } else {
      const contact = await createContact({ ...request.body, orgId }, request.userId);
      reply.code(201).send(contact);
    }
  } catch (error) {
    log.error(error);
    if (reply.sent) return;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      reply.code(400).send({ error: "Contact already exist" });
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
      newContacts.map((item) => item.phone).filter((phone): phone is string => !!phone),
      orgId,
    );
    if (filterNewContacts === (newContacts?.length ?? 0))
      throw new Error("All contacts already exist");
    const res = await createMultipleContacts(newContacts, orgId);
    reply.code(201).send(res);
  } catch (error) {
    log.error({ err: error }, "Error creating multiple contacts");
    reply
      .code(500)
      .send({ error: error instanceof Error ? error.message : "Something went wrong" });
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
    const contact = await getContactById(request.params.contactId, request.user.orgId);
    if (!contact) return reply.code(404).send({ error: "Contact not found" });
    return reply.code(200).send(contact);
  } catch (error) {
    return replyForError(reply, error, "Error reading a contact");
  }
}

export async function getContactFullDetailsByIdHandler(
  request: FastifyRequest<{ Params: ByContactIdParams }>,
  reply: FastifyReply,
) {
  try {
    const contact = await getContactFullDetailsById(request.params.contactId, request.user.orgId);
    if (!contact) return reply.code(404).send({ error: "Contact not found" });
    return reply.code(200).send(contact);
  } catch (error) {
    return replyForError(reply, error, "Error reading contact details");
  }
}

export async function deleteContactByIdHandler(
  request: FastifyRequest<{ Params: ByContactIdParams }>,
  reply: FastifyReply,
) {
  try {
    const contact = await deleteContactById(request.params.contactId, request.user.orgId);
    return reply.code(200).send(contact);
  } catch (error) {
    return replyForError(reply, error, "Error deleting a contact");
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
      request.user.orgId,
      request.body,
      request.userId,
    );
    return reply.code(200).send(contact);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return reply.code(400).send({ error: "Contact already exist" });
    }
    return replyForError(reply, error, "Error updating a contact");
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
      request.user.orgId,
      request.body?.lifecycleId,
    );
    return reply.code(200).send(contact);
  } catch (error) {
    return replyForError(reply, error, "Error updating a contact lifecycle");
  }
}

export async function deleteManyContactsHandler(
  request: FastifyRequest<{ Body: deleteManyContactsInput }>,
  reply: FastifyReply,
) {
  try {
    const { contactIds } = request.body;
    const res = await deleteManyContacts(contactIds, request.user.orgId);
    return reply.code(200).send(res);
  } catch (error) {
    return replyForError(reply, error, "Error deleting contacts");
  }
}

// Spreadsheet cells accept string/number/boolean/Date/null. Every scalar
// column selectable for export is one of those at the DB layer; anything else
// (shouldn't occur given the fixed `standardFields` allow-list) is stringified
// rather than dropped, so a future column addition fails loudly in the sheet
// instead of silently.
function toCellValue(value: unknown): CellValue {
  if (value === null) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date
  ) {
    return value;
  }
  return String(value);
}

export async function importCSVContactsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: "No file uploaded." });
    }
    const orgId = request.user.orgId;
    if (!dataExtractFileMimeTypes.includes(file.mimetype))
      return reply.code(400).send({ error: "This file type is not permitted." });
    const tags: string[] = [];
    let update = false;
    let hasHeaderRow = true;
    for (const key in file.fields) {
      const value = getMultipartFieldValue(file.fields[key]);
      if (key.startsWith("tags[")) {
        if (typeof value === "string") tags.push(value);
      } else if (key === "update") {
        update = value === "true";
      } else if (key === "hasHeaderRow") {
        hasHeaderRow = value !== "false";
      }
    }
    const res = await importCSVContacts(file, orgId, tags, update, undefined, hasHeaderRow);
    if (res.status === "error") {
      return reply
        .code(400)
        .send({ error: "VALIDATION_ERR", data: res.data, message: res.message });
    }
    reply.code(200).send(res);
  } catch (e) {
    log.error({ err: e }, "Error importing CSV contacts");
    reply.code(500).send({ error: e instanceof Error ? e.message : "Something went wrong" });
  }
}

export async function getCustomFieldHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { orgId } = request.user;
    const data = await getCustomFields(orgId);
    reply.code(200).send(data ?? { contactTags: [] });
  } catch (error) {
    log.error({ err: error }, "Error while getting custom fields");
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
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return reply.code(409).send({ message: "Field already exists" });
    }
    log.error({ err: e }, "Error creating custom field");
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
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return reply.code(409).send({ message: "Field already exists" });
    }
    log.error({ err: e }, "Error updating custom field");
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
    Body: { format?: SpreadsheetExportFormat; fields?: string[] };
  }>,
  reply: FastifyReply,
) {
  const parsedFormat = spreadsheetExportFormatSchema.safeParse(request.body?.format ?? "xlsx");
  if (!parsedFormat.success) {
    return reply.code(400).send({ error: 'Invalid export format. Use "xlsx" or "ods".' });
  }
  const format = parsedFormat.data;
  const { fields = ["id", "name", "phone"] } = request.body || {};
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
  const requestedStandardFields = fields.filter((f) => standardFields.includes(f));

  const PAGE_SIZE = 10000;
  let cursor: string | undefined = undefined;
  // The exported row shape is caller-defined at request time (`fields`), so it
  // can't be a fixed interface — same "dynamic legacy accumulator" exception
  // used elsewhere in this codebase for runtime-discriminated JSON shapes.
  const allContacts: Record<string, CellValue>[] = [];

  // The select is built dynamically from the requested field list; naming its
  // type explicitly (rather than letting it infer inline) avoids a circular
  // "implicitly has type any" inference on `contacts` below.
  const select: Prisma.ContactSelect = {
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
  };

  // Paginate through contacts
  while (true) {
    const contacts: Record<string, unknown>[] = await prisma.contact.findMany({
      where: { orgId },
      take: PAGE_SIZE,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      select,
    });

    if (contacts.length === 0) break;

    // Transform contacts to flatten custom fields. The row coming back from
    // Prisma is a dynamically-selected subset of scalar columns plus an
    // optional `customFields` relation array — everything else is a genuine
    // `CellValue` (string/number/boolean/Date/null), so it's copied over
    // as-is rather than stringified.
    const transformedContacts = contacts.map((contact) => {
      const result: Record<string, CellValue> = {};
      for (const [key, value] of Object.entries(contact)) {
        if (key === "customFields") continue;
        result[key] = toCellValue(value);
      }

      if (Array.isArray(contact.customFields)) {
        // Add custom field values to the contact object
        for (const cfv of contact.customFields as { value: string; field: { name: string } }[]) {
          if (customFields.includes(cfv.field.name)) {
            result[cfv.field.name] = cfv.value;
          }
        }
      }

      // Ensure all requested custom fields are present (with empty string if missing)
      for (const fieldName of customFields) {
        if (!(fieldName in result)) {
          result[fieldName] = "";
        }
      }

      const createdAt = result.createdAt;
      if (createdAt instanceof Date) {
        result.createdAt = dayjs(createdAt).format("DD-MM-YYYY hh:mm A");
      }

      return result;
    });

    allContacts.push(...transformedContacts);
    const lastId = contacts.at(-1)?.id;
    if (typeof lastId !== "string") {
      throw new Error("Contact row is missing its id column");
    }
    cursor = lastId;
  }

  const buffer = await write({
    sheets: [
      {
        name: "Contacts",
        columns: fields.map((f) => ({ header: f, key: f, autoWidth: true })),
        data: allContacts.map((row) => Object.fromEntries(fields.map((f) => [f, row[f] ?? ""]))),
      },
    ],
    format,
  });

  reply
    .header("Content-Type", getSpreadsheetContentType(format))
    .header(
      "Content-Disposition",
      `attachment; filename="${getSpreadsheetFilename(`contacts_${orgId}`, format)}"`,
    )
    .send(buffer);
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
      request.user.orgId,
      request.body.contactIds,
    );
    reply.send(res);
  } catch (e) {
    return replyForError(reply, e, "Error updating lifecycle stage of contacts");
  }
}

export async function bulkUpdateWaMessageAssignStatusHandler(
  request: FastifyRequest<{
    Body: BulkUpdateContactStatusSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { contactIds, waMessageAssignStatus, messageId, resolutionResult } = request.body;

    const contacts = await bulkUpdateWaMessageAssignStatus(
      contactIds,
      request.user.orgId,
      waMessageAssignStatus,
      request.userId,
      messageId,
      resolutionResult,
    );

    return reply.code(200).send({
      message: "Contacts updated successfully",
      updatedCount: contacts.length,
      contacts,
    });
  } catch (error) {
    log.error(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return reply.code(400).send({
          error: "Duplicate record conflict",
        });
      }
    }

    return reply.code(500).send({
      error: "Something went wrong",
    });
  }
}
