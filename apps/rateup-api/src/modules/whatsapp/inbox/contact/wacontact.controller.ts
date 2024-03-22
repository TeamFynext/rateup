import { FastifyReply, FastifyRequest } from "fastify";
import {
  createContact,
  getContactByPhoneNumberAndOrgId,
} from "../../../contact/contact.service";
import {
  addMultipleWaContacts,
  addSingleWaContact,
  getAllWaContactsByOrgId,
  getWaContactByContactId,
  getWaContactById,
} from "./wacontact.service";
import { ContactCore } from "../../../contact/contact.schema";
import { log } from "../../../../utils/logger";
import { AddMultipleWaContacts, ByWaContactId } from "./wacontact.schema";

//this function is dedicated for listening to webhook from whatsapp
export async function waContactHandler(contact: ContactCore, orgId: string) {
  try {
    const existingContact = await getContactByPhoneNumberAndOrgId(
      contact?.phone,
      orgId,
    );
    if (existingContact) {
      const existingWaContact = await getWaContactByContactId(
        existingContact.id,
      );
      if (existingWaContact) {
        return existingWaContact.id;
      } else {
        const addedWaContact = await addSingleWaContact(
          existingContact?.id,
          orgId,
        );
        if (addedWaContact) {
          return addedWaContact.id;
        }
      }
    } else {
      const addedContact = await createContact({ ...contact, orgId });
      if (addedContact) {
        const addedWaContact = await addSingleWaContact(
          addedContact?.id,
          orgId,
        );
        if (addedWaContact) {
          return addedWaContact.id;
        }
      }
    }
    return "";
  } catch (error) {
    log.error("Error in WaContactHandler: ", error);
  }
}

//this function is used to add wa contacts from dashboard
export async function addMultipleWaContactsHandler(
  request: FastifyRequest<{ Body: AddMultipleWaContacts }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { contactIds } = request.body;
    const addedContacts = await addMultipleWaContacts(contactIds, orgId);
    return reply.send(
      `${addedContacts.count} Contacts added successfully to the inbox`,
    );
  } catch (error) {
    if (error.code === "P2002") {
      return reply
        .status(400)
        .send("One or more contacts added already exists in inbox");
    } else {
      return reply.status(500).send("Something went wrong");
    }
  }
}

export async function getAllWaContactsByOrgHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const contacts = await getAllWaContactsByOrgId(orgId);
    return reply.status(200).send(contacts);
  } catch (error) {
    log.error("Error in getAllWaContactsByOrgHandler: ", error);
  }
}

export async function getWaContactByWaContactIdHandler(
  request: FastifyRequest<{ Params: ByWaContactId }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const contact = await getWaContactById(id);
    return reply.status(200).send(contact);
  } catch (error) {
    log.error("Error in getWaContactByContactIdHandler: ", error);
  }
}
