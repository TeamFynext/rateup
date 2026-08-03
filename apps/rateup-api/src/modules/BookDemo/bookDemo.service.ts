import prisma from "../../utils/prisma.js";

export interface BookDemoInput {
  name: string;
  workEmail: string;
  businessName: string;
  phone: string;
  message?: string;
}

/**
 * Records the request and returns the row.
 *
 * Throws rather than reporting `{ success: false }`: the caller decides what a
 * failure to record means, and it used to swallow the error to console.error where
 * the structured logs never saw it.
 */
export const createBookDemo = async (data: BookDemoInput) => {
  return await prisma.bookDemo.create({ data });
};
