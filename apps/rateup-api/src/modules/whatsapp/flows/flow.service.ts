import axios from "axios";
import prisma from "../../../utils/prisma.js";
import { getWaSettings } from "../settings/wa_settings.service.js";
import { callMetaApi } from "../wa_axios.js";
import { graphUrl } from "../../../utils/meta.js";
import {
  convertHeaderToNewQuestion,
  generateFlowMessageData,
  generateQuestionResponsesFromFlowResponse,
  getFlowFormElementNameFromQuestionId,
  getFlowJsonWithTitleAndDescription,
  injectIdToFlowJson,
  parseFlowResponse,
  parseFlowResponseV2,
  parseResponseFromCurrentScreenResponse,
  parseResponseFromCurrentScreenResponseV2,
  removeEmptyStrings,
  removeIdFromFlowJson,
  sanitizeScreenData,
  transformFlowAndLogicJumps,
} from "./flow.utils.js";
import { WaFlow } from "../../../../generated/prisma/client.js";
import { UpdateFlowInput } from "./flow.schema.js";
import FormData from "form-data";
import { log } from "../../../utils/logger.js";
import { LogicAction, QuestionType, WaFlowStatus } from "../../../types/enums.js";
import { FlowLogicJump } from "../../../types/global.js";
import { getGoogleUrlBySurveyTeamMapId, getSurveyById } from "../../survey/survey.service.js";
import {
  deleteSession,
  getSession,
  saveResponses,
  sendMessage,
  shouldShowGoogleReview,
  shouldShowGoogleReviewV2,
  updateSession,
  type WaSessionWithSurveyTeamMap,
} from "../whatsappSurvey/wasurvey.service.js";
import { validateLogic, validateLogicV2 } from "../../question/question.utils.js";
import { createCTAButtonMessage, parseMessage } from "../whatsappSurvey/wasurvey.utils.js";
import { getShortUrlId, shortIdUniqueConstraintErrHandler } from "../../../utils/commonUtils.js";
import { WaMessageBody } from "../../../types/whatsapp.types.js";
import {
  getIntegrationByName,
  getWaAmeliaTimeSlot,
} from "../../integrations/integrations.service.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { getTeamIdsByUserId } from "../../team/team.service.js";
import { processNextNode } from "../whatsappSurvey/wasurvey.controller.js";
import {
  logFlowCompletion,
  findRecentAutomation,
} from "../whatsappSurvey/automation-logger.utils.js";

dayjs.extend(utc);
dayjs.extend(timezone);
/**
 * Get flows from whatsapp
 * @param orgId
 * @returns
 */
export async function getFlowsFromWa(orgId: string) {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error(`WhatsApp settings not found for org: ${orgId}`);
  }

  const res = await callMetaApi(`/${waSettings.wabaId}/flows`, "GET", waSettings.accessToken);

  const flows = res.data.data as WaFlowWa[];

  return flows;
}

/**
 * Get flow from whatsapp
 * @param orgId
 * @param flowId
 * @returns
 */
export async function getFlowFromWa(orgId: string, flowId: string) {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error(`WhatsApp settings not found for org: ${orgId}`);
  }
  //query: fields=id,name,categories,preview,status,validation_errors,json_version,data_api_version,data_channel_uri,whatsapp_business_account,application

  const res = await callMetaApi(`/${flowId}`, "GET", waSettings.accessToken);

  const flow = res.data as WaFlowWa;

  return flow;
}

export async function getFlowPreviewFromWa(orgId: string, waFlowId: string) {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error(`WhatsApp settings not found for org: ${orgId}`);
  }

  const res = await callMetaApi(`/${waFlowId}?fields=preview`, "GET", waSettings.accessToken);

  return res.data.preview as WaFlowPreview;
}

// NOTE: dead code — nothing in the codebase calls this today (getFlowPreview,
// below, does the same job properly). Kept null-safe rather than throwing on
// a missing flow, matching the rest of this file's "report nothing" style.
export async function getFlowPreviewFromDb(dbFlowId: string) {
  const flow = await prisma.waFlow.findFirst({
    where: {
      dbFlowId,
    },
  });
  return flow?.preview;
}

