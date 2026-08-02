import prisma from "../../utils/prisma.js";
import { LifecycleBodySchema, LifecycleReorderSchema } from "./lifecycle.schema.js";

export async function getLifecycles(orgId: string) {
  return await prisma.lifecycle.findMany({
    where: {
      orgId,
    },
    orderBy: {
      ordering: "asc",
    },
  });
}

export async function getLifeCyclesWithContactCount(orgId: string) {
  return await prisma.lifecycle.findMany({
    where: {
      orgId,
    },
    orderBy: {
      ordering: "asc",
    },
    include: {
      _count: {
        select: {
          contacts: true,
        },
      },
    },
  });
}

/**
 * Updates one pipeline stage within an org.
 *
 * The where used to be the bare id, with the handler never touching the session —
 * so a stage id was enough for a user of any organisation to rewrite that stage's
 * name, category, ordering and, most consequentially, `isWon`, which decides
 * whether contacts entering it fire a Meta Conversions event. reorderLabels below
 * has scoped its writes all along, with a comment saying why. Returns the row now,
 * so the caller learns what was saved (issues.txt 27.6). See issues.txt 27.1.
 */
export async function updateLifecycle(
  lifecycleId: string,
  orgId: string,
  data: LifecycleBodySchema,
) {
  return await prisma.lifecycle.update({
    where: {
      id: lifecycleId,
      orgId,
    },
    data,
  });
}

export async function createLifecycle(orgId: string, data: LifecycleBodySchema) {
  return await prisma.lifecycle.create({
    data: {
      orgId,
      ...data,
    },
  });
}

/**
 * Deletes one stage of the caller's org, refusing while contacts still sit in it.
 *
 * The delete used to be by bare id — any org's stage, by id — and Contact.Lifecycle
 * is an optional relation with no onDelete, so Prisma's default of SetNull meant the
 * stage AND the record of which contacts were in it disappeared together, with
 * nothing storing the previous value. See issues.txt 27.2.
 */
export async function deleteLifecycleById(id: string, orgId: string) {
  const contactsInStage = await prisma.contact.count({ where: { lifecycleId: id, orgId } });
  if (contactsInStage > 0) {
    throw new LifecycleInUseError(contactsInStage);
  }
  return await prisma.lifecycle.delete({
    where: {
      id,
      orgId,
    },
  });
}

/** Raised when a stage still holds contacts; the handler answers 409. */
export class LifecycleInUseError extends Error {
  constructor(public readonly contactCount: number) {
    super(`This stage still holds ${contactCount} contact(s)`);
    this.name = "LifecycleInUseError";
  }
}

/**
 * Rewrites the ordering of an org's stages.
 *
 * `isDefault` used to be `lifecycle.ordering === 0`, while seedDefaultStages writes
 * the starting stages one-based — so a client sending back the orderings it was
 * given made NOTHING the default, and nothing else in the product can set it back.
 * The first entry of the list is the default now, whatever numbering the client
 * uses. See issues.txt 27.3.
 */
export async function reorderLabels(orgId: string, data: LifecycleReorderSchema) {
  const defaultId = data.lifecycles.find((lifecycle) => lifecycle.category !== "lost")?.id;
  return await prisma.$transaction(
    data.lifecycles.map((lifecycle) =>
      prisma.lifecycle.update({
        where: {
          id: lifecycle.id,
          orgId, // Ensure the label belongs to the Organization
        },
        data: {
          ordering: lifecycle.ordering,
          isDefault: lifecycle.id === defaultId,
          isWon: lifecycle.isWon,
          // The category the client sends is honoured only when it is "lost", and is
          // otherwise recomputed from isWon — so a stage sent as "won" with isWon
          // false comes back "active". That coupling is deliberate; what was wrong is
          // that the request declared a field the server keeps only sometimes, so it
          // is optional on the request now. See issues.txt 27.7.
          category: lifecycle.category === "lost" ? "lost" : lifecycle.isWon ? "won" : "active",
        },
      }),
    ),
  );
}
