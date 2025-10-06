import { Contact } from "../../../../../../../generated/prisma/client";
import {
  ContactCore,
  createMultipleContactInput,
  updateContactSchema,
} from "./contact.schema";
import { log } from "../../../../../../utils/logger";
import prisma from "../../../../../../utils/prisma";
import {
  addZapierTriggerToQueue,
  ZapierTriggers,
} from "../../../../../integrations/external/zapier/zapier.service";

export async function createContact(contact: ContactCore & { orgId: string }) {
  if (!contact.phone) {
    throw new Error("Phone must be provided");
  }
  const user = await prisma.contact.create({
    data: contact,
  });

  await addZapierTriggerToQueue(
    ZapierTriggers.CONTACT_CREATE,
    { [ZapierTriggers.CONTACT_CREATE]: user },
    user.orgId,
  );
  return user;
}

export async function createMultipleContacts(
  contacts: createMultipleContactInput,
  orgId: string,
) {
  const contactsData = contacts.map((contact) => ({ ...contact, orgId }));
  const result = await prisma.contact.createManyAndReturn({
    skipDuplicates: true,
    data: contactsData,
  });
  if (result?.length) {
    for (const contact of result)
      await addZapierTriggerToQueue(
        ZapierTriggers.CONTACT_CREATE,
        { [ZapierTriggers.CONTACT_CREATE]: contact },
        orgId,
      );
  }
  return result;
}

//used in zapier controller too
export async function getContactById(contactId: string) {
  const user = await prisma.contact.findUnique({
    where: {
      id: contactId,
    },
  });
  return user;
}

export async function getContactsByOrgId(orgId: string) {
  const users = await prisma.contact.findMany({
    where: {
      orgId,
    },
    include: {
      contactGroups: {
        select: {
          contactGroup: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  return users;
}

export async function getContactByPhoneNumberAndOrgId(
  phone: string,
  orgId: string,
) {
  const contact = await prisma.contact.findFirst({
    where: {
      phone,
      orgId,
    },
  });
  return contact;
}

export async function deleteContactById(contactId: string) {
  const user = await prisma.contact.delete({
    where: {
      id: contactId,
    },
  });
  await addZapierTriggerToQueue(
    ZapierTriggers.CONTACT_DELETED,
    { [ZapierTriggers.CONTACT_DELETED]: user },
    user.orgId,
  );
  return user;
}

export async function updateContactById(
  contactId: string,
  contact: updateContactSchema,
) {
  const user = await prisma.contact.update({
    where: {
      id: contactId,
    },
    data: {
      name: contact.name,
      phone: contact.phone,
      tags: contact.tags,
    },
  });
  return user;
}

export async function getOrCreateContactByPhone(
  phone: string,
  orgId: string,
  additionalData?: Partial<Contact>,
) {
  try {
    const contact = await prisma.contact.findFirst({
      // TODO: findout why findUnique is giving error
      where: {
        phone: phone,
        orgId: orgId,
      },
    });

    if (contact) {
      return contact;
    } else {
      const contact = await prisma.contact.create({
        data: {
          ...additionalData,
          phone,
          orgId,
        },
      });
      await addZapierTriggerToQueue(
        ZapierTriggers.CONTACT_CREATE,
        { [ZapierTriggers.CONTACT_CREATE]: contact },
        orgId,
      );
      return contact;
    }
  } catch (e) {
    log.error(e);
  }
}

export async function deleteManyContacts(contactIds: Array<string>) {
  const contacts = await prisma.contact.findMany({
    where: {
      id: {
        in: contactIds,
      },
    },
  });
  const res = await prisma.contact.deleteMany({
    where: {
      id: {
        in: contactIds,
      },
    },
  });
  for (const contact of contacts) {
    await addZapierTriggerToQueue(
      ZapierTriggers.CONTACT_DELETED,
      { [ZapierTriggers.CONTACT_DELETED]: contact },
      contact.orgId,
    );
  }
  return res;
}