export async function getFlowPreview(orgId: string, dbFlowId: string) {
  const flow = await getFlowFromDb(dbFlowId);
  if (!flow) {
    throw new Error(`Flow not found: ${dbFlowId}`);
  }
  if (flow.preview?.expires_at && new Date(flow.preview.expires_at) > new Date()) {
    return flow.preview;
  } else {
    if (!flow.flowId) {
      throw new Error(`Flow ${dbFlowId} has not been created in WhatsApp yet (missing flowId)`);
    }
    const preview = await getFlowPreviewFromWa(orgId, flow.flowId);
    await prisma.waFlow.update({
      where: {
        dbFlowId,
      },
      data: {
        preview,
      },
    });
    return preview;
  }
}

/**
 * Get flows from our database.
 * Used to reduce the number of calls to whatsapp api
 *
 * @param orgId
 * @returns
 */
export async function getFlowsFromDb(orgId: string, userId: string) {
  const teamIds = await getTeamIdsByUserId(userId);

  const flows = await prisma.waFlow.findMany({
    where: {
      orgId,
      survey: {
        teams: {
          some: {
            teamId: {
              in: teamIds,
            },
          },
        },
      },
    },
    select: {
      dbFlowId: true,
      name: true,
      createdAt: true,
      status: true,
      version: true,
      flowId: true,
      surveyId: true,
      survey: {
        select: {
          teams: {
            select: {
              teamId: true,
            },
          },
        },
      },
    },
  });

  return flows;
}

/**
 * Get flow from our database.
 *
 * @param orgId
 * @param dbFlowId
 * @returns
 */
export async function getFlowFromDb(dbFlowId: string) {
  const flow = await prisma.waFlow.findFirst({
    where: {
      dbFlowId,
    },
  });
  return flow;
}

// updates flow json of a flow from db to whatsapp
export async function syncLocalFlowToWhatsapp(orgId: string, dbFlowId: string) {
  const flow = await prisma.waFlow.findFirst({
    where: {
      dbFlowId,
    },
    include: {
      survey: true,
    },
  });
  if (!flow) {
    throw new Error(`Flow not found: ${dbFlowId}`);
  }
  if (!flow.flowId) {
    throw new Error(`Flow ${dbFlowId} has not been created in WhatsApp yet (missing flowId)`);
  }
  let jsonWithTitle;
  if (flow.version === 2) {
    const screenIds = flow.json.screens.flatMap((screen) =>
      screen.layout.children
        .filter((child) => child.type !== "Footer")
        .map(({ name }) => ({ id: name, screenId: screen.id }))
        // Non-interactive elements have no name and so bind to nothing.
        .filter((entry): entry is { id: string; screenId: string } => Boolean(entry.id)),
    );

    const footer = flow.json.screens?.[flow.json.screens.length - 1]?.layout.children.find(
      (child) => child.type === "Footer",
    );

    if (footer) {
      footer["on-click-action"] = {
        name: "complete",
        payload: screenIds.reduce<Record<string, string>>((acc, data) => {
          acc[data.id] = `\${screen.${data.screenId}.form.${data.id}}`;
          return acc;
        }, {}),
      };
    }
    jsonWithTitle = convertHeaderToNewQuestion(flow.json);
    transformFlowAndLogicJumps(jsonWithTitle, flow.logicJumps);
    sanitizeScreenData(jsonWithTitle);
    removeEmptyStrings(jsonWithTitle);
  } else {
    jsonWithTitle = getFlowJsonWithTitleAndDescription(
      flow.json as unknown as WaFlowJson,
      flow.map,
      flow.survey,
      flow.logicJumps,
    );
  }
  const response = await updateFlowJsonInWa(orgId, flow.flowId, jsonWithTitle as WaFlowJson);
  await publishFlowInWa(orgId, flow.flowId);

  log.trace({ message: "Flow synced to whatsapp", response });
  await updateFlowInDb(orgId, dbFlowId, {
    pendingSave: false,
    status: WaFlowStatus.PUBLISHED,
  });
}

export async function getFlowFromDbByFlowId(orgId: string, flowId: string) {
  const flow = await prisma.waFlow.findFirst({
    where: {
      flowId,
      orgId,
    },
  });
  return flow;
}

