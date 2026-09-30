import { describe, expect, test } from "vitest";

import { suggestStageMappings } from "./hubspotStageSuggestions";

const stages = [
  {
    id: "appointmentscheduled",
    label: "Appointment scheduled",
    metadata: { isClosed: "false", probability: "0.2" },
  },
  { id: "qualified", label: "Qualified  ", metadata: { isClosed: "false", probability: "0.4" } },
  { id: "closedwon", label: "Closed won", metadata: { isClosed: "true", probability: "1.0" } },
  { id: "closedlost", label: "Closed lost", metadata: { isClosed: "true", probability: "0.0" } },
];

describe("suggested stage mapping", () => {
  test("Won and Lost columns go to the closed-won and closed-lost stages", () => {
    expect(
      suggestStageMappings(
        [
          { id: "won", name: "Converted", status: "WON" },
          { id: "lost", name: "Dropped", status: "LOST" },
        ],
        stages,
      ),
    ).toEqual({ won: "closedwon", lost: "closedlost" });
  });

  test("open columns match an open stage by name, ignoring case and spacing", () => {
    expect(
      suggestStageMappings(
        [
          { id: "q", name: "qualified", status: "OPEN" },
          { id: "new", name: "New", status: "OPEN" },
        ],
        stages,
      ),
    ).toEqual({ q: "qualified" });
  });

  test("an open column never lands on a closed stage, even by name", () => {
    expect(suggestStageMappings([{ id: "c", name: "Closed won", status: "OPEN" }], stages)).toEqual(
      {},
    );
  });
});
