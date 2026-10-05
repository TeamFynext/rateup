import { z } from "zod";
import { PlatformType } from "../../../generated/prisma/enums.js";

const channelListQuerySchema = z.object({
  platform: z.enum(PlatformType).optional(),
});

export type ChannelListQuery = z.infer<typeof channelListQuerySchema>;

export { channelListQuerySchema };
