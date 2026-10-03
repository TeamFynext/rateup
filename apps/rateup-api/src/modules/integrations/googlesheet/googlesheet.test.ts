import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    integration: { findUnique: vi.fn(), upsert: vi.fn() },
    survey: { updateMany: vi.fn() },
    surveyResponse: { findUnique: vi.fn() },
  },
}));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));
vi.mock("../../whatsapp/flows/flow.service.js", () => ({ getFlowBySurveyId: vi.fn() }));
// The row formatting is the response module's; only the routing is tested here.
vi.mock("../../response/response.service.js", () => ({
  getAnswerValue: (response: Record<string, unknown>, type: string) => response[type],
  getCellData: (response: unknown) => String(response),
  getFormattedResponse: (answer: unknown) => String(answer),
  markdownToPlainText: (text: string) => text,
  toCell: (value: unknown) => (value == null ? "" : String(value)),
}));

const google = vi.hoisted(() => ({
  email: "owner@example.test" as string | undefined,
  setCredentials: vi.fn(),
}));
vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: class {
        setCredentials = google.setCredentials;
        getTokenInfo = vi.fn(async () => ({ email: google.email }));
      },
    },
  },
}));

const sheets = vi.hoisted(() => ({
  byTitle: {} as Record<string, { addRow: ReturnType<typeof vi.fn> }>,
  addSheet: vi.fn(),
  loadInfo: vi.fn(),
  opened: [] as string[],
}));
vi.mock("google-spreadsheet", () => ({
  GoogleSpreadsheet: class {
    sheetsByTitle = sheets.byTitle;
    loadInfo = sheets.loadInfo;
    addSheet = sheets.addSheet;
    constructor(id: string) {
      sheets.opened.push(id);
    }
  },
}));

import prisma from "../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import { getFlowBySurveyId } from "../../whatsapp/flows/flow.service.js";
import { getIntegrationProvider } from "../providers/registry.js";
import { oauthRedirectUri } from "../shared/oauthConnect.js";
import { OAuthConnectError } from "../shared/oauthConnectError.js";
import { GOOGLE_SHEET_REDIRECT_PATH } from "./googlesheet.auth.js";
import { connectGoogleSheet, disconnectGoogleSheet } from "./googlesheet.connect.js";
import { GOOGLE_SHEET_APPEND, googleSheetProvider } from "./googlesheet.provider.js";
import { appendResponseToSheet, surveyHeaderRow } from "./googlesheet.rows.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, Record<string, Mock>>;

const ORG = "11111111-1111-1111-1111-111111111111";

const tokens = {
  accessToken: "ya29.new",
  refreshToken: "1//new",
  expiresAt: "2026-10-02T12:00:00.000Z",
  scope:
    "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email",
  raw: {},
};

const stored = (over: Record<string, unknown> = {}) => ({
  accessToken: "ya29.old",
  refreshToken: "1//old",
  scopes: [],
  userEmail: "owner@example.test",
  driveFolderId: "folder-1",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  google.email = "owner@example.test";
  sheets.byTitle = {};
  sheets.opened = [];
  sheets.addSheet.mockImplementation(async ({ title }: { title: string }) => {
    const sheet = { addRow: vi.fn() };
    sheets.byTitle[title] = sheet;
    return sheet;
  });
  db.integration.findUnique.mockResolvedValue(null);
});

describe("the registry entry", () => {
  test("is listed, connects over OAuth, and acts on survey responses only", () => {
    const provider = getIntegrationProvider("googlesheet");
    expect(provider).toBe(googleSheetProvider);
    expect(provider?.auth).toBe("oauth2");
    expect(provider?.connection).toBe("integration");
    expect(provider?.events).toEqual(["survey.response_submitted"]);
  });

  test("keeps the redirect URI already registered with Google", () => {
    expect(GOOGLE_SHEET_REDIRECT_PATH).toBe("/auth/oauth2callback");
    expect(oauthRedirectUri("googlesheet", googleSheetProvider.oauth)).toMatch(
      /\/auth\/oauth2callback$/,
    );
    // Everyone else still returns to the shared page.
    expect(oauthRedirectUri("hubspot")).toMatch(
      /\/dashboard\/settings\/integrations\/hubspot\/callback$/,
    );
  });

  test("asks Google for a refresh token on every connect", () => {
    expect(googleSheetProvider.oauth?.extraAuthorizeParams).toEqual({
      access_type: "offline",
      prompt: "consent",
    });
  });
});

