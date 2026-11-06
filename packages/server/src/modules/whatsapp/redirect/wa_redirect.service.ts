import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";

export async function tokenizeIp(ip: string) {
  const tokenized = await prisma.temporary_Tokenization.create({
    data: {
      data: { ip },
    },
  });
  return tokenized.token;
}
export async function getIpFromToken(token: string) {
  const tokenized = await prisma.temporary_Tokenization.findUnique({
    where: {
      token,
    },
  });
  return (tokenized!.data as { ip?: string }).ip as string;
}

export async function deleteAllExpiredTokens() {
  const res = await prisma.temporary_Tokenization.deleteMany({
    where: {
      createdAt: {
        lte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      },
    },
  });
  log.debug(`Deleted ${res.count} expired tokens`);
}

setInterval(deleteAllExpiredTokens, 1000 * 60 * 60 * 24 * 2);
