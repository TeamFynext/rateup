import { describe, expect, test } from "vitest";

import { groupRewardIndices, rewardGroupOf, tiersForGroup } from "./rewardGroups";

const silver = { id: "t-silver", name: "Silver", threshold: 2000 };
const gold = { id: "t-gold", name: "Gold", threshold: 8000 };
const vip = { id: "t-vip", name: "VIP", threshold: 5000 };

describe("reward groups", () => {
  test("no restriction means everyone; the VIP id or name means VIP", () => {
    expect(rewardGroupOf({}, [vip])).toBe("base");
    expect(rewardGroupOf({ availableForTiers: [] }, [vip])).toBe("base");
    expect(rewardGroupOf({ availableForTiers: ["t-vip"] }, [vip])).toBe("t-vip");
    expect(rewardGroupOf({ availableForTiers: ["vip"] }, [vip])).toBe("t-vip");
    expect(rewardGroupOf({ availableForTiers: ["t-other"] }, [vip])).toBe("base");
  });

  test("without tiers everything is for everyone", () => {
    expect(rewardGroupOf({ availableForTiers: ["t-vip"] }, [])).toBe("base");
  });

  test("a reward open to several tiers sits in the band of the lowest one", () => {
    expect(rewardGroupOf({ availableForTiers: ["t-gold", "t-silver"] }, [gold, silver])).toBe(
      "t-silver",
    );
    expect(rewardGroupOf({ availableForTiers: ["Gold"] }, [gold, silver])).toBe("t-gold");
  });

  test("indices keep their order within each band, and every tier gets a band", () => {
    const rows = [
      { availableForTiers: [] },
      { availableForTiers: ["t-silver", "t-gold"] },
      {},
      { availableForTiers: ["GOLD"] },
    ];
    expect(groupRewardIndices(rows, [silver, gold])).toEqual({
      base: [0, 2],
      "t-silver": [1],
      "t-gold": [3],
    });
  });

  test("a reward added into a band is gated on that tier and every tier above it", () => {
    expect(tiersForGroup("t-silver", [gold, silver])).toEqual(["t-silver", "t-gold"]);
    expect(tiersForGroup("t-gold", [gold, silver])).toEqual(["t-gold"]);
    expect(tiersForGroup("base", [gold, silver])).toEqual([]);
    expect(tiersForGroup("t-vip", [])).toEqual([]);
  });
});
