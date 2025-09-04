import prisma from "../../utils/prisma";
import { LabelBodySchema } from "./label.schema";

export async function getLabels(orgId: string) {
  return await prisma.labels.findMany({
    where: {
      orgId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function updateLabel(labelId: string, data: LabelBodySchema) {
  await prisma.labels.update({
    where: {
      id: labelId,
    },
    data,
  });
}

export async function createLabel(orgId: string, data: LabelBodySchema) {
  await prisma.labels.create({
    data: {
      orgId,
      ...data,
    },
  });
}

export async function deleteLabelById(id: string) {
  await prisma.labels.delete({
    where: {
      id,
    },
  });
}