export async function getFlowWithSurveyTeamMapIds(orgId: string, flowId: string) {
  return await prisma.waFlow.findFirst({
    where: {
      flowId: flowId,
      orgId,
    },
    select: {
      survey: {
        select: {
          languages: true,
          teams: {
            select: {
              id: true, // surveyTeamMapId
              teamId: true,
            },
          },
        },
      },
    },
  });
}
export async function getFlowWithSurveyTeamMapIdsWithDbFlowId(dbFlowId: string) {
  return await prisma.waFlow.findFirst({
    where: {
      dbFlowId,
    },
    select: {
      survey: {
        select: {
          languages: true,
          teams: {
            select: {
              id: true, // surveyTeamMapId
              teamId: true,
            },
          },
        },
      },
    },
  });
}
export async function getUnsyncedFlows(orgId: string, userId: string) {
  const waFlows = await getFlowsFromWa(orgId);
  const dbFlows = await getFlowsFromDb(orgId, userId);

  const unsyncedFlows = waFlows.filter(
    (waFlow) => !dbFlows.find((dbFlow) => dbFlow.flowId === waFlow.id),
  );

  return unsyncedFlows;
}

export async function updateFlowIdAndStatusInDb(
  dbFlowId: string,
  flowId: string,
  surveyId: string,
) {
  await prisma.waFlow.update({
    where: { dbFlowId },
    data: { flowId, status: WaFlowStatus.DRAFT },
  });
  await prisma.survey.update({
    where: { id: surveyId },
    data: { isPublished: false },
  });
}

export async function cloneFlow(
  previousFlow: WaFlow,
  flowId: string,
  userId: string,
  teamId: string,
) {
  const surveyId = previousFlow.surveyId;
  const survey = await prisma.survey.findUnique({
    where: {
      id: surveyId,
    },
  });

  if (!survey) return "Survey not found to duplicate";
  const { spreadSheetId: _spreadSheetId, ...surveyWithoutId } = survey;

  const existingSurveys = await prisma.survey.findMany({
    where: {
      AND: [
        {
          title: {
            startsWith: survey.title,
          },
        },
      ],
    },
    orderBy: {
      title: "asc",
    },
  });

  let maxCopyNumber = 0;

  existingSurveys.forEach((existingSurvey) => {
    const suffix = existingSurvey.title.slice(survey.title.length);
    if (suffix.startsWith(" Copy ")) {
      const copyNumberStr = suffix.slice(" Copy ".length);
      const copyNumber = parseInt(copyNumberStr, 10);
      console.log(
        `Suffix: '${suffix}', Copy number string: ${copyNumberStr}, Copy number: ${copyNumber}`,
      );
      if (!isNaN(copyNumber)) {
        maxCopyNumber = Math.max(maxCopyNumber, copyNumber);
        console.log("Found a valid copy number: ", maxCopyNumber);
      }
    }
  });
  const title = `${survey.title} Copy ${maxCopyNumber + 1}`;
  // A freshly cloned survey has never been edited, so it starts with no `updatedAt`.
  const updatedAt: Date | null = null;
  const clonedSurvey = {
    ...surveyWithoutId,
    createdBy: userId,
    createdAt: new Date(),
    updatedAt,
    title: title,
    isPublished: false,
    teams: {
      create: {
        teamId,
        shortUrlId: getShortUrlId(),
      },
    },
  };
  const createClonedSurvey = async () => {
    const cloned = await prisma.survey.create({
      data: clonedSurvey,
    });
    return cloned;
  };
  const newClonedSurvey = await shortIdUniqueConstraintErrHandler(createClonedSurvey);
  const { json, map, orgId, logicJumps, templateMessage } = previousFlow;
  await prisma.waFlow.create({
    data: {
      flowId,
      status: WaFlowStatus.DRAFT,
      json,
      map,
      orgId,
      logicJumps,
      templateMessage,
      name: title,
      surveyId: newClonedSurvey.id,
      version: previousFlow?.version ?? 1,
    },
  });
  return newClonedSurvey;
}

interface WaFlowAsset {
  name: string;
  asset_type: string;
  download_url: string;
}

export async function getFlowJsonFromWa(orgId: string, waFlowId: string) {
  const assets = await getFlowAssets(orgId, waFlowId);
  const jsonAsset = assets.find((asset) => asset.asset_type === "FLOW_JSON");
  if (!jsonAsset) {
    throw new Error(`FLOW_JSON asset not found for waFlowId: ${waFlowId}`);
  }

  const res = await axios.get(jsonAsset.download_url);
  const json = injectIdToFlowJson(res.data);
  return json;
}

/**
 *
 * @param orgId
 * @param waFlowId Flow id generated by Meta
 * @returns
 */
