import { PrismaClient } from '@prisma/client';
import { CreateUserParams, userInfoParams } from './user.schema';
const prisma = new PrismaClient();

async function createUser({ id, email }: CreateUserParams) {
  const user = await prisma.user.create({
    data: {
      id,
      email,
    },
  });
  return user;
}

async function getOrgIdAndRole({ id }: userInfoParams) {
  const orgMember = await prisma.orgMember.findFirst({
    where: { userId : id },
    select: {
      orgId: true,
      role: true,
    },
  });

  if (!orgMember) {
    throw new Error(`No OrgMember found for user ID ${id}`);
  }
  return orgMember;
}

export { createUser, getOrgIdAndRole };
