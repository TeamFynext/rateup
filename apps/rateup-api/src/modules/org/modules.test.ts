import { describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({ default: {} }));

const { hiddenModulesForGoals } = await import("./modules.js");

describe("hiddenModulesForGoals", () => {
  test("keeps pipeline and the modules a goal asks for", () => {
    expect(hiddenModulesForGoals(["loyalty-program", "unified-inbox"])).toEqual([
      "commerce",
      "web_forms",
      "qr_links",
      "ai_agent",
    ]);
  });

  test("hides every optional module when no goal names one", () => {
    expect(hiddenModulesForGoals(["whatsapp-api"])).toEqual([
      "loyalty",
      "commerce",
      "web_forms",
      "qr_links",
      "ai_agent",
    ]);
  });
});
