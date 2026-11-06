import z from "zod";

// Limits are Meta's: a longer value is refused by the Messenger Profile API, so it is
// refused here first with a message the user can act on.
const payload = z.string().trim().min(1).max(1000);

export const messengerProfileParamsSchema = z.object({
  channelId: z.string().min(1),
});

export const messengerGetStartedSchema = z.object({
  payload,
});

export const messengerGreetingSchema = z.object({
  text: z.string().trim().min(1).max(160),
});

export const messengerIceBreakersSchema = z.object({
  iceBreakers: z
    .array(z.object({ question: z.string().trim().min(1).max(80), payload }))
    .min(1)
    .max(4),
});

const menuTitle = z.string().trim().min(1).max(30);

export const messengerPersistentMenuSchema = z.object({
  persistentMenu: z
    .array(
      z.discriminatedUnion("type", [
        z.object({ type: z.literal("postback"), title: menuTitle, payload }),
        z.object({
          type: z.literal("web_url"),
          title: menuTitle,
          url: z.url({ protocol: /^https?$/ }),
        }),
      ]),
    )
    .min(1)
    .max(20),
});

export type MessengerProfileParams = z.infer<typeof messengerProfileParamsSchema>;
