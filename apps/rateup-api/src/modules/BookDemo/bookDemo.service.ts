import prisma from "../../utils/prisma.js";

/**
 * A demo request, as the public form actually collects it.
 *
 * This interface used to describe a different form entirely — firstName, lastName,
 * teamSize, preferredTime, primaryUseCase, additionalInfo — none of which the route
 * asks for, and createBookDemo had no callers anywhere in the repo. So a demo
 * request existed only as an email: if the notification queue dropped the job or
 * Redis was down, the lead was gone with no record, and the requester had already
 * been told "we'll contact you soon". See issues.txt 16.3.
 */
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