export async function getFlowAssets(orgId: string, waFlowId: string): Promise<WaFlowAsset[]> {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error(`WhatsApp settings not found for org: ${orgId}`);
  }
  // TODO: handle pagination

  const res = await callMetaApi(`/${waFlowId}/assets`, "GET", waSettings.accessToken);

  return res.data.data;
}

interface sendFlowProps {
  orgId: string;
  dbFlowId: string;
  phone: string;
  userId?: string;
  whatsappSettingsPhoneId?: string;
}
export async function sendFlow({
  orgId,
  dbFlowId,
  phone,
  userId,
  whatsappSettingsPhoneId,
}: sendFlowProps) {
  try {
    log.trace("Sending flow %s to %s", dbFlowId, phone);
    const dbFlow = await getFlowFromDb(dbFlowId);
    if (!dbFlow) {
      throw new Error(`Flow not found: ${dbFlowId}`);
    }
    const messageData = generateFlowMessageData({
      to: phone,
      dbFlow,
    });
    await sendMessage(
      orgId,
      { ...messageData, to: phone },
      undefined,
      userId,
      whatsappSettingsPhoneId,
    );
    return true;
  } catch (e) {
    log.error(e);
    return false;
  }
}

interface CreateFlowCopyInDbArgs {
  orgId: string;
  flowId: string;
  json: WaFlowJson;
  flowMap: WaFlowMap;
  surveyId: string;
  status: string;
  name: string;
  logicJumps?: {};
  templateMessage?: {
    body: string;
    cta: string;
  };
  version?: number;
}

export async function createFlowCopyInDb({
  orgId,
  flowId,
  json,
  flowMap,
  surveyId,
  status,
  name,
  logicJumps = {},
  templateMessage = {
    body: "Would you like to start survey?",
    cta: "Open",
  },
  version = 2,
}: CreateFlowCopyInDbArgs) {
  const flow = await prisma.waFlow.create({
    data: {
      orgId,
      flowId,
      json,
      logicJumps,
      templateMessage,
      map: flowMap,
      surveyId: surveyId,
      status: status,
      name: name,
      version: version,
    },
  });

  return flow;
}

/**
 * Creates flow in whatsapp
 * @param req
 * @param rep
 */
export async function createFlowInWa(
  orgId: string,
  createFlowInput: { name: string; categories: string[] },
) {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error(`WhatsApp settings not found for org: ${orgId}`);
  }
  const { wabaId, accessToken } = waSettings;

  const { data } = await callMetaApi(`/${wabaId}/flows`, "POST", accessToken, createFlowInput);
  return data as { id: string };
}

export async function cloneFlowInWa(
  orgId: string,
  createFlowInput: {
    name?: string;
    categories?: string[];
    clone_flow_id: string;
  },
) {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error(`WhatsApp settings not found for org: ${orgId}`);
  }
  const { wabaId, accessToken } = waSettings;

  const { data } = await callMetaApi(`/${wabaId}/flows`, "POST", accessToken, createFlowInput);
  return data as { id: string };
}

export async function updateFlowInDb(orgId: string, dbFlowId: string, data: UpdateFlowInput) {
  const updatedFlow = await prisma.waFlow.update({
    where: {
      dbFlowId: dbFlowId,
    },
    data: {
      ...data,
      name: data.name?.trim(),
    },
    include: {
      survey: true,
    },
  });

  // updating survey title if name is updated
  if (data.name || data.status === WaFlowStatus.PUBLISHED) {
    const updateData = {
      title: data.name?.trim(),
      isPublished: data.status ? data.status === WaFlowStatus.PUBLISHED : undefined,
    };
    await prisma.survey.update({
      where: {
        id: updatedFlow.surveyId,
      },
      data: updateData,
    });
  }

  return updatedFlow;
}
export async function updateFlowMetaDataInWa(
  orgId: string,
  flowId: string,
  updatedData: { name?: string; categories?: string[]; endpoint_uri?: string },
) {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error(`WhatsApp settings not found for org: ${orgId}`);
  }
  const { accessToken } = waSettings;
  const { data } = await callMetaApi(`/${flowId}`, "POST", accessToken, updatedData);
  return data as { id: string };
}

/**
 * Updates flowjson in whatsapp server.
 * Strips the id from the json before sending it to whatsapp server
 *
 * !!! Don't forget to add title and description, if any, to the json before sending it to this function
 * @param orgId
 * @param waFlowId
 * @param json
 */
