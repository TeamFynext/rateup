import { log } from "./utils/logger";
import prisma from "./utils/prisma";

export async function migrateData() {
  log.trace("Starting migration");
  const waMessages = await prisma.waMessage.findMany({
    select: {
      id: true,
      waContact: {
        select: {
          contactId: true,
        },
      },
    },
  });
  for (const message of waMessages) {
    await prisma.waMessage.update({
      where: {
        id: message.id,
      },
      data: {
        contactId: message.waContact.contactId,
      },
    });
  }

  log.trace("Migration completed");
}
