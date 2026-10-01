import { isValidPhoneNumber } from "libphonenumber-js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { ContactGroupNotFoundError } from "./contactGroup.errors.js";
export { ContactGroupNotFoundError };
import type {
  Contact,
  ContactGroup,
  ContactGroupMap,
  Prisma,
} from "../../../../generated/prisma/client.js";
import {
  AddNewContactsToGroupInput,
  CreateContactGroupInput,
  PaginationQuery,
  RemoveGroupContactsSchema,
  UpdateContactGroupInput,
} from "./contactGroup.schema.js";
import { BATCH_SIZE } from "../../../utils/constants/constants.js";
import { ContactGroupType } from "../../../../generated/prisma/client.js";
import { WHATSAPP_CONTACT_CHANNEL, whatsappContactWhere } from "../contact.channel.js";
import { buildContactListWhere } from "../contact.listQuery.js";
import type { PaginationQuery as ContactListQuery } from "../contact.schema.js";
import {
  addZapierTriggerToQueue,
  ZapierTriggers,
} from "../../integrations/external/zapier/zapier.service.js";

export async function getContactGroupById(contactGroupId: string, orgId: string) {
  const contactGroup = await prisma.contactGroup.findFirst({
    where: {
      id: contactGroupId,
      team: { orgId },
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
//also used in zapier controller
export async function getContactGroupsByTeamId(
  teamId: string,
  orgId: string,
  contactChannel?: string,
) {
  // Callers that can only reach one channel (the campaign participant picker, which is
  // WhatsApp-only) pass it here so `_count.contacts` reports the members they can actually use.
  // const contactFilter =
  //   contactChannel === WHATSAPP_CONTACT_CHANNEL ? { contact: whatsappContactWhere } : undefined;
  const contactGroups = await prisma.contactGroup.findMany({
    where: {
      teamId,
      team: { orgId },
      type: "NORMAL",
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
          // contacts: contactFilter ? { where: contactFilter } : true,
        },
      },
    },
  });

  return contactGroups;
}
/**
 * For each group in a team, how many of its WhatsApp members match a contacts list query — what
 * the campaign picker would add from that group with those filters on. A separate count rather
 * than a filtered `_count` on the group list, which stays the plain member count.
 */
export async function countMatchingGroupMembers(
  teamId: string,
  orgId: string,
  query: ContactListQuery,
) {
  const rows = await prisma.contactGroupMap.groupBy({
    by: ["contactGroupId"],
    where: {
      contactGroup: { teamId, team: { orgId } },
      contact: { ...whatsappContactWhere, ...buildContactListWhere(orgId, query) },
    },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((row) => [row.contactGroupId, row._count._all]));
}
//also used in zapier controller
export async function getContactGroupsByOrgId(orgId: string, type?: ContactGroupType) {
  const contactGroups = await prisma.contactGroup.findMany({
    where: {
      team: {
        orgId,
      },
      type,
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
export async function createContactGroup(contactGroup: CreateContactGroupInput, orgId: string) {
  const team = await prisma.team.findFirst({
    where: { id: contactGroup.teamId, orgId },
    select: { id: true },
  });
  if (!team) throw new ContactGroupNotFoundError("Team not found");

  return await prisma.contactGroup.create({
    data: {
      name: contactGroup.name,
      icon: contactGroup.icon,
      teamId: contactGroup.teamId,
      type: contactGroup.type,
      tags: contactGroup.tags,
    },
  });
}

export async function getContactsByContactGroupId(contactGroupId: string, orgId: string) {
  const group = await prisma.contactGroup.findFirst({
    where: {
      id: contactGroupId,
      team: { orgId },
    },
    include: {
      contacts: {
        include: {
          contact: true,
        },
      },
    },
  });
  if (!group) {
    throw new ContactGroupNotFoundError(`Contact group ${contactGroupId} not found`);
  }

  return group.contacts.map((c) => c.contact);
}
export async function getContactsByContactGroupIdWithPagination(
  contactGroupId: string,
  orgId: string,
  query?: PaginationQuery,
) {
  const {
    page = 0,
    limit = 500,
    search = "",
    sort = "createdAt",
    desc = "asc",
    ...filter
  } = query ?? {
    page: 0,
    limit: 500,
    search: "",
    sort: "createdAt",
    desc: "asc",
  };
  // Each branch below builds a differently-shaped Prisma filter fragment
  // (string contains, boolean equals, a relation `some`, ...).
  let filterData: Prisma.ContactWhereInput[] = [];
  if (filter) {
    // The remaining query keys are the filter; values arrive as strings or numbers.
    const params = new URLSearchParams(
      Object.entries(filter).flatMap(([key, value]) =>
        value === undefined ? [] : [[key, String(value)] as [string, string]],
      ),
    );
    for await (const [key, value] of params.entries()) {
      if (["name", "phone"].includes(key)) {
        filterData.push({
          [key]: {
            contains: value,
            mode: "insensitive",
          },
        });
      } else if ("consent" === key) {
        filterData.push({
          [key]: {
            equals: value?.toLocaleLowerCase() === "true",
          },
        });
      } else if ("createdAt" === key) {
        // `createdAt` is a DateTime column: the operator is `equals` (not `equal`, which
        // Prisma rejects outright) and it takes a Date, not a string with a text `mode`.
        filterData.push({
          createdAt: {
            equals: new Date(value),
          },
        });
      } else if ("filterGroupName" === key) {
        let splitValue = [...new Set(value?.split(","))];
        filterData.push({
          contactGroups: {
            some: {
              contactGroupId: {
                in: splitValue,
              },
            },
          },
        });
      } else if (["source", "lifecycleId"].includes(key) && value !== "all") {
        filterData.push({
          [key]: value,
        });
      }
    }
  }
  if (search?.length > 0) {
    filterData.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  const searchCondition: Prisma.ContactWhereInput =
    filterData?.length > 0 ? { AND: filterData } : {};

  const totalCount = await prisma.contact.count({
    where: {
      contactGroups: {
        some: {
          contactGroupId,
        },
      },
      ...searchCondition,
    },
  });
  const group = await prisma.contactGroup.findFirst({
    where: {
      id: contactGroupId,
      team: { orgId },
    },
    include: {
      contacts: {
        include: {
          contact: {
            include: {
              customFields: true,
              ContactLabelMap: {
                select: {
                  label: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        where: {
          contact: searchCondition,
        },
        take: limit,
        skip: page * limit,
        orderBy: {
          contact: {
            [sort]: desc,
          },
        },
      },
    },
  });
  if (!group) {
    throw new ContactGroupNotFoundError(`Contact group ${contactGroupId} not found`);
  }
  return {
    group: group.contacts.map((c) => c.contact),
    totalCount,
  };
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
export async function addNewContactsToGroup(
  contactGroupId: string,
  contactsBody: AddNewContactsToGroupInput,
  orgId: string,
) {
  const contactGroup = await getContactGroupById(contactGroupId, orgId);
  if (!contactGroup) {
    throw new ContactGroupNotFoundError("Contact group not found");
  }
  const contacts = contactsBody.filter((data) => isValidPhoneNumber(`+${data.phone}`));
  const invalidPhones = contactsBody.length - contacts.length;
  const phoneChunks = chunkArray(
    contacts.map((contact) => contact.phone).filter((phone): phone is string => Boolean(phone)),
    BATCH_SIZE,
  );

  let createdContacts: Contact[] = [];

  for (const chunk of phoneChunks) {
    const result = await prisma.contact.findMany({
      where: {
        phone: { in: chunk },
        orgId,
      },
    });
    createdContacts = createdContacts.concat(result);
  }

  const newMembers = await prisma.contactGroupMap.createManyAndReturn({
    skipDuplicates: true,
    data: createdContacts.map((contact) => ({
      contactId: contact.id,
      contactGroupId,
    })),
  });
  for (const contact of newMembers) {
    await addZapierTriggerToQueue(
      ZapierTriggers.CONTACT_ADDED_TO_GROUP,
      { [ZapierTriggers.CONTACT_ADDED_TO_GROUP]: contact },
      orgId,
    );
  }

  return { added: newMembers.length, invalidPhones };
}

export async function addExistingContactsToGroup(
  contactGroupId: string,
  contactIds: Array<string>,
  // Accepted (matches the optional Zod input) but currently unused by the body.
  isCustomer: boolean | undefined,
  orgId: string,
) {
  const contactGroup = await getContactGroupById(contactGroupId, orgId);
  if (!contactGroup) {
    throw new ContactGroupNotFoundError("Contact group not found");
  }
  const owned = await prisma.contact.findMany({
    where: { id: { in: contactIds }, orgId },
    select: { id: true },
  });
  const newMembers = await prisma.contactGroupMap.createManyAndReturn({
    skipDuplicates: true,
    data: owned.map((contact) => ({
      contactId: contact.id,
      contactGroupId,
    })),
  });
  for (const contact of newMembers) {
    await addZapierTriggerToQueue(
      ZapierTriggers.CONTACT_ADDED_TO_GROUP,
      { [ZapierTriggers.CONTACT_ADDED_TO_GROUP]: contact },
      orgId,
    );
  }

  return { added: newMembers.length, skipped: contactIds.length - owned.length };
}

export async function updateContactGroup(
  contactGroupId: string,
  orgId: string,
  data: UpdateContactGroupInput,
) {
  return await prisma.contactGroup.update({
    where: {
      id: contactGroupId,
      team: { orgId },
    },
    data,
  });
}

export async function deleteContactGroup(contactGroupId: string, orgId: string) {
  return await prisma.contactGroup.delete({
    where: {
      id: contactGroupId,
      team: { orgId },
    },
  });
}

export async function removeContactsFromGroup(
  contactGroupId: string,
  orgId: string,
  contactIds: RemoveGroupContactsSchema,
) {
  log.trace("Removing contacts from group %s %o", contactGroupId, contactIds);
  return await prisma.contactGroupMap.deleteMany({
    where: {
      contactGroupId,
      contactGroup: { team: { orgId } },
      contactId: {
        in: contactIds,
      },
    },
  });
}

export async function addExistingContactsToMultipleGroups(
  contactIds: Array<string>,
  contactGroupIds: Array<string>,
  orgId: string,
) {
  const ownedGroups = await prisma.contactGroup.findMany({
    where: { id: { in: contactGroupIds }, team: { orgId } },
    select: { id: true },
  });

  return await Promise.all(
    ownedGroups.map(async ({ id: contactGroupId }) => {
      const newMembers = await prisma.contactGroupMap.createManyAndReturn({
        skipDuplicates: true,
        data: contactIds.map((contactId) => ({
          contactId,
          contactGroupId,
        })),
      });
      for (const contact of newMembers) {
        await addZapierTriggerToQueue(
          ZapierTriggers.CONTACT_ADDED_TO_GROUP,
          { [ZapierTriggers.CONTACT_ADDED_TO_GROUP]: contact },
          orgId,
        );
      }
      return newMembers;
    }),
  );
}

export async function deleteManyContactGroups(groupIds: string[], orgId: string) {
  return await prisma.contactGroup.deleteMany({
    where: {
      id: {
        in: groupIds,
      },
      team: { orgId },
    },
  });
}

export async function getContactGroupByNameAndTeam(name: string, teamId: string) {
  return await prisma.contactGroup.findUnique({
    where: {
      group_name_team_id_unique: {
        name,
        teamId,
      },
    },
  });
}

export async function getContactGroupsByContactId(contactId: string, orgId: string) {
  const mappings = await prisma.contactGroupMap.findMany({
    where: {
      contactId,
      contact: {
        orgId,
      },
    },
    include: {
      contactGroup: true,
    },
  });

  return mappings.map((m) => m.contactGroup);
}

export async function updateContactGroupsForContact(
  contactId: string,
  addGroupIds: string[] = [],
  removeGroupIds: string[] = [],
  orgId: string,
) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { orgId: true },
  });
  if (!contact || contact.orgId !== orgId) return { added: [], removed: [] };

  // Asymmetric on purpose-by-accident: `removed` carries the ContactGroup rows that were
  // detached, while `added` carries the join rows that were created.
  const result: {
    added: ContactGroupMap[];
    removed: ContactGroup[];
  } = { added: [], removed: [] };

  if (removeGroupIds?.length) {
    const toRemove = await prisma.contactGroupMap.findMany({
      where: {
        contactId,
        contactGroupId: { in: removeGroupIds },
      },
      include: { contactGroup: true },
    });

    if (toRemove.length) {
      await prisma.contactGroupMap.deleteMany({
        where: {
          contactId,
          contactGroupId: { in: removeGroupIds },
        },
      });
      result.removed = toRemove.map((r) => r.contactGroup);
    }
  }

  if (addGroupIds?.length) {
    let validGroupIds = addGroupIds;
    if (orgId) {
      const validGroups = await prisma.contactGroup.findMany({
        where: { id: { in: addGroupIds }, team: { orgId } },
        select: { id: true },
      });
      validGroupIds = validGroups.map((g) => g.id);
    }

    if (validGroupIds.length) {
      const created = await prisma.contactGroupMap.createManyAndReturn({
        skipDuplicates: true,
        data: validGroupIds.map((gid) => ({ contactId, contactGroupId: gid })),
      });
      result.added = created;
    }
  }

  return result;
}
