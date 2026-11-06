import { z } from "zod";
import { PlatformType } from "../../../../generated/prisma/enums.js";

/** Messenger (FACEBOOK) or INSTAGRAM; each has its own login config and its own rows. */
const metaChannelPlatformSchema = z.enum([PlatformType.FACEBOOK, PlatformType.INSTAGRAM]);

const metaChannelLoginBodySchema = z.object({
  platform: metaChannelPlatformSchema,
  code: z.string().min(1),
});

const connectMetaChannelBodySchema = z.object({
  platform: metaChannelPlatformSchema,
  loginId: z.uuid(),
  /** Page ids for Messenger, Instagram account ids for Instagram; any number at once. */
  accountIds: z.array(z.string().min(1)).min(1).max(100),
});

const metaChannelListQuerySchema = z.object({
  platform: metaChannelPlatformSchema.optional(),
});

const metaChannelParamsSchema = z.object({
  channelId: z.uuid(),
});

export type MetaChannelLoginBody = z.infer<typeof metaChannelLoginBodySchema>;
export type ConnectMetaChannelBody = z.infer<typeof connectMetaChannelBodySchema>;
export type MetaChannelListQuery = z.infer<typeof metaChannelListQuerySchema>;
export type MetaChannelParams = z.infer<typeof metaChannelParamsSchema>;

export {
  metaChannelLoginBodySchema,
  connectMetaChannelBodySchema,
  metaChannelListQuerySchema,
  metaChannelParamsSchema,
};
