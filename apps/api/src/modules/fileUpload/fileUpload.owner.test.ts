import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("supertokens-node/recipe/session/index.js", () => ({
  default: { getSession: vi.fn() },
}));
vi.mock("../../utils/prisma.js", () => ({
  default: { surveyTeamMap: { findUnique: vi.fn() } },
}));
vi.mock("../user/user.service.js", () => ({ getOrgIdAndRole: vi.fn() }));

import Session from "supertokens-node/recipe/session/index.js";
import prisma from "../../utils/prisma.js";
import { getOrgIdAndRole } from "../user/user.service.js";
import { resolveUploadOwner, UploadOwnerError } from "./fileUpload.owner.js";

type Mock = ReturnType<typeof vi.fn>;
const getSession = Session.getSession as unknown as Mock;
const findMap = (prisma as any).surveyTeamMap.findUnique as Mock;
const MAP = "3f8a1e2c-5b7d-4c9e-8a1b-2d3e4f5a6b7c";

const part = (fields: Record<string, unknown> = {}) => ({ fields }) as any;
const field = (value: string) => ({ type: "field", value });

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue(undefined);
});

describe("resolveUploadOwner", () => {
  test("a session uploads for the org in its access token", async () => {
    getSession.mockResolvedValue({
      getAccessTokenPayload: () => ({ orgId: "org-1" }),
      getUserId: () => "u1",
    });

    await expect(resolveUploadOwner({} as any, {} as any, part())).resolves.toEqual({
      orgId: "org-1",
      anonymous: false,
    });
    expect(findMap).not.toHaveBeenCalled();
  });

  test("a session without an org in its token falls back to the membership", async () => {
    getSession.mockResolvedValue({ getAccessTokenPayload: () => ({}), getUserId: () => "u1" });
    (getOrgIdAndRole as unknown as Mock).mockResolvedValue({ orgId: "org-9" });

    await expect(resolveUploadOwner({} as any, {} as any, part())).resolves.toMatchObject({
      orgId: "org-9",
    });
  });

  test("an anonymous upload naming no form link is refused", async () => {
    await expect(resolveUploadOwner({} as any, {} as any, part())).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  test("an anonymous upload with a malformed link is refused before any lookup", async () => {
    await expect(
      resolveUploadOwner({} as any, {} as any, part({ surveyTeamMapId: field("x' OR 1=1") })),
    ).rejects.toBeInstanceOf(UploadOwnerError);
    expect(findMap).not.toHaveBeenCalled();
  });

  test("an anonymous upload for an active form is keyed under that form's org", async () => {
    findMap.mockResolvedValue({ team: { orgId: "form-org" }, survey: { active: true } });

    await expect(
      resolveUploadOwner({} as any, {} as any, part({ surveyTeamMapId: field(MAP) })),
    ).resolves.toEqual({ orgId: "form-org", anonymous: true });
    expect(findMap.mock.calls[0][0].where).toEqual({ id: MAP });
  });

  test("a short link id is looked up by its short url", async () => {
    findMap.mockResolvedValue({ team: { orgId: "form-org" }, survey: { active: true } });

    await resolveUploadOwner({} as any, {} as any, part({ surveyTeamMapId: field("abCD12_-") }));

    expect(findMap.mock.calls[0][0].where).toEqual({ shortUrlId: "abCD12_-" });
  });

  test("an unknown or inactive form refuses the upload", async () => {
    findMap.mockResolvedValueOnce(null);
    await expect(
      resolveUploadOwner({} as any, {} as any, part({ surveyTeamMapId: field(MAP) })),
    ).rejects.toMatchObject({ statusCode: 404 });

    findMap.mockResolvedValueOnce({ team: { orgId: "o" }, survey: { active: false } });
    await expect(
      resolveUploadOwner({} as any, {} as any, part({ surveyTeamMapId: field(MAP) })),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
