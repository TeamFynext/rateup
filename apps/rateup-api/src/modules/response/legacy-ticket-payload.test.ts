import { describe, expect, test } from "vitest";

import { questionSchema } from "../question/question.schema.js";
import { createResponseInputSchema } from "./response.schema.js";

// Ticket boards were removed. Clients and stored survey JSON in the wild can still
// carry the old ticket fields; those must be ignored, never rejected.
describe("legacy ticket payloads", () => {
  test("a submit still sending shouldRaiseTicket/selectedColumnId is accepted and stripped", () => {
    const parsed = createResponseInputSchema.safeParse({
      surveyTeamMapId: "11111111-1111-1111-1111-111111111111",
      responses: [],
      language: "en",
      location: {},
      shouldRaiseTicket: true,
      selectedColumnId: "col-1",
      checkUniqueDevice: false,
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty("shouldRaiseTicket");
    expect(parsed.data).not.toHaveProperty("selectedColumnId");
  });

  test("a question still carrying a stored ticketIssue rule is accepted and stripped", () => {
    const parsed = questionSchema.safeParse({
      id: "q1",
      type: "Rating",
      title: { en: "How was it?" },
      description: { en: "" },
      ticketIssue: { minRating: 3, selectedBoardId: "b", selectedColumnId: "c" },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty("ticketIssue");
  });
});
