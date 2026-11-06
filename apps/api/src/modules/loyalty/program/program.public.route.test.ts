import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    loyaltyProgram: { findUnique: vi.fn() },
    whatsappSettings: { findFirst: vi.fn() },
  },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../../utils/rateLimit.js", () => ({ rateLimit: vi.fn(() => async () => {}) }));

import prisma from "../../../utils/prisma.js";
import {
  getPublicLoyaltyProgramHandler,
  loyaltyProgramPublicRoutes,
} from "./program.public.route.js";
import { getPublicLoyaltyProgramInfo } from "./program.service.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  loyaltyProgram: Record<string, Mock>;
  whatsappSettings: Record<string, Mock>;
};

const PROGRAM = {
  name: "Beans Rewards",
  businessName: "Beans & Co",
  currencyName: "Beans",
  logoUrl: "https://cdn.example.com/logo.png",
  brandColor: "#1C518E",
  heroImageUrl: null,
  signupBonus: 100,
  signupBonusEnabled: true,
  status: "active",
  whatsappSettingsId: null,
};

function reply() {
  const rep: Record<string, Mock> = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.loyaltyProgram.findUnique.mockResolvedValue(PROGRAM);
  db.whatsappSettings.findFirst.mockResolvedValue(null);
});

describe("getPublicLoyaltyProgramInfo", () => {
  test("exposes branding and the joining bonus, never the channel id", async () => {
    const info = await getPublicLoyaltyProgramInfo("org-1");

    expect(info).toEqual({
      name: "Beans Rewards",
      businessName: "Beans & Co",
      currencyName: "Beans",
      logoUrl: "https://cdn.example.com/logo.png",
      brandColor: "#1C518E",
      heroImageUrl: null,
      signupBonus: 100,
      status: "active",
      whatsappNumber: null,
    });
    expect(info).not.toHaveProperty("whatsappSettingsId");
  });

  test("advertises no joining bonus while it is switched off", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue({ ...PROGRAM, signupBonusEnabled: false });

    const info = await getPublicLoyaltyProgramInfo("org-1");

    expect(info?.signupBonus).toBe(0);
    expect(info).not.toHaveProperty("signupBonusEnabled");
  });

  test("returns the business's live WhatsApp number as digits", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue({ phone: "+91 98765 43210" });

    expect((await getPublicLoyaltyProgramInfo("org-1"))?.whatsappNumber).toBe("919876543210");
    expect(db.whatsappSettings.findFirst.mock.calls[0][0].where).toMatchObject({
      orgId: "org-1",
      status: "ACTIVE",
    });
  });

  test("prefers the channel the programme is wired to", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue({ ...PROGRAM, whatsappSettingsId: "wa-2" });
    db.whatsappSettings.findFirst.mockResolvedValueOnce({ phone: "919000000002" });

    expect((await getPublicLoyaltyProgramInfo("org-1"))?.whatsappNumber).toBe("919000000002");
    expect(db.whatsappSettings.findFirst.mock.calls[0][0].where).toMatchObject({ id: "wa-2" });
  });

  test("an org with no programme is null", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(null);

    expect(await getPublicLoyaltyProgramInfo("org-1")).toBeNull();
  });
});

describe("getPublicLoyaltyProgramHandler", () => {
  test("answers 200 with the public info", async () => {
    const rep = reply();

    await getPublicLoyaltyProgramHandler({ params: { orgId: "org-1" } } as never, rep as never);

    expect(rep.code).toHaveBeenCalledWith(200);
    expect(rep.send.mock.calls[0][0]).toMatchObject({ name: "Beans Rewards" });
  });

  test("answers 404 when there is no programme", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(null);
    const rep = reply();

    await getPublicLoyaltyProgramHandler({ params: { orgId: "org-1" } } as never, rep as never);

    expect(rep.code).toHaveBeenCalledWith(404);
  });

  test("registers one rate-limited GET by org id", async () => {
    const server = { get: vi.fn() };

    await loyaltyProgramPublicRoutes(server as never);

    expect(server.get).toHaveBeenCalledTimes(1);
    expect(server.get.mock.calls[0][0]).toBe("/:orgId");
    expect(server.get.mock.calls[0][1]).toHaveProperty("preHandler");
  });
});
