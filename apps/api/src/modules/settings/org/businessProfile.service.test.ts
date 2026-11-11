import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    org: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    user: { update: vi.fn() },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));
vi.mock("../user/user.service.js", () => ({ announceSignup: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { announceSignup } from "../user/user.service.js";
import { completeBusinessProfile } from "./businessProfile.service.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  org: { findUniqueOrThrow: Mock; update: Mock };
  user: { update: Mock };
};
const announce = announceSignup as unknown as Mock;

const CREATED = new Date("2026-10-01T00:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  db.org.update.mockImplementation(async ({ data }: { data: { name: string } }) => ({
    id: "org-1",
    name: data.name,
    phone: null,
    hiddenModules: [],
    createdAt: CREATED,
  }));
  db.user.update.mockResolvedValue({ name: "Sam", email: "sam@example.com", createdAt: CREATED });
});

function orgRow(profileCompletedAt: Date | null) {
  db.org.findUniqueOrThrow.mockResolvedValue({
    ownerId: "user-1",
    onboarding: { location: "kept" },
    profileCompletedAt,
    createdAt: CREATED,
  });
}

describe("completeBusinessProfile", () => {
  test("first completion names the org, picks modules from goals and announces the signup", async () => {
    orgRow(null);

    await completeBusinessProfile("org-1", {
      orgName: "Lumen Studio",
      phoneNumber: "+15550100",
      website: "lumen.example",
      goals: ["sell-online"],
    });

    const data = db.org.update.mock.calls[0][0].data;
    expect(data.name).toBe("Lumen Studio");
    expect(data.profileCompletedAt).toBeInstanceOf(Date);
    expect(data.hiddenModules).not.toContain("commerce");
    expect(data.onboarding).toMatchObject({ location: "kept", website: "https://lumen.example" });
    expect(db.user.update.mock.calls[0][0].data).toEqual({ phone: "+15550100" });
    expect(announce).toHaveBeenCalledWith(expect.objectContaining({ orgName: "Lumen Studio" }));
  });

  test("a resubmit keeps the owner's module choices and doesn't announce again", async () => {
    orgRow(new Date("2026-10-02T00:00:00Z"));

    await completeBusinessProfile("org-1", { orgName: "Lumen", goals: ["sell-online"] });

    const data = db.org.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("hiddenModules");
    expect(data).not.toHaveProperty("profileCompletedAt");
    expect(announce).not.toHaveBeenCalled();
  });
});
