import {
  addStageToOrgPipelines,
  removeStagesForLifecycle,
  syncStagesWithLifecycle,
} from "../pipeline/pipeline.lifecycleSync.js";
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

export async function updateLifecycle(
  lifecycleId: string,
  orgId: string,
  data: LifecycleBodySchema,
) {
  return await prisma.$transaction(async (tx) => {
    const lifecycle = await tx.lifecycle.update({
      where: {
        id: lifecycleId,
        orgId,
      },
      data,
    });

    await syncStagesWithLifecycle(tx, lifecycleId, data);

    return lifecycle;
  });
}

export async function createLifecycle(orgId: string, data: LifecycleBodySchema) {
  return await prisma.$transaction(async (tx) => {
    const lifecycle = await tx.lifecycle.create({
      data: {
        orgId,
        ...data,
      },
    });

    // Every pipeline board is a view of these stages, so a new one shows up as a
    // column straight away instead of waiting to be added by hand.
    await addStageToOrgPipelines(tx, orgId, lifecycle);

    return lifecycle;
  });
}

export async function deleteLifecycleById(id: string, orgId: string) {
  const contactsInStage = await prisma.contact.count({ where: { lifecycleId: id, orgId } });
  if (contactsInStage > 0) {
    throw new LifecycleInUseError(contactsInStage);
  }
  return await prisma.$transaction(async (tx) => {
    await removeStagesForLifecycle(tx, id);
    return tx.lifecycle.delete({
      where: {
        id,
        orgId,
      },
    });
  });
}

/** Raised when a stage still holds contacts; the handler answers 409. */
export class LifecycleInUseError extends Error {
  constructor(public readonly contactCount: number) {
    super(`This stage still holds ${contactCount} contact(s)`);
    this.name = "LifecycleInUseError";
  }
}

export async function reorderLabels(orgId: string, data: LifecycleReorderSchema) {
  const defaultId = data.lifecycles.find((lifecycle) => lifecycle.category !== "lost")?.id;
  return await prisma.$transaction(async (tx) => {
    const lifecycles = [];

    for (const lifecycle of data.lifecycles) {
      lifecycles.push(
        await tx.lifecycle.update({
          where: {
            id: lifecycle.id,
            orgId, // Ensure the label belongs to the Organization
          },
          data: {
            ordering: lifecycle.ordering,
            isDefault: lifecycle.id === defaultId,
            isWon: lifecycle.isWon,
            category: lifecycle.category === "lost" ? "lost" : lifecycle.isWon ? "won" : "active",
          },
        }),
      );
      await syncStagesWithLifecycle(tx, lifecycle.id, {
        ordering: lifecycle.ordering,
        isWon: lifecycle.isWon,
      });
    }

    return lifecycles;
  });
}
