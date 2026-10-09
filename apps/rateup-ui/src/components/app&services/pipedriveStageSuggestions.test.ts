import { describe, expect, test } from "vitest";

import { suggestPipedriveStageMappings } from "./pipedriveStageSuggestions";

const stages = [
  { id: 11, name: "Qualified" },
  { id: 12, name: "Proposal  made" },
];

describe("suggested Pipedrive stage mapping", () => {
  test("open columns match a stage by name, ignoring case and spacing", () => {
    expect(
      suggestPipedriveStageMappings(
        [
          { id: "a", name: "qualified", status: "OPEN" },
          { id: "b", name: "Proposal Made ", status: "OPEN" },
          { id: "c", name: "New", status: "OPEN" },
        ],
        stages,
      ),
    ).toEqual({ a: "11", b: "12" });
  });

  test("Won and Lost columns are never mapped, even by a matching name", () => {
    expect(
      suggestPipedriveStageMappings(
        [
          { id: "won", name: "Qualified", status: "WON" },
          { id: "lost", name: "Qualified", status: "LOST" },
        ],
        stages,
      ),
    ).toEqual({});
  });
});