export async function updateFlowJsonInWa(orgId: string, waFlowId: string, json: WaFlowJson) {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error(`WhatsApp settings not found for org: ${orgId}`);
  }
  const { accessToken } = waSettings;
  json = removeIdFromFlowJson(json);

  // converting to file
  const formData = new FormData();
  const buffer = Buffer.from(JSON.stringify(json), "utf-8");
  formData.append("file", buffer, {
    contentType: "application/json",
    filename: "flow.json",
  });
  formData.append("asset_type", "FLOW_JSON");
  formData.append("name", "flow.json");

  try {
    await axios.post(
      graphUrl(`/${waFlowId}/assets`),
      formData, // Upload the FormData
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...formData.getHeaders(), // Add the form-data headers
        },
      },
    );
    log.trace("Updated flow json in wa %s", waFlowId);
  } catch (e) {
    log.trace({ e }, "Failed to update flow json in wa");
  }
}

export async function deleteFlowInWa(orgId: string, waFlowId: string) {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error(`WhatsApp settings not found for org: ${orgId}`);
  }
  const { accessToken } = waSettings;
  const res = await callMetaApi(`/${waFlowId}`, "DELETE", accessToken);
  return res.data;
}

export async function deleteFlowInDb(dbFlowId: string) {
  return prisma.waFlow.delete({
    where: {
      dbFlowId,
    },
  });
}

export async function deprecateFlowInWa(orgId: string, waFlowId: string) {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error(`WhatsApp settings not found for org: ${orgId}`);
  }
  const { accessToken } = waSettings;
  const res = await callMetaApi(`/${waFlowId}/deprecate`, "POST", accessToken);
  return res.data;
}

export async function publishFlowInWa(orgId: string, waFlowId: string) {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error(`WhatsApp settings not found for org: ${orgId}`);
  }
  const { accessToken } = waSettings;
  const res = await callMetaApi(`/${waFlowId}/publish`, "POST", accessToken);
  return res.data;
}
export async function getFlowBySurveyId(surveyId: string) {
  return prisma.waFlow.findFirst({
    where: {
      surveyId,
    },
  });
}

/**
 * Logic jumps only apply to choice/scale questions, whose parsed answers are a
 * Choice, Choice[], string or number. parseFlowResponse can also yield shapes
 * that can't participate in a comparison (undefined for an unresolved choice, a
 * Date for date pickers, `{ email }`/`{ phone }` for contact fields, or raw
 * media-picker arrays) — those evaluate the jump to false.
 */
function isComparableLogicResponse(value: unknown): value is Choice | Choice[] | string | number {
  if (typeof value === "string" || typeof value === "number") return true;
  const isChoice = (v: unknown): v is Choice => typeof v === "object" && v !== null && "value" in v;
  return Array.isArray(value) ? value.every(isChoice) : isChoice(value);
}

// The raw (already-decrypted) request body WhatsApp Flow's endpoint sends us.
// `data` holds the current screen's form field values keyed by flow element
// name (WaFlowResponses) — which elements exist depends on the flow's own json
// schema — alongside a few fixed control keys the code discriminates on.
interface DecryptedFlowRequestBody {
  version: string;
  screen: string;
  action: string;
  flow_token: string;
  data?: {
    error?: unknown;
    component_action?: string;
    date?: string;
  } & WaFlowResponses;
}

