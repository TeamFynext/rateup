import { string, z } from "zod";

export enum WaChatLastMessageTypes {
  USER_MESSAGES = "usermessages",
  ALL = "all",
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
  teamId: z.string().optional(),
  reaction: WaReaction.optional(),
  media: WaMedia.optional(),
  messageId: string().optional(), // for internal messages
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

const privateNoteText = z.object({
  // Plain text from the app, a Tiptap document from the web editor.
  body: z.union([
    z.string().trim().min(1),
    z.looseObject({ type: z.literal("doc"), content: z.array(z.any()) }),
  ]),
});

// Both clients post their whole composer state here; only these fields are read.
const PrivateWaMessageBody = z.object({
  text: privateNoteText,
  messageId: string().max(200).optional(),
  conversationId: z.guid().optional(),
  // Resolved by id on the client: names with spaces can't be matched in the text.
  mentionedUserIds: z.array(z.guid()).max(50).optional(),
});

const PaginateQuerySchema = z.object({
  cursor: z.string().optional(),
  page: z.string().optional(),
  active: z.string().optional().nullable(),
  phone: z.string().optional(),
  // Scope the thread to a single conversation (ticket). Omitted → all of the
  // contact's messages, as before.
  conversationId: z.string().optional(),
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
  /// Conversation tag ids. Named in full to keep it clear of `tags` above, which
  /// is the org's free-form contact-tag JSON and unrelated.
  conversationTags: z.array(z.string()).optional(),
  sortBy: z.string().optional(),
  category: z.string().optional(),
  lifecycle: z.string().optional(),
  assignedUserIds: z.array(z.string()).optional(),
  favorite: z.boolean().optional(),
  mentions: z.boolean().optional(),
  /// Spam tab. Contact-grained — one row per spam contact, not one per ticket —
  /// and mutually exclusive with the status/assignment filters.
  spam: z.boolean().optional(),
});

const waChatFilterQuerySchema = PaginateQuerySchema.extend({
  filterData: z.string(),
});

// The export form sends every date field and leaves the unused ones as "". Anything
// else must be a plain calendar date: these values reach the export's SQL.
const exportDate = z.union([z.literal(""), z.iso.date()]);

const waChatExportConstraints = z
  .object({
    date: z.object({
      type: z.enum(DateType),
      inclusive: z.boolean().default(false),
      between: z.object({
        from: exportDate,
        to: exportDate,
      }),
      before: exportDate,
      after: exportDate,
      on: exportDate,
    }),
    repliesOnly: z.boolean().default(false),
  })
  .superRefine(({ date }, ctx) => {
    const required: Array<[string, string[]]> =
      date.type === DateType.BETWEEN
        ? [
            [date.between.from, ["date", "between", "from"]],
            [date.between.to, ["date", "between", "to"]],
          ]
        : [[date[date.type], ["date", date.type]]];
    for (const [value, path] of required) {
      if (!value) ctx.addIssue({ code: "custom", message: "Date is required", path });
    }
  });
const waChatExportQuerySchema = z.object({
  constraints: z.string(),
  filterData: z.string(),
});

const waMessageAssignBody = z.object({
  contactId: z.string(),
  assignees: z.array(z.object({ userId: z.string(), teamId: z.string() })),
  assignIfOnline: z.boolean().default(false),
  messageId: z.string().optional(), // for internal message
  // The ticket on screen. Without it the contact's newest ticket is assigned, which is
  // the wrong one when an older ticket is still open.
  conversationId: z.uuid().nullish(),
});

/// One owner per ticket: `userId` names them, `teamId` alone round-robins within
/// that team, and neither unassigns.
const assignOwnerBody = z.object({
  contactId: z.string(),
  conversationId: z.uuid().nullish(),
  userId: z.uuid().nullish(),
  teamId: z.uuid().nullish(),
  messageId: z.string().optional(),
});

const blockUserSchema = z.object({
  phoneNumbersList: z.array(z.string()),
});

const favoriteContactSchema = z.object({
  conversationId: z.string(),
  isFavorite: z.boolean(),
});

/// Spam is contact-grained: the body names a contact, never a conversation.
const spamContactSchema = z.object({
  contactId: z.string(),
  isSpam: z.boolean(),
  messageId: z.string().optional(), // id of the optimistic internal event message
});

const clearMentionsSchema = z.object({
  conversationId: z.string().optional(),
});

const reopenConversationSchema = z.object({
  conversationId: z.string().optional(),
  messageId: z.string().optional(), // for the internal "assigned" event
});

/// Either one `assignee` for every chat, or a `teamId` whose members take the chats
/// in turn, one owner per chat.
const bulkWaMessageAssignBody = z
  .object({
    contactIds: z.array(z.string()),
    assignee: z
      .object({
        userId: z.string(),
        teamId: z.string(),
      })
      .optional(),
    teamId: z.uuid().optional(),
    assignIfOnline: z.boolean().default(false),
    messageId: z.string().optional(),
  })
  .refine((body) => Boolean(body.assignee) !== Boolean(body.teamId), {
    message: "Send either an assignee or a teamId",
  });

const logsQuerySchema = z.object({
  dateKey: z.string().optional(),
  dateRange: z.string().optional(),
  days: z.number().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  team: z.string().optional(),
  pageIndex: z.string().optional(),
  pageSize: z.string().optional(),
  searchQuery: z.string().optional(),
});

export type NewWaMessageBody = z.infer<typeof NewWaMessageBody>;
export type PrivateWaMessageBody = z.infer<typeof PrivateWaMessageBody>;
export const privateNoteParams = z.object({ noteId: z.guid() });
export const editPrivateNoteBody = z.object({ text: privateNoteText });
export type PrivateNoteParams = z.infer<typeof privateNoteParams>;
export type EditPrivateNoteBody = z.infer<typeof editPrivateNoteBody>;
export type PaginateQuerySchema = z.infer<typeof PaginateQuerySchema>;
export type WaChatFilterSchema = z.infer<typeof WaChatFilterSchema>;
export type WaChatFilterQuerySchema = z.infer<typeof waChatFilterQuerySchema>;
export type WaChatExportConstraints = z.infer<typeof waChatExportConstraints>;
export type WaChatExportQuerySchema = z.infer<typeof waChatExportQuerySchema>;
export type WaMediaFileByMediaIdBody = z.infer<typeof waMediaFileByMediaIdBody>;
export type WaMessageAssignBody = z.input<typeof waMessageAssignBody>;
export type AssignOwnerBody = z.infer<typeof assignOwnerBody>;
export type BulkWaMessageAssignBody = z.infer<typeof bulkWaMessageAssignBody>;
export type BlockUserBody = z.infer<typeof blockUserSchema>;
export type FavoriteContactBody = z.infer<typeof favoriteContactSchema>;
export type SpamContactBody = z.infer<typeof spamContactSchema>;
export type ClearMentionsBody = z.infer<typeof clearMentionsSchema>;
export type ReopenConversationBody = z.infer<typeof reopenConversationSchema>;
export type LogsQuery = z.infer<typeof logsQuerySchema>;
export type GenerateInboxResponseBody = z.infer<typeof generateInboxResponseBody>;

// Auto-exported after fastify-zod migration
export {
  NewWaMessageBody,
  PrivateWaMessageBody,
  PaginateQuerySchema,
  WaChatFilterSchema,
  waChatFilterQuerySchema,
  waChatExportConstraints,
  waChatExportQuerySchema,
  waMediaFileByMediaIdBody,
  waMessageAssignBody,
  blockUserSchema,
  favoriteContactSchema,
  spamContactSchema,
  clearMentionsSchema,
  reopenConversationSchema,
  generateInboxResponseBody,
  bulkWaMessageAssignBody,
  assignOwnerBody,
  logsQuerySchema,
};
