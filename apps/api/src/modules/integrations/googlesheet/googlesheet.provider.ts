import prisma from "../../../utils/prisma.js";
import { IntegratedApps } from "../../../types/enums.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import type { IntegrationEventType } from "../events/integrationEvent.types.js";
import type {
  IntegrationProvider,
  ProviderJobData,
} from "../providers/integrationProvider.types.js";
import {
  GOOGLE_SHEET_AUTHORIZE_PARAMS,
  GOOGLE_SHEET_REDIRECT_PATH,
  GOOGLE_SHEET_SCOPES,
  googleSheetOAuthConfig,
} from "./googlesheet.auth.js";
import { connectGoogleSheet, disconnectGoogleSheet } from "./googlesheet.connect.js";

/** Adds one survey response to its survey's spreadsheet. */
export const GOOGLE_SHEET_APPEND = "googlesheet-append";

interface GoogleSheetAppendJobData {
  responseId: string;
}

/**
 * A retry repeats the whole append, so one after a write that did land adds the
 * row twice. Kept to a few tries for that reason.
 */
const GOOGLE_SHEET_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 10_000 },
};

const EVENTS: readonly IntegrationEventType[] = ["survey.response_submitted"];

/**
 * Google Sheets, in the registry: every survey response is appended to its
 * survey's spreadsheet once that survey has been synced from the Responses page
 * (`googlesheet.sync.ts`, which creates the spreadsheet).
 */
export const googleSheetProvider: IntegrationProvider = {
  name: IntegratedApps.googlesheet,
  label: "Google Sheets",
  auth: "oauth2",
  connection: "integration",
  events: EVENTS,
  subscribedEvents: () => EVENTS,

  async handleEvent(event, { orgId, integration }) {
    if (!integration || event.type !== "survey.response_submitted") return;
    // Only surveys that have a spreadsheet; the rest would be an empty job each.
    const response = await prisma.surveyResponse.findUnique({
      where: { id: event.response.id },
      select: { surveyTeamMap: { select: { survey: { select: { spreadSheetId: true } } } } },
    });
    if (!response?.surveyTeamMap.survey.spreadSheetId) return;

    const job: ProviderJobData<GoogleSheetAppendJobData> = {
      integrationName: IntegratedApps.googlesheet,
      triggerKey: GOOGLE_SHEET_APPEND,
      orgId,
      data: { responseId: event.response.id },
    };
    await integrationTriggerQueue.add(GOOGLE_SHEET_APPEND, job, GOOGLE_SHEET_JOB_OPTIONS);
  },

  async processJob(integration, job) {
    if (job.triggerKey !== GOOGLE_SHEET_APPEND) return;
    // Imported on use: it reaches the survey and flow services, which the
    // registry must not load for every provider.
    const { appendResponseToSheet } = await import("./googlesheet.rows.js");
    await appendResponseToSheet(integration, (job.data as GoogleSheetAppendJobData).responseId);
  },

  oauth: {
    config: googleSheetOAuthConfig,
    scopes: GOOGLE_SHEET_SCOPES,
    extraAuthorizeParams: GOOGLE_SHEET_AUTHORIZE_PARAMS,
    redirectPath: GOOGLE_SHEET_REDIRECT_PATH,
    connect: connectGoogleSheet,
  },

  disconnect: disconnectGoogleSheet,
};