// TODO: move to controller.ts
export const handleDecryptedFlowRequest = async (
  decryptedBody: DecryptedFlowRequestBody,
  dbFlow: WaFlow,
) => {
  const { screen, data, version, action, flow_token } = decryptedBody;
  try {
    log.trace("action: %s", action);
    // handle health check request
    if (action === "ping") {
      return {
        version,
        data: {
          status: "active",
        },
      };
    }
    // handle error notification
    if (data?.error) {
      log.warn("WaFlow: Received client error\n%o", data);
      return {
        version,
        data: {
          acknowledged: true,
        },
      };
    }
    let session = await getSession(dbFlow.orgId, flow_token);
    const json = dbFlow.json as unknown as WaFlowJson;

    // handle initial request when opening the flow
    if (action === "INIT") {
      const initialScreen = json.screens[0].id;
      return {
        version,
        screen: initialScreen,
        data: {},
      };
    }
    const survey = await getSurveyById(dbFlow.surveyId);
    const questions = survey.questions as unknown as Question[];

    if (action === "data_exchange") {
      if (!session) {
        throw new Error(`Session not found for flow_token: ${flow_token}`);
      }
      // save responses
      log.trace("Received data exchange request");
      let versionCheck = dbFlow.version === 1;
      const currentScreenResponses = versionCheck
        ? parseResponseFromCurrentScreenResponse(dbFlow, questions, data ?? {})
        : parseResponseFromCurrentScreenResponseV2(dbFlow.json.screens, data ?? {});
      let noSlot = {
        version,
        screen,
        data: {
          available_slots: [{ id: "1", title: "no slot" }],
        },
      };
      if (data?.component_action === "update_date") {
        if (!data?.date) return noSlot;

        const question = questions.find((data) => data.type === QuestionType.Date);
        if (!question?.waAppName) return noSlot;

        // getIntegrationByName returns a single Integration (findUnique), not a
        // list — this branch previously read `.length`/`[0]` as if it were an
        // array, so it never detected a missing integration and always called
        // getWaAmeliaTimeSlot with undefined credentials. Fixed to treat it as
        // the single record it actually is. See issues.txt.
        const integration = (await getIntegrationByName(
          session.orgId,
          question.waAppName,
        )) as unknown as AmeliaIntegration | null;
        if (!integration) return noSlot;

        const response = await getWaAmeliaTimeSlot({
          url: integration.credential.baseUrl,
          acessToken: integration.credential.apiKey,
          serviceId: integration.credential.serviceId,
          method: "get",
          startDateTime: dayjs(Number(data?.date)).tz("Asia/Kolkata").format("YYYY-MM-DD"),
        });
        const slots = transformSlots(
          dayjs(Number(data?.date)).tz("Asia/Kolkata").format("YYYY-MM-DD"),
          response,
        );

        return {
          version,
          screen,
          data: {
            available_slots: slots,
          },
        };
      }
      log.trace("Current screen responses: %o", currentScreenResponses);
      // Bound to its own `const` (rather than narrowing the reassigned `let
      // session`) — TypeScript doesn't retain updateSession's more specific
      // return type through a `let` reassignment once the variable's
      // declared type is a broader union, so reusing `session` here would
      // lose the non-null `surveyTeamMap` narrowing below.
      const currentSession = await updateSession(session.orgId, session.phone, {
        responses: [...session.responses, ...currentScreenResponses],
      });
      if (!currentSession.surveyTeamMap) {
        throw new Error(`Session ${currentSession.id} has no surveyTeamMap`);
      }
      // handle the request based on the current screen
      let nextScreen = null;
      const currentIndex = json.screens.findIndex((s) => s.id === screen);
      const currentScreen = json.screens[currentIndex];

      if (Object.keys(dbFlow.logicJumps[screen] || {}).length > 0) {
        log.trace("Logic jumps found for screen: %s \n %o", screen, dbFlow.logicJumps[screen]);
        const logicJumps: FlowLogicJump[] = dbFlow.logicJumps[screen];
        for (const logicJump of logicJumps) {
          let logicPassed = logicJump.conditions.every((condition) => {
            if (versionCheck) {
              const flowElementName = getFlowFormElementNameFromQuestionId(
                condition.questionId,
                dbFlow.map,
              );
              const question = questions.find((q) => q.id === condition.questionId);
              if (!flowElementName) {
                log.error("Flow element name not found for questionId %s", condition.questionId);
                return false;
              }
              const rawResponse = data?.[flowElementName];
              log.trace({ rawResponse }, "raw response");
              if (!rawResponse) {
                // TODO: add logicCondition for skipped questions
                return false;
              }
              if (!question) {
                log.error("Question not found for questionId %s", condition.questionId);
                return false;
              }
              const response = parseFlowResponse({
                flowJson: json,
                // WaFlow.map is `unknown` on the Prisma model; see WaFlowMap.
                flowMap: dbFlow.map as WaFlowMap,
                elementName: flowElementName,
                response: rawResponse,
              });
              log.trace("parsed response: %s", response);
              if (!isComparableLogicResponse(response)) return false;
              return validateLogic(
                question,
                response,
                "en", //TODO
                condition.condition,
                condition.response,
              );
            } else {
              const question = currentScreen.layout.children.find(
                (data) => data.name === condition.questionId,
              );
              if (!question || currentScreenResponses.length === 0) {
                return false;
              }
              const currentResponse = currentScreenResponses.find(
                (screen) => screen.questionId === condition.questionId,
              );
              if (!currentResponse) {
                log.error(
                  "No current-screen response found for questionId %s",
                  condition.questionId,
                );
                return false;
              }
              const dataSource = question["data-source"];
              if (!question.metaType || !dataSource) {
                log.error(
                  "Flow element %s has no metaType/data-source to resolve its answer against",
                  condition.questionId,
                );
                return false;
              }
              // v2 screens yield WaFlowV2QuestionResponse, whose `response` is
              // the raw answer rather than a QuestionType-keyed object.
              const rawAnswer = currentResponse.response;
              if (
                rawAnswer === undefined ||
                (typeof rawAnswer === "object" && !Array.isArray(rawAnswer))
              ) {
                log.error("Unexpected v1-shaped answer for flow element %s", condition.questionId);
                return false;
              }
              const response = parseFlowResponseV2(question.metaType, rawAnswer, dataSource);
              // parseFlowResponseV2 yields undefined for an unresolved choice
              // and a Date for date pickers, neither of which is comparable.
              if (response === undefined || response instanceof Date) return false;
              return validateLogicV2(question, response, condition.condition, condition.response);
            }
          });

          if (logicPassed) {
            if (logicJump.action === LogicAction.NextQ) {
              log.trace("Logic passed, moving to next question");
              nextScreen = json.screens[currentIndex + 1]?.id;
            } else if (logicJump.action === LogicAction.EndSurvey) {
              return await handleFlowEnd({
                session: currentSession,
                decryptedBody,
              });
            } else {
              log.trace("Logic passed, jumping to screen: %s", logicJump.action);
              nextScreen = logicJump.action;
            }
          }
        }
        if (!nextScreen) {
          log.trace("Logic failed, moving to next question");
          nextScreen = json.screens[currentIndex + 1]?.id;
        }
      } else if (currentIndex === json.screens.length - 1) {
        log.trace("End of survey");
        return await handleFlowEnd({
          session: currentSession,
          decryptedBody,
        });
      } else {
        log.trace("No logic jumps, moving to next question");
        nextScreen = json.screens[currentIndex + 1]?.id;
      }

      return {
        version,
        screen: nextScreen,
        data: {},
      };
    }
  } catch (error) {
    // TODO: handle error
    log.error({ err: error }, "Error in handling flow request");
    throw new Error(
      "Unhandled endpoint request. Make sure you handle the request action & screen logged above.",
    );
  }
};
interface Slot {
  id: string;
  title: string;
}

