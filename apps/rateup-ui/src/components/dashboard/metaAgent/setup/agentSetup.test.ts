import { describe, expect, test } from "vitest";

import { getAgentSetupProgress, type AgentSetupInput } from "./agentSetup";

const fresh: AgentSetupInput = {
  eligible: false,
  onboarded: false,
  hasKnowledge: false,
  skillCount: 0,
  uiSkillCount: 0,
  connectorCount: 0,
  rolloutEnabled: false,
};

describe("getAgentSetupProgress", () => {
  test("a fresh agent has nothing done and every counted step left", () => {
    const progress = getAgentSetupProgress(fresh);
    expect(progress.done).toBe(0);
    // Testing has no finished state, so six of the seven steps are counted.
    expect(progress.total).toBe(6);
    expect(progress.status.operate).toBeNull();
    expect(progress.minsLeft).toBe(2 + 5 + 3 + 3 + 5 + 1);
    expect(progress.pct).toBe(0);
    expect(progress.live).toBe(false);
  });

  test("any one kind of knowledge completes the knowledge step", () => {
    const progress = getAgentSetupProgress({ ...fresh, onboarded: true, hasKnowledge: true });
    expect(progress.status.knowledge).toBe(true);
    expect(progress.done).toBe(2);
  });

  test("rollout saved before onboarding is not live", () => {
    const progress = getAgentSetupProgress({ ...fresh, rolloutEnabled: true });
    expect(progress.status.settings).toBe(false);
    expect(progress.live).toBe(false);
  });

  test("onboarded and switched on is live, even with optional steps left", () => {
    const progress = getAgentSetupProgress({
      ...fresh,
      eligible: true,
      onboarded: true,
      hasKnowledge: true,
      skillCount: 2,
      rolloutEnabled: true,
    });
    expect(progress.live).toBe(true);
    expect(progress.done).toBe(4);
    expect(progress.minsLeft).toBe(3 + 5);
  });
});
