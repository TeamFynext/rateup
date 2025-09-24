import prisma from "../../utils/prisma";
import { LabelBodySchema } from "./label.schema";

export async function getLabels(orgId: string) {
  return await prisma.lifecycle.findMany({
    where: {
      orgId,
    },
    orderBy: {
      ordering: "asc",
    },
  });
}

export async function updateLabel(labelId: string, data: LabelBodySchema) {
  await prisma.lifecycle.update({
    where: {
      id: labelId,
    },
    data,
  });
}

export async function createLabel(orgId: string, data: LabelBodySchema) {
  await prisma.lifecycle.create({
    data: {
      orgId,
      ...data,
    },
  });
}

export async function deleteLabelById(id: string) {
  await prisma.lifecycle.delete({
    where: {
      id,
    },
  });
}