function transformSlots(
  date: string,
  response: Awaited<ReturnType<typeof getWaAmeliaTimeSlot>>,
): Slot[] {
  const slots = response?.data?.slots?.[date];
  if (!slots) {
    return [{ id: "1", title: "no slot" }];
  }

  return Object.keys(slots).map((time) => ({
    id: time,
    title: time,
  }));
}
interface handleFlowEndProps {
  session: WaSessionWithSurveyTeamMap;
  decryptedBody: DecryptedFlowRequestBody;
}
async function handleFlowEnd({ session, decryptedBody }: handleFlowEndProps) {
  log.trace("Ending Flow");
  const { version, flow_token } = decryptedBody;
  const uniqueResponses = removeDuplicateResponses(session.responses);
  session.responses = uniqueResponses;
  await saveResponses(session);
  const waFlow = session.surveyTeamMap.survey.WaFlow;
  const versionCheck = waFlow?.version === 1;

  let sendGRLink: boolean;
  if (versionCheck) {
    sendGRLink = shouldShowGoogleReview({
      questions: session.surveyTeamMap.survey.questions,
      responses: uniqueResponses,
    });
  } else {
    if (!waFlow) {
      throw new Error(`WaFlow not found for survey: ${session.surveyTeamMap.survey.id}`);
    }
    sendGRLink = shouldShowGoogleReviewV2({
      screens: waFlow.json.screens,
      responses: uniqueResponses,
    });
  }

  if (sendGRLink) {
    sendGReviewLink({
      phone: session.phone,
      surveyTeamMapId: session.surveyTeamMap.id,
      orgId: session.orgId,
    })
      .then()
      .catch((e) => log.error(e));
  }

  return {
    version,
    screen: "SUCCESS",
    data: {
      extension_message_response: {
        params: {
          flow_token: flow_token,
          responses_saved: true,
        },
      },
    },
  };
}

