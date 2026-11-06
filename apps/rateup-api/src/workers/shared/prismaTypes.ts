import type prisma from "../../utils/prisma.js";

/**
 * The client handed to an interactive `prisma.$transaction` callback: the full
 * client minus the methods that cannot be nested inside a transaction.
 */
export type PrismaTransaction = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;
