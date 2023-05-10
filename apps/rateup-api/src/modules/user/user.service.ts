import { PrismaClient } from '@prisma/client';
import { CreateUserParams } from './user.schema';
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

export { createUser };
