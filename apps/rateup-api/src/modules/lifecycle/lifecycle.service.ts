import prisma from "../../utils/prisma.js";
import {
  LifecycleBodySchema,
  LifecycleReorderSchema,
} from "./lifecycle.schema.js";

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
  data: LifecycleBodySchema,
) {
  await prisma.lifecycle.update({
    where: {
      id: lifecycleId,
    },
    data,
  });
}

export async function createLifecycle(
  orgId: string,
  data: LifecycleBodySchema,
) {
  await prisma.lifecycle.create({
    data: {
      orgId,
      ...data,
    },
  });
}

export async function deleteLifecycleById(id: string) {
  await prisma.lifecycle.delete({
    where: {
      id,
    },
  });
}

export async function reorderLabels(
  orgId: string,
  data: LifecycleReorderSchema,
) {
  return await prisma.$transaction(
    data.lifecycles.map((lifecycle) =>
      prisma.lifecycle.update({
        where: {
          id: lifecycle.id,
          orgId, // Ensure the label belongs to the Organization
        },
        data: {
          ordering: lifecycle.ordering,
          isDefault: lifecycle.ordering === 0 && lifecycle.category !== "lost",
        },
      }),
    ),
  );
}
