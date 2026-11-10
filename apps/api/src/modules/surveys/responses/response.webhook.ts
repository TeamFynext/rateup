import { ContactIdentityKind } from "../../../generated/prisma/enums.js";
import { presentSurveyResponse, questionTitles } from "../../../external/v2/surveys/presenters.js";
import {
  emitWebhookEvents,
  type WebhookEventInput,
} from "../../settings/webhooks/webhook.events.js";

/** The parts of a freshly created SurveyResponse (with `responseWithRelations`) the event reads. */
export interface CreatedSurveyResponse {
  id: string;
  createdAt: Date;
  language: string;
  tag: string | null;
  platform: string;
  responses: unknown[];
  encryptedResponses: string | null;
  surveyTeamMap: {
    teamId: string;
    surveyId: string;
    survey: {
      title: string;
      questions: unknown[];
      /** `web`, `whatsapp` or `waFlow`. Optional so older callers' rows still type-check. */
      type?: string;
      WaFlow?: {
        dbFlowId: string;
        flowId: string | null;
        name: string;
        categories: string[];
      } | null;
    };
    team: { orgId: string };
  };
  Contact: { phone: string | null } | null;
}

/**
 * `survey.response.created`'s `data`. The response is in the partner API's shape
 * (`presentSurveyResponse`), so a receiver reads the same fields it gets from
 * `GET /surveys/:id/responses` — including no answers for an encrypted response,
 * whose ciphertext rides in `encryptedAnswers` instead.
 */
export function surveyResponseCreatedData(row: CreatedSurveyResponse) {
  const { survey, surveyId } = row.surveyTeamMap;
  return {
    survey: { id: surveyId, title: survey.title, type: survey.type ?? null },
    platform: String(row.platform),
    response: presentSurveyResponse(
      // The presenter reads the phone from identities; this row carries it already resolved.
      {
        ...row,
        Contact: row.Contact && {
          identities: row.Contact.phone
            ? [{ kind: ContactIdentityKind.PHONE, value: row.Contact.phone }]
            : [],
        },
      },
      questionTitles(survey.questions ?? []),
    ),
  };
}

/**
 * `flow.response.created`'s `data`: the survey response, plus the WhatsApp Flow that collected
 * it. `flow.id` is RateUp's id for the flow; `flow.metaFlowId` is the id Meta knows it by (null
 * until it has been saved to WhatsApp).
 */
export function flowResponseCreatedData(row: CreatedSurveyResponse) {
  const flow = row.surveyTeamMap.survey.WaFlow!;
  return {
    flow: {
      id: flow.dbFlowId,
      metaFlowId: flow.flowId,
      name: flow.name,
      categories: flow.categories,
    },
    ...surveyResponseCreatedData(row),
  };
}

/** Whether this response came in through a WhatsApp Flow. */
export function isFlowResponse(row: CreatedSurveyResponse): boolean {
  return row.surveyTeamMap?.survey?.type === "waFlow" && Boolean(row.surveyTeamMap.survey.WaFlow);
}

/**
 * Announces a newly filed response to the org's webhook. Called by
 * `createResponse` for a fresh row only — a replayed idempotent submission is
 * not news. Fire-and-forget: it only enqueues, and never rejects.
 */
export async function announceSurveyResponseCreated(row: CreatedSurveyResponse): Promise<boolean> {
  const orgId = row.surveyTeamMap?.team?.orgId;
  if (!orgId) return false;
  const events: WebhookEventInput[] = [
    {
      orgId,
      type: "survey.response.created",
      data: () => surveyResponseCreatedData(row),
      createdAt: row.createdAt,
    },
  ];
  if (isFlowResponse(row)) {
    events.push({
      orgId,
      type: "flow.response.created",
      data: () => flowResponseCreatedData(row),
      createdAt: row.createdAt,
    });
  }
  return (await emitWebhookEvents(events)) > 0;
}