export async function handleStaticFlowReply(orgId: string, waMessage: WaMessageBody) {
  log.trace("handling flow reply");
  const { from, flowResponse } = parseMessage(waMessage);
  if (!flowResponse) {
    log.trace("Flow reply carried no response payload. Ignoring...");
    return;
  }
  if (flowResponse["responses_saved"]) {
    log.trace("Flow response already saved. Ignoring...");
    return;
  }

  const session = await getSession(orgId, from);
  if (!session) {
    log.error("Session not found for %s", from);
    return;
  }
  if (!session.surveyTeamMap?.survey?.WaFlow) {
    log.error("WaFlow not found for session %s", session.id);
    return;
  }
  const dbFlowId = session.surveyTeamMap.survey.WaFlow.dbFlowId;
  const flow = await getFlowFromDb(dbFlowId);
  if (!flow) {
    log.error("Flow not found: %s", dbFlowId);
    return;
  }

  const questionResponses = generateQuestionResponsesFromFlowResponse({
    flow,
    flowResponses: flowResponse,
    surveyTeamMapId: session.surveyTeamMap.id,
  });

  const uniqueResponses = removeDuplicateResponses(questionResponses);
  // Both flow versions persist into the same QuestionResponse[] column; v2
  // entries legitimately omit `type` (see WaFlowV2QuestionResponse).
  session.responses = uniqueResponses as QuestionResponse[];
  await saveResponses(session);

  const versionCheck = session.surveyTeamMap.survey.WaFlow.version === 1;

  const sendGRLink = versionCheck
    ? shouldShowGoogleReview({
        questions: session.surveyTeamMap.survey.questions,
        // v1 answers always carry `type`; narrow away the v2 variant.
        responses: uniqueResponses.filter((r): r is QuestionResponse => "type" in r),
      })
    : shouldShowGoogleReviewV2({
        screens: session.surveyTeamMap.survey.WaFlow.json.screens,
        responses: uniqueResponses,
      });

  if (sendGRLink) {
    await sendGReviewLink({
      phone: session.phone,
      surveyTeamMapId: session.surveyTeamMap.id,
      orgId: session.orgId,
    });
  }

  // Use the utility function to find the recent automation
  const progress = await findRecentAutomation(session.phone, orgId);
  const automation = progress?.waAutomatedReply;
  if (automation) {
    if (!progress.currentNode) {
      log.error("Automation progress for phone %s has no currentNode", session.phone);
      return;
    }
    const matchData = automation.matchData;
    const nextEdge = matchData?.json?.edges?.find((edge) => edge.target === progress.currentNode);

    if (!nextEdge) return;

    const nextNode = matchData?.json?.nodes?.find((node) => node.id === nextEdge.source);

    if (!nextNode) return;

    const nextNodeFlowId = (nextNode.data?.flow as { id?: string } | undefined)?.id;
    if (nextNode.type === "flowNode" && nextNodeFlowId === dbFlowId) {
      // Log flow submission using the utility function
      const automationLog = await logFlowCompletion({
        phone: session.phone,
        orgId,
        flowId: dbFlowId,
        recentActivity: {
          ...progress,
          currentNode: nextNode.id,
        },
      });

      await processNextNode(
        session.phone,
        automation,
        progress.currentNode,
        orgId,
        automationLog?.id,
      );
    }
  }
  await deleteSession(session.orgId, session.phone);
}

export function removeDuplicateResponses<T extends { questionId: string }>(responses: T[]): T[] {
  const qIds = responses.map((r) => r.questionId);

  const uniqueQIds = [...new Set(qIds)];

  const reversedRes = responses.reverse();

  // Every id in uniqueQIds came from responses itself, so `.find` always
  // matches here — the filter only exists to prove that to the type system.
  return uniqueQIds
    .map((qId) => reversedRes.find((r) => r.questionId === qId))
    .filter((r): r is T => r !== undefined);
}

interface sendGReviewLinkProps {
  phone: string;
  surveyTeamMapId: string;
  orgId: string;
}

export async function sendGReviewLink({ phone, surveyTeamMapId, orgId }: sendGReviewLinkProps) {
  log.trace("Sending google review link to %s", phone);

  const reviewPage = await getGoogleUrlBySurveyTeamMapId(surveyTeamMapId);
  if (!reviewPage) {
    log.trace("Google Review page not found");
    return;
  }
  const googleReviewMessage = createCTAButtonMessage({
    to: phone,
    buttonText: "Review us on Google",
    url: reviewPage,
    body: "Thank you for your feedback!",
  });
  await sendMessage(orgId, googleReviewMessage);
}
