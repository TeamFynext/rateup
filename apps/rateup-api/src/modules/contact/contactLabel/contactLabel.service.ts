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

/**
 * Replaces a contact's labels with the ones named.
 *
 * The delete used to be unconditional and ran BEFORE anything checked whose
 * contact it was — the org was used, carefully, to filter which LABELS could be
 * written, but the CONTACT was never checked at all. So `PUT /labels/assign/:id`
 * accepted a contact id from any org and stripped every label off it, and the
 * caller got a 404 for their trouble because the read-back at the end could not
 * find it either. Destructive, silent, and not undoable — labels drive inbox
 * filtering and segment selection. See issues.txt 18.32.
 */
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

/**
 * The bulk form of assignLabelsToContact, and the sharper half of issues.txt
 * 18.32: it takes an ARRAY of contact ids, so one request could clear the labels
 * of an arbitrary list of contacts across any number of orgs. The ids are resolved
 * against the caller's org first now, and anything else is simply not touched.
 *
 * It also returned nothing, so the endpoint answered 200 with an empty body and
 * the caller could not tell which contacts were updated or whether any label was
 * rejected by the org filter. See issues.txt 18.33.
 */
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
