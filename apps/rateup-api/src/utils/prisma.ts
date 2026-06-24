import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export default prisma;

/**
 * Returns a new object without the specified fields
 *
 * Prisma does not allow us to exclude fields from the query (If we specify a field to exlcude, then we must specify all other fields to include).
 * This function allows us to exclude fields from the response in  a type-safe way.
 * @param obj
 * @param fields
 * @returns
 */
export function excludeFields<T, K extends keyof T>(obj: T, fields: K[]): Omit<T, K> {
  const newObj = { ...obj };
  fields.forEach((field) => {
    delete newObj[field];
  });
  return newObj;
}
