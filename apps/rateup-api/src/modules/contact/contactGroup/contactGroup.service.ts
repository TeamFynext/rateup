import { isValidPhoneNumber } from "libphonenumber-js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
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
import {
  addZapierTriggerToQueue,
  ZapierTriggers,
} from "../../integrations/external/zapier/zapier.service.js";

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
//also used in zapier controller
export async function getContactGroupsByTeamId(teamId: string) {
  const contactGroups = await prisma.contactGroup.findMany({
    where: {
      teamId,
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
        },
      },
    },
  });

  return contactGroups;
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
export async function createContactGroup(contactGroup: CreateContactGroupInput) {
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
  if (!group) {
    throw new Error(`Contact group ${contactGroupId} not found`);
  }

  return group.contacts.map((c) => c.contact);
}
export async function getContactsByContactGroupIdWithPagination(
  contactGroupId: string,
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
      name: {
        contains: search,
        mode: "insensitive",
      },
    });
    filterData.push({
      phone: {
        contains: search,
        mode: "insensitive",
      },
    });
  }

  const searchCondition: Prisma.ContactWhereInput =
    filterData?.length > 0
      ? {
          OR: filterData,
        }
      : {};

  const totalCount = await prisma.contact.count({
    where: {
      contactGroups: {
        some: {
          contactGroupId,
        },
      },
      AND: filterData,
    },
  });
  const group = await prisma.contactGroup.findUnique({
    where: {
      id: contactGroupId,
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
    throw new Error(`Contact group ${contactGroupId} not found`);
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
  const contactGroup = await getContactGroupById(contactGroupId);
  if (!contactGroup) {
    throw new Error("Contact group not found");
  }
  const contacts = contactsBody.filter((data) => isValidPhoneNumber(`+${data.phone}`));
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
}

export async function addExistingContactsToGroup(
  contactGroupId: string,
  contactIds: Array<string>,
  // Accepted (matches the optional Zod input) but currently unused by the body.
  isCustomer: boolean | undefined,
  orgId: string,
) {
  const contactGroup = await getContactGroupById(contactGroupId);
  if (!contactGroup) {
    throw new Error("Contact group not found");
  }
  // TODO: check if contactIds belong to the same team?
  // FIXME:
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
}

export async function updateContactGroup(contactGroupId: string, data: UpdateContactGroupInput) {
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
  orgId: string,
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
        const newMembers = await prisma.contactGroupMap.createManyAndReturn({
          data: remainingContacts.map((contactId) => ({
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
