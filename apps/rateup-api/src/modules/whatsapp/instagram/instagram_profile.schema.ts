import { z } from "zod";

/**
 * Bodies of the Instagram profile routes. Limits follow Meta's ice-breaker and persistent-menu
 * shapes (`{ question, payload }`, `{ locale, call_to_actions: [{ type, title, payload | url }] }`).
 * These save a draft as well as push to Meta, and the dashboard saves a draft with a field
 * still blank, so strings may be empty here; Meta itself refuses a blank one on sync.
 */
export const instagramProfileParamsSchema = z.object({
  channelId: z.string().min(1).max(100),
});

export const instagramIbaIdParamsSchema = z.object({
  ibaId: z.string().min(1).max(100),
});

const iceBreakerSchema = z.object({
  question: z.string().trim().max(80),
  payload: z.string().trim().max(1000),
});

export const instagramIceBreakersBodySchema = z.object({
  // Instagram shows at most 4; the handler answers the over-limit case with its own message.
  iceBreakers: z.array(iceBreakerSchema).max(20),
  syncWithMeta: z.boolean().optional(),
});

const menuActionSchema = z.object({
  type: z.enum(["postback", "web_url"]),
  title: z.string().trim().max(30),
  payload: z.string().trim().max(1000).optional(),
  url: z.union([z.literal(""), z.url({ protocol: /^https?$/ }).max(2048)]).optional(),
});

export const instagramPersistentMenuBodySchema = z.object({
  persistentMenu: z
    .array(
      z.object({
        locale: z.string().trim().min(1).max(20),
        // Instagram allows 3 per locale; the handler explains that limit itself.
        call_to_actions: z.array(menuActionSchema).max(20),
      }),
    )
    .max(50),
  syncWithMeta: z.boolean().optional(),
});

export type InstagramIceBreakersBody = z.infer<typeof instagramIceBreakersBodySchema>;
export type InstagramPersistentMenuBody = z.infer<typeof instagramPersistentMenuBodySchema>;
