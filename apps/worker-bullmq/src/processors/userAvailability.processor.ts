import { Job, Worker } from "bullmq";
import prisma from "@rateup/server/utils/prisma.js";
import baseRedis from "@rateup/server/utils/redisConnection.js";
import { UserPresenceMode } from "@rateup/server/generated/prisma/enums.js";
import { updateUserAvailablityStatus } from "@rateup/server/modules/user/user.service.js";
import { UserAvailabilityStatus } from "@rateup/server/modules/user/user.schema.js";
import { log } from "@rateup/server/utils/logger.js";

const workerConnection = baseRedis.duplicate();

export const userAvailabilityWorker = new Worker(
  "user-availability",
  async (job: Job) => {
    const { userId, orgId } = job.data;
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { presenceMode: true },
    });
    if (user?.presenceMode !== UserPresenceMode.automatic) return;
    try {
      if (job.name === "set-online") {
        await updateUserAvailablityStatus(userId, orgId, UserAvailabilityStatus.online);
      } else if (job.name === "set-offline") {
        await updateUserAvailablityStatus(userId, orgId, UserAvailabilityStatus.offline);
      }
    } catch (err) {
      log.error("Error updating user availability: %s", err);
    }
  },
  {
    connection: workerConnection,
    removeOnComplete: { count: 1 },
  },
);

userAvailabilityWorker.on("error", (err) => {
  log.error("User availability worker error: %s", err);
});
