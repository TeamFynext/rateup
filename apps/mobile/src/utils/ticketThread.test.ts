import { describe, expect, test, vi } from "vitest";

vi.mock("@/store/inboxStore", () => ({
  isOptimisticId: (id: unknown) => typeof id === "string" && /^\d{10,}$/.test(id),
}));
const { belongsToTicket } = await import("./ticketThread");

const TICKET = "ticket-1";
const legacy = (sourcePlatform: string | null) => ({
  id: `m-${sourcePlatform}`,
  conversationId: null,
  sourcePlatform,
});

describe("belongsToTicket", () => {
  test("a ticket's own messages, and none of another ticket's", () => {
    expect(belongsToTicket({ id: "a", conversationId: TICKET }, TICKET, "WEBCHAT")).toBe(true);
    expect(belongsToTicket({ id: "b", conversationId: "other" }, TICKET, "WEBCHAT")).toBe(false);
  });

  test("a webchat ticket does not take the contact's old WhatsApp history", () => {
    expect(belongsToTicket(legacy("WHATSAPP"), TICKET, "WEBCHAT")).toBe(false);
    expect(belongsToTicket(legacy(null), TICKET, "WEBCHAT")).toBe(false);
    expect(belongsToTicket(legacy("INTERNAL"), TICKET, "WEBCHAT")).toBe(false);
    expect(belongsToTicket(legacy("WEBCHAT"), TICKET, "WEBCHAT")).toBe(true);
  });

  test("a WhatsApp ticket keeps WhatsApp-era history, including rows with no platform", () => {
    expect(belongsToTicket(legacy("WHATSAPP"), TICKET, "WHATSAPP")).toBe(true);
    expect(belongsToTicket(legacy(null), TICKET, "WHATSAPP")).toBe(true);
    expect(belongsToTicket(legacy("INTERNAL"), TICKET, "WHATSAPP")).toBe(true);
    expect(belongsToTicket(legacy("INSTAGRAM"), TICKET, "WHATSAPP")).toBe(false);
  });

  test("a send in flight stays, whatever the ticket", () => {
    expect(
      belongsToTicket({ id: "1762430000000", sourcePlatform: "INTERNAL" }, TICKET, "WEBCHAT"),
    ).toBe(true);
  });

  test("an unknown ticket platform keeps all pre-ticket history", () => {
    expect(belongsToTicket(legacy("WHATSAPP"), TICKET, null)).toBe(true);
  });
});
