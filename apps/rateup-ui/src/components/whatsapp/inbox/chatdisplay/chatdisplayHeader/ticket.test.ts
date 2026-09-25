import { describe, expect, it } from "vitest";

import { WaMessageAssignStatus } from "@/types/enums.ts";

import { deriveStatus, isTicketClosed } from "./ticket.ts";

describe("deriveStatus", () => {
  it("names an unresolved ticket apart from the other closed outcomes", () => {
    expect(deriveStatus({ conversationStatus: WaMessageAssignStatus.UNRESOLVED }).id).toBe(
      "unresolved",
    );
    expect(deriveStatus({ conversationStatus: WaMessageAssignStatus.RESOLVED }).id).toBe("closed");
    expect(deriveStatus({ conversationStatus: WaMessageAssignStatus.CLOSED }).id).toBe("closed");
  });

  it("still treats an unresolved ticket as closed", () => {
    expect(isTicketClosed({ conversationStatus: WaMessageAssignStatus.UNRESOLVED })).toBe(true);
    expect(isTicketClosed({ conversationStatus: WaMessageAssignStatus.ASSIGNED })).toBe(false);
  });
});
