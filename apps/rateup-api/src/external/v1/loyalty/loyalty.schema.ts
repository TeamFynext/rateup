import { customerLoyaltyAccountSchema } from "../../../modules/loyalty/accounts/account.schema.js";
import z from "zod";

const customerLoyaltyAccountSchemaExternal = customerLoyaltyAccountSchema
  .omit({
    orgId: true,
    source: true,
  })
  .extend({
    dob: z.string().date(),
  });

const loyaltyTierResponseSchemaExternal = z.object({
  id: z.string().uuid(),
  programId: z.string().uuid(),
  name: z.string(),
  threshold: z.number(),
  pointsMultiplier: z.string(),
  color: z.string(),
  benefitsDescription: z.string().nullable(),
  priority: z.number(),
  createdAt: z.string().datetime(),
});

const contactResponseSchemaExternal = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  name: z.string(),
  phone: z.string(),
  source: z.string(),
  orgId: z.string().uuid(),
  tags: z.any().nullable(),
  consent: z.boolean(),
  email: z.string().nullable(),
  dob: z.string().datetime().nullable(),
  external_id: z.string().nullable(),
  aiWaChat: z.boolean(),
  isAiBotActive: z.boolean(),
  chatbotId: z.string(),
  waMessageAssignStatus: z.string(),
  lastReceivedMessageTimeStamp: z.string().datetime().nullable(),
  whatsappUserName: z.string().nullable(),
  blockedOnWhatsApp: z.boolean(),
  igsId: z.string().nullable(),
  profilePic: z.string().nullable(),
  followerCount: z.number().nullable(),
  isIgVerifiedUser: z.boolean().nullable(),
  other: z.any().nullable(),
  lifecycleId: z.string().nullable(),
  closedAt: z.string().datetime().nullable(),
  closedBy: z.string().nullable(),
  lastMessageBody: z.any().nullable(),
  lastMessageWaCreatedAt: z.string().datetime().nullable(),
  lastMessagePlatform: z.string().nullable(),
  lastReceivedMetadata: z.any().nullable(),
  lastMessageSourceIdentifier: z.string().nullable(),
  lastSentMessageTimeStamp: z.string().datetime().nullable(),
  notes: z.string().nullable(),
});

const customerLoyaltyAccountResponseSchemaExternal = z.object({
  id: z.string().uuid(),
  programId: z.string().uuid(),
  contactId: z.string().uuid(),
  currentPoints: z.number(),
  lifetimePoints: z.number(),
  currentTierId: z.string().uuid().nullable(),
  referralCode: z.string().nullable(),
  referredById: z.string().uuid().nullable(),
  status: z.string(),
  createdAt: z.string().datetime(),
  lastActivityAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
  currentTier: loyaltyTierResponseSchemaExternal.nullable(),
  contact: contactResponseSchemaExternal,
  assignedRewards: z.array(z.unknown()),
});
const customerLoyaltyAccountSchemaExternalArray = z.array(
  customerLoyaltyAccountResponseSchemaExternal,
);

// Auto-exported after fastify-zod migration
export {
  customerLoyaltyAccountSchemaExternal,
  customerLoyaltyAccountResponseSchemaExternal,
  customerLoyaltyAccountSchemaExternalArray,
};
