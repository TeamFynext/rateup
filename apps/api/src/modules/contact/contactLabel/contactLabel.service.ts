import prisma from "../../../utils/prisma.js";
import { CreateContactLabelSchema, UpdateContactLabelSchema } from "./contactLabel.schema.js";
import type { Prisma } from "../../../../generated/prisma/client.js";

export async function createContactLabel(
  orgId: string,
  data: Required<Pick<CreateContactLabelSchema, "name">>,
) {
  const label = await prisma.contactLabel.create({
    data: {
      ...data,
      orgId,
    },
  });
  return label;
}

export async function getContactLabelsByOrgId(orgId: string) {
  const labels = await prisma.contactLabel.findMany({
    where: {
      orgId,
    },
    include: {
      _count: {
        select: {
          contactLabels: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return labels;
}

export async function getContactLabelById(labelId: string, orgId: string) {
  const label = await prisma.contactLabel.findFirst({
    where: {
      id: labelId,
      orgId,
    },
    include: {
      _count: {
        select: {
          contactLabels: true,
        },
      },
    },
  });
  return label;
}

export async function updateContactLabel(
  labelId: string,
  orgId: string,
  data: UpdateContactLabelSchema,
) {
  const label = await prisma.contactLabel.update({
    where: {
      id: labelId,
      orgId,
    },
    data,
  });
  return label;
}

export async function deleteContactLabel(labelId: string, orgId: string) {
  const label = await prisma.contactLabel.delete({
    where: {
      id: labelId,
      orgId,
    },
  });
  return label;
}

export async function assignLabelsToContact(contactId: string, labelIds: string[], orgId: string) {
  const owned = await prisma.contact.findFirst({
    where: { id: contactId, orgId },
    select: { id: true },
  });
  if (!owned) return null;

  // First, remove all existing labels for this contact
  await prisma.contactLabelMap.deleteMany({
    where: {
      contactId,
    },
  });

  // Then add the new labels
  if (labelIds.length > 0) {
    // Verify that all labels belong to the organization
    const validLabels = await prisma.contactLabel.findMany({
      where: {
        id: { in: labelIds },
        orgId,
      },
      select: { id: true },
    });

    const validLabelIds = validLabels.map((label) => label.id);

    if (validLabelIds.length > 0) {
      await prisma.contactLabelMap.createMany({
        data: validLabelIds.map((labelId) => ({
          contactId,
          labelId,
        })),
      });
    }
  }

  // Return updated contact with labels
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, orgId },
    include: {
      ContactLabelMap: {
        include: {
          label: true,
        },
      },
    },
  });

  return contact;
}

export async function getContactsWithLabels(orgId: string, labelIds?: string[]) {
  const whereCondition: Prisma.ContactWhereInput = {
    orgId,
  };

  if (labelIds && labelIds.length > 0) {
    // The Contact -> label join relation is `ContactLabelMap`; there is no
    // `contactLabels` field, and prisma rejects unknown arguments outright.
    whereCondition.ContactLabelMap = {
      some: {
        labelId: {
          in: labelIds,
        },
      },
    };
  }

  const contacts = await prisma.contact.findMany({
    where: whereCondition,
    include: {
      ContactLabelMap: {
        include: {
          label: true,
        },
      },
    },
  });

  return contacts;
}

export async function assignLabelsToContacts(
  contactIds: string[],
  labelIds: string[],
  orgId: string,
) {
  const owned = await prisma.contact.findMany({
    where: { id: { in: contactIds }, orgId },
    select: { id: true },
  });
  const ownedIds = owned.map((contact) => contact.id);
  const skipped = contactIds.length - ownedIds.length;
  if (ownedIds.length === 0) return { updated: 0, skipped, labelsApplied: 0 };

  // First, remove all existing labels for this contacts
  await prisma.contactLabelMap.deleteMany({
    where: {
      contactId: {
        in: ownedIds,
      },
    },
  });

  // Then add the new labels
  if (labelIds.length > 0) {
    // Verify that all labels belong to the organization
    const validLabels = await prisma.contactLabel.findMany({
      where: {
        id: { in: labelIds },
        orgId,
      },
      select: { id: true },
    });

    const validLabelIds = validLabels.map((label) => label.id);

    if (validLabelIds.length > 0) {
      const data = ownedIds.flatMap((contactId) =>
        validLabelIds.map((labelId) => ({ contactId, labelId })),
      );
      await prisma.contactLabelMap.createMany({
        data,
        skipDuplicates: true,
      });
      return { updated: ownedIds.length, skipped, labelsApplied: validLabelIds.length };
    }
  }

  return { updated: ownedIds.length, skipped, labelsApplied: 0 };
}
