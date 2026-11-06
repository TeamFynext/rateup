import prisma from "../../../utils/prisma.js";

/** The fields of a contact body that point at other rows of the org. */
export interface ContactRefs {
  labels?: string[] | null;
  contactGroupIds?: string[] | null;
  lifecycleId?: string | null;
  customFields?: { id?: string | null }[] | null;
  assignedUserIds?: string[] | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function collect(ids: Iterable<string | null | undefined>) {
  return [...new Set([...ids].filter((id): id is string => !!id))];
}

/**
 * The ids in `requested` that are not among the org's rows. A malformed id cannot be one
 * of them (and would only make Postgres reject the uuid cast), so it is foreign unread.
 */
async function foreign(
  requested: string[],
  findOwned: (ids: string[]) => Promise<{ id: string }[]>,
) {
  if (requested.length === 0) return [];
  const wellFormed = requested.filter((id) => UUID.test(id));
  const owned = new Set(
    wellFormed.length > 0 ? (await findOwned(wellFormed)).map((row) => row.id) : [],
  );
  return requested.filter((id) => !owned.has(id));
}

/**
 * Why a contact write may not go ahead, or null when every id it names is the org's.
 *
 * The dashboard services v1 delegates to write `labels`, `contactGroupIds`, `lifecycleId`,
 * custom field ids and `assignedUserIds` as given (some paths filter a few, most do not), so
 * an API key could attach its contacts to another org's labels, groups, stages and fields.
 * v1 checks them all here first and refuses the request outright rather than dropping ids.
 */
export async function findForeignContactRef(
  orgId: string,
  contacts: ContactRefs[],
): Promise<string | null> {
  const labels = collect(contacts.flatMap((c) => c.labels ?? []));
  const groups = collect(contacts.flatMap((c) => c.contactGroupIds ?? []));
  const lifecycles = collect(contacts.map((c) => c.lifecycleId));
  const fields = collect(contacts.flatMap((c) => (c.customFields ?? []).map((f) => f.id)));
  const users = collect(contacts.flatMap((c) => c.assignedUserIds ?? []));

  const [badLabels, badGroups, badLifecycles, badFields, badUsers] = await Promise.all([
    foreign(labels, (ids) =>
      prisma.contactLabel.findMany({ where: { id: { in: ids }, orgId }, select: { id: true } }),
    ),
    foreign(groups, (ids) =>
      prisma.contactGroup.findMany({
        where: { id: { in: ids }, team: { orgId } },
        select: { id: true },
      }),
    ),
    foreign(lifecycles, (ids) =>
      prisma.lifecycle.findMany({ where: { id: { in: ids }, orgId }, select: { id: true } }),
    ),
    foreign(fields, (ids) =>
      prisma.contactCustomField.findMany({
        where: { id: { in: ids }, orgId },
        select: { id: true },
      }),
    ),
    foreign(users, async (ids) =>
      (
        await prisma.orgMember.findMany({
          where: { userId: { in: ids }, orgId },
          select: { userId: true },
        })
      ).map((m) => ({ id: m.userId })),
    ),
  ]);

  const problems: [string, string[]][] = [
    ["labels", badLabels],
    ["contactGroupIds", badGroups],
    ["lifecycleId", badLifecycles],
    ["customFields", badFields],
    ["assignedUserIds", badUsers],
  ];
  const found = problems.filter(([, ids]) => ids.length > 0);
  if (found.length === 0) return null;
  return found.map(([field, ids]) => `Unknown ${field}: ${ids.join(", ")}`).join("; ");
}
