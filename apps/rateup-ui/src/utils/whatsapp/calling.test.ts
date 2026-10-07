import { describe, expect, it } from "vitest";

import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { MessagePlatform } from "@/types/enums.ts";

import { formatCallDuration } from "./callFormat.ts";
import {
  isCallPermissionReply,
  parseWaMessage,
  returnMessageContentBasedOnParsedMessage,
} from "./inbox.ts";

function permissionReply(reply: Record<string, unknown>): Partial<WaGetMessagesBody> {
  return {
    sourcePlatform: MessagePlatform.WHATSAPP,
    messageBody: {
      exchangeProcess: "receive",
      receive: {
        messages: [
          {
            from: "919800000000",
            id: "wamid.1",
            timestamp: "1791367200",
            type: "interactive",
            interactive: { type: "call_permission_reply", call_permission_reply: reply },
          },
        ],
      },
    },
  } as unknown as Partial<WaGetMessagesBody>;
}

describe("call permission replies", () => {
  it("parses a temporary grant with its expiry", () => {
    const parsed = parseWaMessage(
      permissionReply({ response: "accept", expiration_timestamp: "1791972000" }),
    );
    expect(parsed.messageType).toBe("call_permission_reply");
    expect(isCallPermissionReply(parsed.messageContent)).toBe(true);
    expect(parsed.messageContent).toEqual({
      accepted: true,
      permanent: false,
      expiresAt: new Date(1791972000 * 1000).toISOString(),
    });
    expect(returnMessageContentBasedOnParsedMessage(parsed, "receive")).toBe("Allowed calls");
  });

  it("previews a refusal", () => {
    const parsed = parseWaMessage(permissionReply({ response: "reject" }));
    expect(returnMessageContentBasedOnParsedMessage(parsed, "receive")).toBe("Declined calls");
  });
});

describe("formatCallDuration", () => {
  it.each([
    [0, "0:00"],
    [65, "1:05"],
    [3723, "1:02:03"],
  ])("%i s → %s", (seconds, expected) => {
    expect(formatCallDuration(seconds)).toBe(expected);
  });
});
