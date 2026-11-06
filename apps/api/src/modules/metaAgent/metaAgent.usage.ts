import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";

/**
 * Meta does not report token counts for the Business Agent's replies — the echo
 * carries the text and nothing else — so usage is estimated the way the common
 * rule of thumb does it: about four characters to a token.
 */
const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string | null | undefined): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * The words in a WhatsApp message body, for estimating. Text and captions are
 * read as they are; anything structured (buttons, lists, carousels) is counted
 * by its serialised form, which is roughly what a model had to produce.
 */
export function messageText(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const message = body as {
    type?: string;
    text?: { body?: unknown };
    [key: string]: unknown;
  };
  if (typeof message.text?.body === "string") return message.text.body;

  const part = message.type ? message[message.type] : undefined;
  if (part && typeof part === "object") {
    const caption = (part as { caption?: unknown }).caption;
    if (typeof caption === "string") return caption;
    return JSON.stringify(part);
  }
  return "";
}

/**
 * Counts a Meta AI reply against the org's AI token allowance, on the same
 * meter our own chatbot uses (`UsageStats.ai*TokensCount`): the reply is the
 * completion, and the customer message it answered is the prompt.
 *
 * Best-effort: metering must never cost the message, so a failure is logged and
 * swallowed. The reply is already stored by the time this runs.
 */
export async function recordMetaAiTokenUsage({
  orgId,
  contactId,
  replyBody,
}: {
  orgId: string;
  contactId: string;
  replyBody: unknown;
}) {
  try {
    // The latest thing the customer said is what the agent was answering.
    const prompt = await prisma.waMessage.findFirst({
      where: { contactId, messageBody: { path: ["exchangeProcess"], equals: "receive" } },
      orderBy: { waCreatedAt: "desc" },
      select: { messageBody: true },
    });
    const promptBody = (prompt?.messageBody as { receive?: { messages?: unknown[] } } | null)
      ?.receive?.messages?.[0];

    const promptTokens = estimateTokens(messageText(promptBody));
    const completionTokens = estimateTokens(messageText(replyBody));
    if (!promptTokens && !completionTokens) return;

    // updateMany rather than update: an org without a stats row yet is skipped
    // instead of throwing, the same way the rest of metering degrades.
    await prisma.usageStats.updateMany({
      where: { orgId },
      data: {
        aiPromptTokensCount: { increment: promptTokens },
        aiCompletionTokensCount: { increment: completionTokens },
      },
    });
  } catch (error) {
    log.error({ err: error, orgId }, "Could not record Meta AI token usage");
  }
}
