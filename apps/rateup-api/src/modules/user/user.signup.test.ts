import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => {
  const tx = {
    user: { create: vi.fn() },
    org: { create: vi.fn() },
    orgMember: { create: vi.fn() },
    team: { create: vi.fn() },
    teamMember: { create: vi.fn() },
  };
  return {
    default: {
      __tx: tx,
      $transaction: vi.fn(async (cb: (client: unknown) => Promise<unknown>) => cb(tx)),
      $disconnect: vi.fn(),
    },
    excludeFields: vi.fn(),
  };
});

vi.mock("../subscription/subscription.service.js", () => ({
  createFreePlanSubscription: vi.fn(),
}));
vi.mock("../survey/survey.service.js", () => ({ cloneSurvey: vi.fn() }));
vi.mock("../referrals/referrals.service.js", () => ({ updateReferral: vi.fn() }));
vi.mock("../../utils/hubspot.js", () => ({
  createHubSpotCompany: vi.fn(),
  createHubSpotContact: vi.fn(),
}));
vi.mock("../../utils/supertoken/supertoken.js", () => ({
  deleteSuperTokenUserForId: vi.fn(),
  getUserInfo: vi.fn(),
  getAsRecipeUserIdType: vi.fn(),
}));
vi.mock("supertokens-node", () => ({ default: { getUser: vi.fn() } }));
vi.mock("supertokens-node/recipe/session/index.js", () => ({
  default: { getSession: vi.fn() },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../utils/prisma.js";
import { createFreePlanSubscription } from "../subscription/subscription.service.js";
import { cloneSurvey } from "../survey/survey.service.js";
import { updateReferral } from "../referrals/referrals.service.js";
import { createHubSpotCompany, createHubSpotContact } from "../../utils/hubspot.js";
import { log } from "../../utils/logger.js";
import { Role } from "../../utils/enums/index.js";
import { UserRecipes } from "../../types/enums.js";
import { defaultTheme } from "../surveyTheme/defaultTheme.js";
import { createUserSignup } from "./user.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  __tx: {
    user: { create: Mock };
    org: { create: Mock };
    orgMember: { create: Mock };
    team: { create: Mock };
    teamMember: { create: Mock };
  };
  $transaction: Mock;
  $disconnect: Mock;
};
const tx = db.__tx;

const cloneSurveyMock = cloneSurvey as unknown as Mock;
const updateReferralMock = updateReferral as unknown as Mock;
const createCompanyMock = createHubSpotCompany as unknown as Mock;
const createContactMock = createHubSpotContact as unknown as Mock;
const createSubscriptionMock = createFreePlanSubscription as unknown as Mock;

const NEW_USER = { id: "user-1", createdAt: new Date("2026-01-01T00:00:00Z") };
const NEW_ORG = { id: "org-1", createdAt: new Date("2026-01-02T00:00:00Z") };

/** The minimum a caller must supply; individual tests widen it. */
function signupInput(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "owner@acme.com",
    name: "Owner",
    orgName: "Acme",
    phone: "+15550001",
    phoneNumber: "+15550001",
    recipeName: UserRecipes.EmailPassword,
    ...overrides,
  } as any;
}

const originalSampleSurveyId = process.env.INITIAL_SAMPLE_SURVEY_ID;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.INITIAL_SAMPLE_SURVEY_ID = "sample-survey-1";

  db.$transaction.mockImplementation(async (cb: (client: unknown) => Promise<unknown>) => cb(tx));
  tx.user.create.mockResolvedValue(NEW_USER);
  tx.org.create.mockResolvedValue(NEW_ORG);
  tx.orgMember.create.mockResolvedValue({ id: "member-1" });
  tx.team.create.mockResolvedValue({ id: "team-1" });
  tx.teamMember.create.mockResolvedValue({ teamId: "team-1", userId: "user-1" });
  createCompanyMock.mockResolvedValue("hs-company-1");
});

afterEach(() => {
  if (originalSampleSurveyId === undefined) {
    delete process.env.INITIAL_SAMPLE_SURVEY_ID;
  } else {
    process.env.INITIAL_SAMPLE_SURVEY_ID = originalSampleSurveyId;
  }
});