describe("connectGoogleSheet", () => {
  test("saves the tokens and the account's address for the org", async () => {
    await connectGoogleSheet(ORG, tokens);

    const call = db.integration.upsert.mock.calls[0][0];
    expect(call.where).toEqual({
      orgid_integration_name_unique: { orgId: ORG, name: "googlesheet" },
    });
    expect(call.create).toMatchObject({ orgId: ORG, name: "googlesheet" });
    expect(call.create.credential).toEqual({
      accessToken: "ya29.new",
      refreshToken: "1//new",
      expiryDate: Date.parse(tokens.expiresAt),
      scopes: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      userEmail: "owner@example.test",
      driveFolderId: null,
    });
    expect(call.update).toMatchObject({ active: true });
  });

  test("a reconnect to the same account keeps its Drive folder", async () => {
    db.integration.findUnique.mockResolvedValue({ credential: stored() });

    await connectGoogleSheet(ORG, tokens);

    expect(db.integration.upsert.mock.calls[0][0].update.credential.driveFolderId).toBe("folder-1");
  });

  test("a reconnect to another account forgets the folder it cannot see", async () => {
    db.integration.findUnique.mockResolvedValue({ credential: stored() });
    google.email = "someone-else@example.test";

    await connectGoogleSheet(ORG, tokens);

    expect(db.integration.upsert.mock.calls[0][0].update.credential.driveFolderId).toBeNull();
  });

  test("keeps the old refresh token when Google sends none", async () => {
    db.integration.findUnique.mockResolvedValue({ credential: stored() });

    await connectGoogleSheet(ORG, { ...tokens, refreshToken: undefined });

    expect(db.integration.upsert.mock.calls[0][0].update.credential.refreshToken).toBe("1//old");
  });

  test("refuses a first connect without a refresh token", async () => {
    await expect(connectGoogleSheet(ORG, { ...tokens, refreshToken: undefined })).rejects.toThrow(
      OAuthConnectError,
    );
    expect(db.integration.upsert).not.toHaveBeenCalled();
  });
});

describe("disconnectGoogleSheet", () => {
  test("forgets every survey's spreadsheet in the org", async () => {
    await disconnectGoogleSheet({ orgId: ORG } as never);

    expect(db.survey.updateMany).toHaveBeenCalledWith({
      where: { orgId: ORG },
      data: { spreadSheetId: null },
    });
  });
});

