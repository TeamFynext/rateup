import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    surveyResponse: { create: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    surveyTeamMap: { findFirst: vi.fn() },
    contact: { findFirst: vi.fn() },
  },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../stats/stats.service.js", () => ({ updateMonthlyStat: vi.fn() }));
vi.mock("../webhook/webhook.events.js", () => ({ emitWebhookEvents: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { emitWebhookEvents } from "../webhook/webhook.events.js";
import { createResponse } from "./response.service.js";
import { announceSurveyResponseCreated, surveyResponseCreatedData } from "./response.webhook.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as { surveyResponse: Record<string, Mock> };
const emit = emitWebhookEvents as unknown as Mock;

const ORG = "11111111-1111-4111-8111-111111111111";

function row(over: Record<string, unknown> = {}) {
  return {
    id: "resp-1",
    createdAt: new Date("2026-10-16T10:00:00.000Z"),
    language: "en",
    tag: "",
    platform: "WHATSAPP",
    responses: [
      { questionId: "q1", type: "RATING", response: { RATING: 5 } },
      { questionId: "q2", type: "TEXT", response: { TEXT: "Great" } },
    ],
    encryptedResponses: null,
    surveyTeamMap: {
      teamId: "team-1",
      surveyId: "survey-1",
      survey: {
        title: "After your visit",
        questions: [
          { id: "q1", title: { en: "How was it?" } },
          { id: "q2", title: { en: "Anything else?" } },
        ],
      },
      team: { orgId: ORG },
    },
    Contact: { phone: "919000000001" },
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  emit.mockResolvedValue(1);
  db.surveyResponse.findUnique.mockResolvedValue(null);
  db.surveyResponse.create.mockResolvedValue(row());
});

describe("surveyResponseCreatedData", () => {
  test("survey id and title, platform, and the response in the partner API's shape", () => {
    expect(surveyResponseCreatedData(row() as never)).toEqual({
      survey: { id: "survey-1", title: "After your visit", type: null },
      platform: "WHATSAPP",
      response: {
        id: "resp-1",
        createdAt: "2026-10-16T10:00:00.000Z",
        teamId: "team-1",
        language: "en",
        tag: null,
        phone: "919000000001",
        encrypted: false,
        encryptedAnswers: null,
        answers: [
          { questionId: "q1", type: "RATING", title: "How was it?", value: 5 },
          { questionId: "q2", type: "TEXT", title: "Anything else?", value: "Great" },
        ],
      },
    });
  });

  test("an encrypted response carries no answers", () => {
    const data = surveyResponseCreatedData(
      row({ encryptedResponses: "cipher", responses: [] }) as never,
    );

    expect(data.response).toMatchObject({
      encrypted: true,
      encryptedAnswers: "cipher",
      answers: [],
    });
  });

  test("an anonymous response has a null phone", () => {
    expect(surveyResponseCreatedData(row({ Contact: null }) as never).response.phone).toBeNull();
  });
});

describe("announceSurveyResponseCreated", () => {
  test("emits survey.response.created for the response's org with a lazy payload", async () => {
    await announceSurveyResponseCreated(row() as never);

    const [events] = emit.mock.calls[0]!;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ orgId: ORG, type: "survey.response.created" });
    expect(typeof events[0].data).toBe("function");
    expect(events[0].data().survey.id).toBe("survey-1");
  });

  test("a WhatsApp Flow response is also announced as flow.response.created, with the flow", async () => {
    const flowRow = row({
      surveyTeamMap: {
        ...row().surveyTeamMap,
        survey: {
          ...row().surveyTeamMap.survey,
          type: "waFlow",
          WaFlow: {
            dbFlowId: "flow-db-1",
            flowId: "123456789",
            name: "Visit feedback",
            categories: ["SURVEY"],
          },
        },
      },
    });

    await announceSurveyResponseCreated(flowRow as never);

    const [events] = emit.mock.calls[0]!;
    expect(events.map((e: { type: string }) => e.type)).toEqual([
      "survey.response.created",
      "flow.response.created",
    ]);
    const data = events[1].data();
    expect(data.flow).toEqual({
      id: "flow-db-1",
      metaFlowId: "123456789",
      name: "Visit feedback",
      categories: ["SURVEY"],
    });
    expect(data.survey).toEqual({ id: "survey-1", title: "After your visit", type: "waFlow" });
    expect(data.response.answers).toHaveLength(2);
    expect(events[0].data().survey.type).toBe("waFlow");
  });

  test("a web or chat survey is not a flow response", async () => {
    await announceSurveyResponseCreated(
      row({
        surveyTeamMap: {
          ...row().surveyTeamMap,
          survey: { ...row().surveyTeamMap.survey, type: "whatsapp" },
        },
      }) as never,
    );

    expect(emit.mock.calls[0]![0].map((e: { type: string }) => e.type)).toEqual([
      "survey.response.created",
    ]);
  });
});

describe("createResponse announces a fresh response only", () => {
  test("a new row is announced", async () => {
    await createResponse({ surveyTeamMapId: "stm-1", responses: [], language: "en" } as never);

    expect(emit).toHaveBeenCalledTimes(1);
  });

  test("an idempotent replay is not announced again", async () => {
    db.surveyResponse.findUnique.mockResolvedValue(row());

    await createResponse({
      surveyTeamMapId: "stm-1",
      responses: [],
      language: "en",
      idempotencyKey: "k",
    } as never);

    expect(db.surveyResponse.create).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  test("a failed insert announces nothing", async () => {
    db.surveyResponse.create.mockRejectedValue(new Error("db down"));

    await expect(
      createResponse({ surveyTeamMapId: "stm-1", responses: [], language: "en" } as never),
    ).rejects.toThrow("db down");
    expect(emit).not.toHaveBeenCalled();
  });

  test("does not wait on the webhook", async () => {
    emit.mockReturnValue(new Promise(() => {}));

    await expect(
      createResponse({ surveyTeamMapId: "stm-1", responses: [], language: "en" } as never),
    ).resolves.toMatchObject({ id: "resp-1" });
  });
});