describe("createUserSignup - records created in the transaction", () => {
  test("creates the user, storing phoneNumber as the phone", async () => {
    await createUserSignup(signupInput({ prefLanguage: "en" }));

    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        id: "user-1",
        email: "owner@acme.com",
        name: "Owner",
        phone: "+15550001",
        recipeName: UserRecipes.EmailPassword,
        prefLanguage: "en",
      },
    });
  });

  test("creates the org owned by the new user, with a default survey theme", async () => {
    await createUserSignup(signupInput());

    const data = tx.org.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      name: "Acme",
      ownerId: "user-1",
      phone: "+15550001",
    });
    expect(data.surveyThemes).toEqual({
      create: { name: "Default Theme", theme: defaultTheme },
    });
  });

  test("stores the onboarding answers on the org", async () => {
    await createUserSignup(
      signupInput({
        industry: "Retail",
        location: "Berlin",
        website: "https://acme.com",
        goals: ["reviews"],
        integrationsSelected: ["shopify"],
        teamSize: "1-10",
      }),
    );

    expect(tx.org.create.mock.calls[0][0].data.onboarding).toEqual({
      industry: "Retail",
      location: "Berlin",
      website: "https://acme.com",
      goals: ["reviews"],
      integrationsSelected: ["shopify"],
      teamSize: "1-10",
    });
  });

  test("normalises missing and empty onboarding answers to null", async () => {
    await createUserSignup(signupInput({ goals: [], integrationsSelected: [] }));

    expect(tx.org.create.mock.calls[0][0].data.onboarding).toEqual({
      industry: null,
      location: null,
      website: null,
      goals: null,
      integrationsSelected: null,
      teamSize: null,
    });
  });

  test("makes the signing-up user a SUPER_ADMIN of their org", async () => {
    await createUserSignup(signupInput());

    expect(tx.orgMember.create).toHaveBeenCalledWith({
      data: { orgId: "org-1", userId: "user-1", role: Role.SUPER_ADMIN },
    });
  });

  test("creates the Main team and adds the user to it", async () => {
    await createUserSignup(signupInput());

    expect(tx.team.create).toHaveBeenCalledWith({
      data: { name: "Main", code: "MAIN", orgId: "org-1" },
    });
    expect(tx.teamMember.create).toHaveBeenCalledWith({
      data: { teamId: "team-1", userId: "user-1" },
    });
  });

  test("provisions the free-plan subscription inside the same transaction", async () => {
    await createUserSignup(signupInput({ planId: "plan-free" }));

    expect(createSubscriptionMock).toHaveBeenCalledWith("org-1", tx, "plan-free");
  });

  test("provisions the free plan without a planId when none is given", async () => {
    await createUserSignup(signupInput());

    expect(createSubscriptionMock).toHaveBeenCalledWith("org-1", tx, undefined);
  });

  test("releases the connection once signup completes", async () => {
    await createUserSignup(signupInput());

    expect(db.$disconnect).toHaveBeenCalled();
  });
});

describe("createUserSignup - initial sample survey", () => {
  test("clones the sample survey into the new team", async () => {
    await createUserSignup(signupInput());

    expect(cloneSurveyMock).toHaveBeenCalledWith("sample-survey-1", "user-1", ["team-1"], true);
  });

  test("logs instead of cloning when no sample survey is configured", async () => {
    delete process.env.INITIAL_SAMPLE_SURVEY_ID;

    await createUserSignup(signupInput());

    expect(cloneSurveyMock).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalledWith("Initial Survey creation failed...surveyId...missing");
  });

  test("still completes signup when cloning the sample survey fails", async () => {
    cloneSurveyMock.mockRejectedValue(new Error("clone boom"));

    await expect(createUserSignup(signupInput())).resolves.not.toThrow();

    expect(createCompanyMock).toHaveBeenCalled();
  });
});

describe("createUserSignup - referrals", () => {
  test("credits the referral code as a signup", async () => {
    await createUserSignup(signupInput({ referralCode: "REF123" }));

    expect(updateReferralMock).toHaveBeenCalledWith("REF123", "signup");
  });

  test("skips the referral update when no code was supplied", async () => {
    await createUserSignup(signupInput());

    expect(updateReferralMock).not.toHaveBeenCalled();
  });

  test("still completes signup when crediting the referral fails", async () => {
    updateReferralMock.mockRejectedValue(new Error("referral boom"));

    await expect(createUserSignup(signupInput({ referralCode: "REF123" }))).resolves.not.toThrow();

    expect(createCompanyMock).toHaveBeenCalled();
  });
});

describe("createUserSignup - HubSpot sync", () => {
  test("creates the company and then the contact attached to it", async () => {
    await createUserSignup(signupInput());

    expect(createCompanyMock).toHaveBeenCalledWith({
      name: "Acme",
      joined_date: NEW_ORG.createdAt,
      owner_email: "owner@acme.com",
    });
    expect(createContactMock).toHaveBeenCalledWith(
      {
        firstname: "Owner",
        email: "owner@acme.com",
        phone: "+15550001",
        company: "Acme",
        joined_date: NEW_USER.createdAt,
      },
      "hs-company-1",
    );
  });

  test("sends an undefined phone rather than null when the user has none", async () => {
    await createUserSignup(signupInput({ phone: null }));

    expect(createContactMock.mock.calls[0][0].phone).toBeUndefined();
  });
});

describe("createUserSignup - failures", () => {
  test("rethrows and logs when the transaction fails", async () => {
    const failure = new Error("unique constraint");
    db.$transaction.mockRejectedValue(failure);

    await expect(createUserSignup(signupInput())).rejects.toThrow("unique constraint");
    expect(log.error).toHaveBeenCalledWith("create user transaction failed %o", failure);
  });

  test("does not touch survey cloning or HubSpot when the transaction fails", async () => {
    db.$transaction.mockRejectedValue(new Error("boom"));

    await expect(createUserSignup(signupInput())).rejects.toThrow();

    expect(cloneSurveyMock).not.toHaveBeenCalled();
    expect(createCompanyMock).not.toHaveBeenCalled();
    expect(createContactMock).not.toHaveBeenCalled();
  });

  test("releases the connection even when signup fails", async () => {
    db.$transaction.mockRejectedValue(new Error("boom"));

    await expect(createUserSignup(signupInput())).rejects.toThrow();

    expect(db.$disconnect).toHaveBeenCalled();
  });

  test("propagates a HubSpot failure to the caller", async () => {
    createCompanyMock.mockRejectedValue(new Error("hubspot down"));

    await expect(createUserSignup(signupInput())).rejects.toThrow("hubspot down");
  });
});