describe("handleEvent", () => {
  const event = {
    type: "survey.response_submitted" as const,
    response: { id: "resp-1", contactId: null, platform: "WEB", createdAt: "2026-10-02T00:00:00Z" },
  };
  const withSheet = (spreadSheetId: string | null) =>
    db.surveyResponse.findUnique.mockResolvedValue({
      surveyTeamMap: { survey: { spreadSheetId } },
    });

  test("queues one append for a survey that has a spreadsheet", async () => {
    withSheet("sheet-1");

    await googleSheetProvider.handleEvent(event, { orgId: ORG, integration: { id: "i" } as never });

    expect(integrationTriggerQueue.add).toHaveBeenCalledWith(
      GOOGLE_SHEET_APPEND,
      {
        integrationName: "googlesheet",
        triggerKey: GOOGLE_SHEET_APPEND,
        orgId: ORG,
        data: { responseId: "resp-1" },
      },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  test("queues nothing for a survey that was never synced", async () => {
    withSheet(null);

    await googleSheetProvider.handleEvent(event, { orgId: ORG, integration: { id: "i" } as never });

    expect(integrationTriggerQueue.add).not.toHaveBeenCalled();
  });

  test("queues nothing without a connection", async () => {
    await googleSheetProvider.handleEvent(event, { orgId: ORG, integration: null });

    expect(db.surveyResponse.findUnique).not.toHaveBeenCalled();
    expect(integrationTriggerQueue.add).not.toHaveBeenCalled();
  });
});

describe("appendResponseToSheet", () => {
  const integration = { credential: stored() };
  const questions = [
    {
      id: "q1",
      type: "TextInput",
      title: { en: "Name", hi: "नाम" },
      description: {},
      features: {},
    },
  ];
  const response = (over: Record<string, unknown> = {}) => ({
    responses: [{ questionId: "q1", type: "TextInput", response: { TextInput: "Ann" } }],
    language: "en",
    createdAt: new Date("2026-10-02T09:30:00"),
    tag: "vip",
    Contact: { phone: "919876543210" },
    surveyTeamMap: {
      survey: { spreadSheetId: "sheet-1", questions, id: "survey-1" },
      team: { name: "Kochi", orgId: ORG },
    },
    ...over,
  });

  test("does nothing for a survey with no spreadsheet", async () => {
    db.surveyResponse.findUnique.mockResolvedValue(
      response({
        surveyTeamMap: { survey: { spreadSheetId: null, questions, id: "s" }, team: {} },
      }),
    );

    expect(await appendResponseToSheet(integration, "resp-1")).toBe("no_sheet");
    expect(sheets.opened).toEqual([]);
  });

  test("adds the row to its language's tab, as the connected account", async () => {
    db.surveyResponse.findUnique.mockResolvedValue(response());
    const tab = { addRow: vi.fn() };
    sheets.byTitle.en = tab;

    expect(await appendResponseToSheet(integration, "resp-1")).toBe("appended");

    expect(google.setCredentials).toHaveBeenCalledWith({ refresh_token: "1//old" });
    expect(sheets.opened).toEqual(["sheet-1"]);
    expect(sheets.addSheet).not.toHaveBeenCalled();
    expect(tab.addRow).toHaveBeenCalledWith(
      expect.objectContaining({
        "Created At": "02-10-2026 09:30",
        "1_Name": "Ann",
        Team: "Kochi",
        "Respondent's Mobile Number": "919876543210",
        Tag: "vip",
      }),
    );
  });

  // It used to be dropped: only a full sync created a language's tab.
  test("creates a missing language tab with its header instead of losing the row", async () => {
    db.surveyResponse.findUnique.mockResolvedValue(response({ language: "hi" }));

    await appendResponseToSheet(integration, "resp-1");

    expect(sheets.addSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "hi",
        headerValues: surveyHeaderRow(questions as never, "hi"),
      }),
    );
    expect(sheets.byTitle.hi.addRow).toHaveBeenCalledWith(
      expect.objectContaining({ "1_नाम": "Ann" }),
    );
  });

  test("an anonymous response leaves the respondent column empty", async () => {
    db.surveyResponse.findUnique.mockResolvedValue(response({ Contact: null }));
    sheets.byTitle.en = { addRow: vi.fn() };

    await appendResponseToSheet(integration, "resp-1");

    expect(sheets.byTitle.en.addRow.mock.calls[0][0]["Respondent's Mobile Number"]).toBe("");
  });

  test("a WhatsApp Flow survey's row goes in the flow's single tab, whatever the language", async () => {
    (getFlowBySurveyId as unknown as Mock).mockResolvedValue({
      version: 2,
      json: {
        screens: [
          {
            layout: { children: [{ id: "q1", name: "q1", type: "TextInput", label: "Your name" }] },
          },
        ],
      },
    });
    db.surveyResponse.findUnique.mockResolvedValue(
      response({ language: "ml", responses: [{ questionId: "q1", response: "Ann" }] }),
    );

    await appendResponseToSheet(integration, "resp-1");

    expect(sheets.addSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "en",
        headerValues: ["Created At", "Your name", "Respondent's Mobile Number", "Tag", "Team"],
      }),
    );
    expect(sheets.byTitle.en.addRow).toHaveBeenCalledWith(
      expect.objectContaining({ "Your name": "Ann" }),
    );
  });

  test("throws when the org is not connected, so the job fails visibly", async () => {
    db.surveyResponse.findUnique.mockResolvedValue(response());

    await expect(appendResponseToSheet({ credential: null }, "resp-1")).rejects.toThrow(
      "Google Sheets is not connected",
    );
  });
});

describe("processJob", () => {
  test("runs the append for its job, and ignores any other", async () => {
    db.surveyResponse.findUnique.mockResolvedValue(null);
    const job = (triggerKey: string) => ({
      integrationName: "googlesheet",
      triggerKey,
      orgId: ORG,
      data: { responseId: "resp-1" },
    });

    await googleSheetProvider.processJob?.({ credential: stored() } as never, job("other"), {
      finalAttempt: false,
    });
    expect(db.surveyResponse.findUnique).not.toHaveBeenCalled();

    await googleSheetProvider.processJob?.(
      { credential: stored() } as never,
      job(GOOGLE_SHEET_APPEND),
      {
        finalAttempt: false,
      },
    );
    expect(db.surveyResponse.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "resp-1" } }),
    );
  });
});
