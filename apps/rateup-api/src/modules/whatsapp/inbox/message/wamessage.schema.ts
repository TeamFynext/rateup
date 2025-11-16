import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { PlatformType } from "../../../../../generated/prisma/enums";

enum WaChatLastMessageTypes {
  "usermessages",
  "all",
}
export enum DateType {
  BETWEEN = "between",
  BEFORE = "before",
  AFTER = "after",
  ON = "on",
}

const WaMessageText = z.object({
  body: z.string(),
});
const WaReaction = z.object({
  toWaMessageId: z.string(),
  emoji: z.string().optional(), //used in whatsapp
  reaction: z.string().optional(), //used in instagram
});
const generateInboxResponseBody = z.object({
  numberOfContacts: z.number().min(1).default(1),
  messagesPerContact: z.number().min(1).default(1),
});

const WaMedia = z.array(
  z.object({
    type: z.enum(["image", "audio", "video", "document"]),
    url: z.string(),
    name: z.string(),
  }),
);

const NewWaMessageBody = z.object({
  type: z.enum(["text", "reaction", "media", "contact", "location"]),
  text: WaMessageText.optional(),
  reaction: WaReaction.optional(),
  media: WaMedia.optional(),
  contacts: z
    .object({
      contactIds: z.array(z.string()).optional(),
      groupIds: z.array(z.string()).optional(),
    })
    .optional(),
  location: z
    .object({
      latitude: z.string(),
      longitude: z.string(),
      name: z.string(),
      address: z.string(),
    })
    .optional(),
  whatsappSettingsPhoneId: z.string(),
  platform: z.string(),
});

const PaginateQuerySchema = z.object({
  cursor: z.string().optional(),
  page: z.string().optional(),
  active: z.string().optional().nullable(),
  phone: z.string().optional(),
});

const waMediaFileByMediaIdBody = z.object({
  mediaId: z.string(),
});

const WaChatFilterSchema = z.object({
  messageType: z.string().default("all"),
  strictFilter: z.boolean().default(false),
  searchTerm: z.string().optional(),
  contactGroups: z.array(z.string()).optional(),
  campaigns: z.array(z.string()).optional(),
  tags: z.array(z.any()).optional(),
  waMessageAssignStatus: z.string().optional(),
  blockedUsers: z.boolean().optional(),
  status: z.array(z.string()).optional(),
  assignedTeams: z.array(z.string()).optional(),
  phone: z.string(),
  labels: z.array(z.string()).optional(),
  sortBy: z.string().optional(),
  category: z.string().optional(),
  lifecycle: z.string().optional(),
});

const waChatFilterQuerySchema = PaginateQuerySchema.extend({
  filterData: z.string(),
});

const waChatExportConstraints = z.object({
  date: z.object({
    type: z.nativeEnum(DateType),
    inclusive: z.boolean().default(false),
    between: z.object({
      from: z.string(),
      to: z.string(),
    }),
    before: z.string(),
    after: z.string(),
    on: z.string(),
  }),
  repliesOnly: z.boolean().default(false),
});
const waChatExportQuerySchema = z.object({
  constraints: z.string(),
  filterData: z.string(),
});

const waMessageAssignBody = z.object({
  contactId: z.string(),
  assignees: z.array(z.object({ userId: z.string(), teamId: z.string() })),
  assignIfOnline: z.boolean().default(true),
});

const blockUserSchema = z.object({
  phoneNumbersList: z.array(z.string()),
});

export const { schemas: waMessageSchemas, $ref: $waMessage } = buildJsonSchemas(
  {
    NewWaMessageBody,
    PaginateQuerySchema,
    WaChatFilterSchema,
    waChatFilterQuerySchema,
    waChatExportConstraints,
    waChatExportQuerySchema,
    waMediaFileByMediaIdBody,
    waMessageAssignBody,
    blockUserSchema,
    generateInboxResponseBody,
  },
  { $id: "waMessage" },
);

export type NewWaMessageBody = z.infer<typeof NewWaMessageBody>;
export type PaginateQuerySchema = z.infer<typeof PaginateQuerySchema>;
export type WaChatFilterSchema = z.infer<typeof WaChatFilterSchema>;
export type WaChatFilterQuerySchema = z.infer<typeof waChatFilterQuerySchema>;
export type WaChatExportConstraints = z.infer<typeof waChatExportConstraints>;
export type WaChatExportQuerySchema = z.infer<typeof waChatExportQuerySchema>;
export type WaMediaFileByMediaIdBody = z.infer<typeof waMediaFileByMediaIdBody>;
export type WaMessageAssignBody = z.infer<typeof waMessageAssignBody>;
export type BlockUserBody = z.infer<typeof blockUserSchema>;
export type GenerateInboxResponseBody = z.infer<
  typeof generateInboxResponseBody
>;
