import prisma from "../../utils/prisma";
import { CreateOrgInput } from "./org.schema";

export async function createOrg(input: CreateOrgInput) {
  const org = await prisma.org.create({
    data: input,
  });
  return org;
}
