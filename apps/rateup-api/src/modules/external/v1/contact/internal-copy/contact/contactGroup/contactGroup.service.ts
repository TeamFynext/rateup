import { log } from "../../../../../../../utils/logger";
import prisma from "../../../../../../../utils/prisma";
import {
  addZapierTriggerToQueue,
  ZapierTriggers,
} from "../../../../../../integrations/external/zapier/zapier.service";
import {
  AddNewContactsToGroupInput,
  CreateContactGroupInput,
  RemoveGroupContactsSchema,
  UpdateContactGroupInput,
} from "./contactGroup.schema";

export async function getContactGroupById(contactGroupId: string) {
  const contactGroup = await prisma.contactGroup.findUnique({
    where: {
      id: contactGroupId,
    },
    include: {
      team: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          contacts: true,
        },
      },
    },
  });
  return contactGroup;
}
export async function getContactGroupsByTeamId(teamId: string) {
  const contactGroups = await prisma.contactGroup.findMany({
    where: {
      teamId,
    },
    include: {
      team: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          contacts: true,
        },
      },
    },
  });
  return contactGroups;
}
export async function getContactGroupsByOrgId(orgId: string) {
  const contactGroups = await prisma.contactGroup.findMany({
    where: {
      team: {
        orgId,
      },
    },
    include: {
      team: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          contacts: true,
        },
      },
    },
  });
  return contactGroups;
}
export async function createContactGroup(
  contactGroup: CreateContactGroupInput,
) {
  return await prisma.contactGroup.create({
    data: {
      name: contactGroup.name,
      icon: contactGroup.icon,
      teamId: contactGroup.teamId,
    },
  });
}

export async function getContactsByContactGroupId(contactGroupId: string) {
  const group = await prisma.contactGroup.findUnique({
    where: {
      id: contactGroupId,
    },
    include: {
      contacts: {
        include: {
          contact: true,
        },
      },
    },
  });

  return group.contacts.map((c) => c.contact);
}

export async function addNewContactsToGroup(
  contactGroupId: string,
  contacts: AddNewContactsToGroupInput,
  orgId: string,
) {
  const contactGroup = await getContactGroupById(contactGroupId);
  if (!contactGroup) {
    throw new Error("Contact group not found");
  }
  // TODO: we could create uuid manually and skip the findMany query.
  // TODO: check if below query can be optimized
  let newContacts;
  await prisma.$transaction(async (tx) => {
    // create contacts
    newContacts = await tx.contact.createManyAndReturn({
      skipDuplicates: true,
      data: contacts.map((contact) => ({
        ...contact,
        orgId,
      })),
    });

    const createdContacts = await tx.contact.findMany({
      where: {
        OR: [
          {
            phone: {
              in: contacts
                .map((contact) => contact.phone)
                .filter((phone) => phone),
            },
          },
        ],
        orgId,
      },
    });
    // create contact group map
    await tx.contactGroupMap.createMany({
      skipDuplicates: true,
      data: createdContacts.map((contact) => ({
        contactId: contact.id,
        contactGroupId,
      })),
    });
  });
  if (newContacts.length) {
    for (const contact of newContacts)
      await addZapierTriggerToQueue(
        ZapierTriggers.CONTACT_CREATE,
        { contact },
        orgId,
      );
  }
}

export async function addExistingContactsToGroup(
  contactGroupId: string,
  contactIds: Array<string>,
) {
  const contactGroup = await getContactGroupById(contactGroupId);
  if (!contactGroup) {
    throw new Error("Contact group not found");
  }
  // TODO: check if contactIds belong to the same team?
  return await prisma.contactGroupMap.createMany({
    data: contactIds.map((contactId) => ({ contactId, contactGroupId })),
  });
}

export async function updateContactGroup(
  contactGroupId: string,
  data: UpdateContactGroupInput,
) {
  return await prisma.contactGroup.update({
    where: {
      id: contactGroupId,
    },
    data,
  });
}

export async function deleteContactGroup(contactGroupId: string) {
  return await prisma.contactGroup.delete({
    where: {
      id: contactGroupId,
    },
  });
}

export async function removeContactsFromGroup(
  contactGroupId: string,
  contactIds: RemoveGroupContactsSchema,
) {
  log.trace("Removing contacts from group %s %o", contactGroupId, contactIds);
  return await prisma.contactGroupMap.deleteMany({
    where: {
      contactGroupId,
      contactId: {
        in: contactIds,
      },
    },
  });
}

export async function addExistingContactsToMultipleGroups(
  contactIds: Array<string>,
  contactGroupIds: Array<string>,
) {
  return await Promise.all(
    contactGroupIds.map(async (contactGroupId) => {
      const existingContacts = await prisma.contactGroupMap.findMany({
        where: {
          contactGroupId,
        },
      });
      const remainingContacts = contactIds.filter(
        (id) => !existingContacts?.some((c) => c.contactId === id),
      );
      if (remainingContacts?.length) {
        await prisma.contactGroupMap.createMany({
          data: remainingContacts.map((contactId) => ({
            contactId,
            contactGroupId,
          })),
        });
      }
    }),
  );
}

export async function deleteManyContactGroups(groupIds: string[]) {
  return await prisma.contactGroup.deleteMany({
    where: {
      id: {
        in: groupIds,
      },
    },
  });
}
