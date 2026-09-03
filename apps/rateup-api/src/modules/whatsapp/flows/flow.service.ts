import axios from "axios";
import prisma from "../../../utils/prisma.js";
import { getWaSettings, getWaSettingsById } from "../settings/wa_settings.service.js";
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
  saveResponses,
  sendMessage,
  shouldShowGoogleReview,
  shouldShowGoogleReviewV2,
} from "../whatsappSurvey/wasurvey.service.js";
import { validateLogic, validateLogicV2 } from "../../question/question.utils.js";
import { signFlowToken, verifyFlowToken } from "./flowToken.js";
import { appendFlowResponses, clearFlowResponses, getFlowResponses } from "./flowState.js";
import { unusableRequest } from "./flow.errors.js";
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
 * WhatsApp channel a flow belongs to.
 *
 * Meta scopes flow ids to a WABA: a flow created under one number's WABA does not
 * exist for any other number, so every Meta call about a flow has to be made with
 * that channel's credentials. `WaFlow.whatsappSettingsId` records which one it is;
 * rows written before that column existed carry null and fall back to the org
 * default, which is the channel those flows were created under.
 *
 * @param whatsappSettingsId `WaFlow.whatsappSettingsId`
 */
export async function getWaSettingsForFlow(orgId: string, whatsappSettingsId?: string | null) {
  const waSettings = whatsappSettingsId
    ? await getWaSettingsById(whatsappSettingsId, orgId)
    : await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error(`WhatsApp settings not found for org: ${orgId}`);
  }
  return waSettings;
}

/**
 * Get flows from whatsapp
 * @param orgId
 * @param whatsappSettingsId channel to list flows from; defaults to the org default
 * @returns
 */
export async function getFlowsFromWa(orgId: string, whatsappSettingsId?: string | null) {
  const waSettings = await getWaSettingsForFlow(orgId, whatsappSettingsId);

  const res = await callMetaApi(`/${waSettings.wabaId}/flows`, "GET", waSettings.accessToken);

  const flows = res.data.data as WaFlowWa[];

  return flows;
}

/**
 * Get flow from whatsapp
 * @param orgId
 * @param flowId
 * @param whatsappSettingsId channel the flow lives on
 * @returns
 */
export async function getFlowFromWa(
  orgId: string,
  flowId: string,
  whatsappSettingsId?: string | null,
) {
  const waSettings = await getWaSettingsForFlow(orgId, whatsappSettingsId);
  //query: fields=id,name,categories,preview,status,validation_errors,json_version,data_api_version,data_channel_uri,whatsapp_business_account,application

  const res = await callMetaApi(`/${flowId}`, "GET", waSettings.accessToken);

  const flow = res.data as WaFlowWa;

  return flow;
}

export async function getFlowPreviewFromWa(
  orgId: string,
  waFlowId: string,
  whatsappSettingsId?: string | null,
) {
  const waSettings = await getWaSettingsForFlow(orgId, whatsappSettingsId);

  const res = await callMetaApi(`/${waFlowId}?fields=preview`, "GET", waSettings.accessToken);

  return res.data.preview as WaFlowPreview;
}

// NOTE: dead code — nothing in the codebase calls this today (getFlowPreview,
// below, does the same job properly). Kept null-safe rather than throwing on
// a missing flow, matching the rest of this file's "report nothing" style.
export async function getFlowPreviewFromDb(dbFlowId: string, orgId: string) {
  const flow = await prisma.waFlow.findFirst({
    where: {
      dbFlowId,
      orgId,
    },
  });
  return flow?.preview;
}

export async function getFlowPreview(orgId: string, dbFlowId: string) {
  const flow = await getFlowFromDb(dbFlowId, orgId);
  if (!flow) {
    throw new Error(`Flow not found: ${dbFlowId}`);
  }
  if (flow.preview?.expires_at && new Date(flow.preview.expires_at) > new Date()) {
    return flow.preview;
  } else {
    if (!flow.flowId) {
      throw new Error(`Flow ${dbFlowId} has not been created in WhatsApp yet (missing flowId)`);
    }
    const preview = await getFlowPreviewFromWa(orgId, flow.flowId, flow.whatsappSettingsId);
    await prisma.waFlow.update({
      where: {
        dbFlowId,
        orgId,
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
 * @param userId
 * @param whatsappSettingsId when given, only flows that live on that WhatsApp channel.
 *   Flows recorded before the channel was tracked (null) are included, since they belong
 *   to the org default channel — filtering them out would hide every pre-existing flow.
 * @returns
 */
export async function getFlowsFromDb(
  orgId: string,
  userId: string,
  whatsappSettingsId?: string | null,
) {
  const teamIds = await getTeamIdsByUserId(userId);
  const defaultWaSettings = whatsappSettingsId ? await getWaSettings(orgId) : null;
  const isDefaultChannel = defaultWaSettings?.id === whatsappSettingsId;

  const flows = await prisma.waFlow.findMany({
    where: {
      orgId,
      ...(whatsappSettingsId && {
        OR: isDefaultChannel
          ? [{ whatsappSettingsId }, { whatsappSettingsId: null }]
          : [{ whatsappSettingsId }],
      }),
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
      whatsappSettingsId: true,
      // The inbox draws the flow's invitation message as a pending bubble the moment
      // it is sent, so the list carries it rather than re-reading each flow.
      templateMessage: true,
      survey: {
        select: {
          teams: {
            select: {
              teamId: true,
              // The cards show a response count per flow, summed over the survey's
              // teams — without this the count renders as 0 for every flow.
              surveyStats: {
                select: {
                  completed: true,
                },
              },
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
 * orgId is required: dbFlowId comes straight off a request path on every route
 * that reaches here, so a lookup that ignores the caller's org hands one org's
 * flow — json, question map and logic jumps — to any authenticated user of
 * another. A flow belonging to another org reports as absent.
 *
 * @param dbFlowId
 * @param orgId
 * @returns
 */
export async function getFlowFromDb(dbFlowId: string, orgId: string) {
  const flow = await prisma.waFlow.findFirst({
    where: {
      dbFlowId,
      orgId,
    },
  });
  return flow;
}

// updates flow json of a flow from db to whatsapp
export async function syncLocalFlowToWhatsapp(orgId: string, dbFlowId: string) {
  const flow = await prisma.waFlow.findFirst({
    where: {
      dbFlowId,
      orgId,
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
  const response = await updateFlowJsonInWa(
    orgId,
    flow.flowId,
    jsonWithTitle as WaFlowJson,
    flow.whatsappSettingsId,
  );
  await publishFlowInWa(orgId, flow.flowId, flow.whatsappSettingsId);

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
export async function getFlowWithSurveyTeamMapIdsWithDbFlowId(dbFlowId: string, orgId: string) {
  return await prisma.waFlow.findFirst({
    where: {
      dbFlowId,
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
export async function getUnsyncedFlows(
  orgId: string,
  userId: string,
  whatsappSettingsId?: string | null,
) {
  const waFlows = await getFlowsFromWa(orgId, whatsappSettingsId);
  const dbFlows = await getFlowsFromDb(orgId, userId, whatsappSettingsId);

  const unsyncedFlows = waFlows.filter(
    (waFlow) => !dbFlows.find((dbFlow) => dbFlow.flowId === waFlow.id),
  );

  return unsyncedFlows;
}

export async function updateFlowIdAndStatusInDb(
  dbFlowId: string,
  flowId: string,
  surveyId: string,
  orgId: string,
) {
  await prisma.waFlow.update({
    where: { dbFlowId, orgId },
    data: { flowId, status: WaFlowStatus.DRAFT },
  });
  await prisma.survey.update({
    where: { id: surveyId, orgId },
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
  const survey = await prisma.survey.findFirst({
    where: {
      id: surveyId,
      orgId: previousFlow.orgId,
    },
  });

  if (!survey) return "Survey not found to duplicate";
  // `id` has to go, not just `spreadSheetId`: spreading the source row into `survey.create`
  // carries its primary key over and the insert dies with
  // "Unique constraint failed on the fields: (`id`)". The clone also must not inherit the
  // original's export spreadsheet.
  const { id: _id, spreadSheetId: _spreadSheetId, ...surveyWithoutId } = survey;

  const existingSurveys = await prisma.survey.findMany({
    where: {
      orgId: survey.orgId,
      title: {
        startsWith: survey.title,
      },
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
      if (!isNaN(copyNumber)) {
        maxCopyNumber = Math.max(maxCopyNumber, copyNumber);
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
  // The clone is created at Meta under the source flow's channel (see cloneFlowHandler),
  // so it inherits that channel here too.
  const { json, map, orgId, logicJumps, templateMessage, whatsappSettingsId } = previousFlow;
  await prisma.waFlow.create({
    data: {
      flowId,
      status: WaFlowStatus.DRAFT,
      json,
      map,
      orgId,
      logicJumps,
      templateMessage,
      whatsappSettingsId,
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

export async function getFlowJsonFromWa(
  orgId: string,
  waFlowId: string,
  whatsappSettingsId?: string | null,
) {
  const assets = await getFlowAssets(orgId, waFlowId, whatsappSettingsId);
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
export async function getFlowAssets(
  orgId: string,
  waFlowId: string,
  whatsappSettingsId?: string | null,
): Promise<WaFlowAsset[]> {
  const waSettings = await getWaSettingsForFlow(orgId, whatsappSettingsId);
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
  /**
   * Run context to sign into the flow token. It is the only thing that ties a
   * reply back to a survey, so a flow sent without it collects answers that the
   * reply handlers cannot attribute and therefore drop.
   */
  context?: {
    surveyTeamMapId: string;
    language?: string | null;
    campaignParticipantId?: string | null;
    campaignParticipantDripStageId?: string | null;
    tag?: string | null;
  };
}
export async function sendFlow({
  orgId,
  dbFlowId,
  phone,
  userId,
  whatsappSettingsPhoneId,
  context,
}: sendFlowProps) {
  try {
    log.trace("Sending flow %s to %s", dbFlowId, phone);
    const dbFlow = await getFlowFromDb(dbFlowId, orgId);
    if (!dbFlow) {
      throw new Error(`Flow not found: ${dbFlowId}`);
    }
    // A flow id only resolves against the WABA it was created under, so sending it from
    // a number on another WABA gets rejected by Meta. With no number given, send from the
    // flow's own channel rather than from the org default.
    const flowWaSettings = await getWaSettingsForFlow(orgId, dbFlow.whatsappSettingsId);
    if (whatsappSettingsPhoneId) {
      const senderWaSettings = await getWaSettings(orgId, whatsappSettingsPhoneId);
      if (!senderWaSettings) {
        throw new Error(`WhatsApp settings not found for phone: ${whatsappSettingsPhoneId}`);
      }
      if (senderWaSettings.wabaId !== flowWaSettings.wabaId) {
        throw new Error(
          `Flow ${dbFlowId} belongs to a different WhatsApp Business Account than ${whatsappSettingsPhoneId}`,
        );
      }
    }
    const messageData = generateFlowMessageData({
      to: phone,
      dbFlow,
      flowToken: context
        ? signFlowToken({
            surveyTeamMapId: context.surveyTeamMapId,
            orgId,
            phone,
            language: context.language,
            campaignParticipantId: context.campaignParticipantId,
            campaignParticipantDripStageId: context.campaignParticipantDripStageId,
            tag: context.tag,
          })
        : undefined,
    });
    await sendMessage(
      orgId,
      { ...messageData, to: phone },
      undefined,
      userId,
      whatsappSettingsPhoneId ?? flowWaSettings.phoneId ?? undefined,
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
  /** Channel the flow was created under at Meta — see getWaSettingsForFlow. */
  whatsappSettingsId?: string | null;
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
  whatsappSettingsId,
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
      whatsappSettingsId,
    },
  });

  return flow;
}

/**
 * Creates flow in whatsapp
 *
 * Returns the channel it was created under alongside Meta's flow id, so the caller can
 * record it on the row — the flow id only resolves against that channel's WABA.
 *
 * @param whatsappSettingsId channel to create the flow on; defaults to the org default
 */
export async function createFlowInWa(
  orgId: string,
  createFlowInput: { name: string; categories: string[] },
  whatsappSettingsId?: string | null,
) {
  const waSettings = await getWaSettingsForFlow(orgId, whatsappSettingsId);
  const { wabaId, accessToken } = waSettings;

  const { data } = await callMetaApi(`/${wabaId}/flows`, "POST", accessToken, createFlowInput);
  return { ...(data as { id: string }), whatsappSettingsId: waSettings.id };
}

export async function cloneFlowInWa(
  orgId: string,
  createFlowInput: {
    name?: string;
    categories?: string[];
    clone_flow_id: string;
  },
  whatsappSettingsId?: string | null,
) {
  const waSettings = await getWaSettingsForFlow(orgId, whatsappSettingsId);
  const { wabaId, accessToken } = waSettings;

  const { data } = await callMetaApi(`/${wabaId}/flows`, "POST", accessToken, createFlowInput);
  return { ...(data as { id: string }), whatsappSettingsId: waSettings.id };
}

export async function updateFlowInDb(orgId: string, dbFlowId: string, data: UpdateFlowInput) {
  const updatedFlow = await prisma.waFlow.update({
    where: {
      dbFlowId: dbFlowId,
      orgId,
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
        orgId,
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
  whatsappSettingsId?: string | null,
) {
  const waSettings = await getWaSettingsForFlow(orgId, whatsappSettingsId);
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
export async function updateFlowJsonInWa(
  orgId: string,
  waFlowId: string,
  json: WaFlowJson,
  whatsappSettingsId?: string | null,
) {
  const waSettings = await getWaSettingsForFlow(orgId, whatsappSettingsId);
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

  const { data } = await axios.post(
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
  return data;
}

export async function deleteFlowInWa(
  orgId: string,
  waFlowId: string,
  whatsappSettingsId?: string | null,
) {
  const waSettings = await getWaSettingsForFlow(orgId, whatsappSettingsId);
  const { accessToken } = waSettings;
  const res = await callMetaApi(`/${waFlowId}`, "DELETE", accessToken);
  return res.data;
}

export async function deleteFlowInDb(dbFlowId: string, orgId: string) {
  return prisma.waFlow.delete({
    where: {
      dbFlowId,
      orgId,
    },
  });
}

export async function deprecateFlowInWa(
  orgId: string,
  waFlowId: string,
  whatsappSettingsId?: string | null,
) {
  const waSettings = await getWaSettingsForFlow(orgId, whatsappSettingsId);
  const { accessToken } = waSettings;
  const res = await callMetaApi(`/${waFlowId}/deprecate`, "POST", accessToken);
  return res.data;
}

export async function publishFlowInWa(
  orgId: string,
  waFlowId: string,
  whatsappSettingsId?: string | null,
) {
  const waSettings = await getWaSettingsForFlow(orgId, whatsappSettingsId);
  const { accessToken } = waSettings;
  const res = await callMetaApi(`/${waFlowId}/publish`, "POST", accessToken);
  return res.data;
}
export async function getFlowBySurveyId(surveyId: string, orgId: string) {
  return prisma.waFlow.findFirst({
    where: {
      surveyId,
      orgId,
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

    // Only sent for screens marked `refresh_on_back`, which nothing here sets
    // today. Hand back the screen asked for rather than falling through to the
    // unhandled-action throw.
    if (action === "BACK") {
      return {
        version,
        screen,
        data: {},
      };
    }
    const survey = await getSurveyById(dbFlow.surveyId);
    const questions = survey.questions as unknown as Question[];

    if (action === "data_exchange") {
      const run = await resolveFlowRun(flow_token, dbFlow.orgId);
      if (!run) {
        throw unusableRequest(
          `No flow run found for flow_token: ${flow_token}`,
          "This survey is no longer available",
        );
      }
      // save responses
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

        const integration = (await getIntegrationByName(
          run.orgId,
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
      // The v2 parser yields `response: undefined` for an unanswered optional
      // field; that shape was always written straight into the session's Json
      // column, so keep accepting it rather than dropping the entry.
      const collected = await recordFlowResponses(
        run,
        currentScreenResponses as WaFlowQuestionResponse[],
      );
      const currentRun: FlowRun = { ...run, responses: collected };

      // handle the request based on the current screen
      let nextScreen = null;
      const currentIndex = json.screens.findIndex((s) => s.id === screen);
      const currentScreen = json.screens[currentIndex];

      if (Object.keys(dbFlow.logicJumps[screen] || {}).length > 0) {
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
              nextScreen = json.screens[currentIndex + 1]?.id;
            } else if (logicJump.action === LogicAction.EndSurvey) {
              return await handleFlowEnd({
                run: currentRun,
                decryptedBody,
              });
            } else {
              log.trace({ screen, target: logicJump.action }, "Logic jump taken");
              nextScreen = logicJump.action;
            }
          }
        }
        if (!nextScreen) {
          nextScreen = json.screens[currentIndex + 1]?.id;
        }
      } else if (currentIndex === json.screens.length - 1) {
        return await handleFlowEnd({
          run: currentRun,
          decryptedBody,
        });
      } else {
        nextScreen = json.screens[currentIndex + 1]?.id;
      }

      return {
        version,
        screen: nextScreen,
        data: {},
      };
    }

    // Every documented action is handled above. Anything else is a protocol we
    // do not speak, and returning nothing would encrypt `undefined` back to the
    // client.
    throw new Error(`Unhandled flow endpoint action: ${action}`);
  } catch (error) {
    // Rethrown as-is: the encryption layer turns a FlowEndpointException into
    // the status code it carries, and anything else into a 500 it can log with
    // the real cause rather than a generic replacement.
    log.error({ err: error, action, screen }, "Error in handling flow request");
    throw error;
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
/** The survey mapping plus the survey and flow config a run needs. */
export async function getSurveyTeamMapWithFlow(surveyTeamMapId: string) {
  return await prisma.surveyTeamMap.findFirst({
    where: { id: surveyTeamMapId },
    include: { survey: { include: { WaFlow: true } }, team: true },
  });
}

/**
 * One in-flight flow run. The signed `flow_token` carries the context and Redis
 * holds the answers collected so far, so a run needs no database row of its own.
 */
export interface FlowRun {
  flowToken: string;
  phone: string;
  orgId: string;
  surveyTeamMapId: string;
  language: string;
  tag?: string | null;
  campaignParticipantId?: string | null;
  campaignParticipantDripStageId?: string | null;
  surveyTeamMap: NonNullable<Awaited<ReturnType<typeof getSurveyTeamMapWithFlow>>>;
  /** v1 answers carry `type`; v2 flow answers legitimately omit it. */
  responses: WaFlowQuestionResponse[];
}

/**
 * Recovers the run a webhook belongs to. `orgId` comes from the flow's own
 * endpoint URL, so it is trusted; a token claiming a different org is rejected
 * rather than followed.
 */
export async function resolveFlowRun(flowToken: string, orgId: string): Promise<FlowRun | null> {
  const context = verifyFlowToken(flowToken);
  if (!context) return null;
  if (context.orgId !== orgId) {
    log.error(
      { tokenOrgId: context.orgId, orgId },
      "Flow token was issued for a different org; refusing it",
    );
    return null;
  }
  const surveyTeamMap = await getSurveyTeamMapWithFlow(context.surveyTeamMapId);
  if (!surveyTeamMap) {
    log.error({ surveyTeamMapId: context.surveyTeamMapId }, "SurveyTeamMap in token not found");
    return null;
  }
  return {
    flowToken,
    phone: context.phone,
    orgId: context.orgId,
    surveyTeamMapId: context.surveyTeamMapId,
    language: context.language,
    tag: context.tag,
    campaignParticipantId: context.campaignParticipantId,
    campaignParticipantDripStageId: context.campaignParticipantDripStageId,
    surveyTeamMap,
    responses: await getFlowResponses<WaFlowQuestionResponse>(flowToken),
  };
}

/** Records this screen's answers against the run and returns the full set so far. */
async function recordFlowResponses(
  run: FlowRun,
  screenResponses: WaFlowQuestionResponse[],
): Promise<WaFlowQuestionResponse[]> {
  return await appendFlowResponses<WaFlowQuestionResponse>(run.flowToken, screenResponses);
}

/** Releases the run's in-progress answers. */
async function endFlowRun(run: FlowRun) {
  await clearFlowResponses(run.flowToken);
}

interface handleFlowEndProps {
  run: FlowRun;
  decryptedBody: DecryptedFlowRequestBody;
}
async function handleFlowEnd({ run, decryptedBody }: handleFlowEndProps) {
  const { version, flow_token } = decryptedBody;
  const uniqueResponses = removeDuplicateResponses(run.responses);
  await saveResponses({
    ...run,
    responses: uniqueResponses,
    idempotencyKey: run.flowToken,
  });
  await endFlowRun(run);
  const waFlow = run.surveyTeamMap.survey.WaFlow;
  const versionCheck = waFlow?.version === 1;

  let sendGRLink: boolean;
  if (versionCheck) {
    sendGRLink = shouldShowGoogleReview({
      questions: run.surveyTeamMap.survey.questions,
      // v1 answers always carry `type`; narrow away the v2 variant.
      responses: uniqueResponses.filter((r): r is QuestionResponse => "type" in r),
    });
  } else {
    if (!waFlow) {
      throw new Error(`WaFlow not found for survey: ${run.surveyTeamMap.survey.id}`);
    }
    sendGRLink = shouldShowGoogleReviewV2({
      screens: waFlow.json.screens,
      responses: uniqueResponses,
    });
  }

  if (sendGRLink) {
    sendGReviewLink({
      phone: run.phone,
      surveyTeamMapId: run.surveyTeamMap.id,
      orgId: run.orgId,
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
  const { from, flowResponse } = parseMessage(waMessage);
  if (!flowResponse) {
    log.trace("Flow reply carried no response payload. Ignoring...");
    return;
  }
  if (flowResponse["responses_saved"]) {
    log.trace("Flow response already saved. Ignoring...");
    return;
  }

  // The token Meta echoes back identifies the run; it falls back to the sender's
  // phone for flows sent before signed tokens shipped.
  const flowToken = (flowResponse["flow_token"] as string | undefined) ?? from;
  const run = await resolveFlowRun(flowToken, orgId);
  if (!run) {
    log.error("No flow run found for %s", from);
    return;
  }
  if (!run.surveyTeamMap?.survey?.WaFlow) {
    log.error("WaFlow not found for run %s", run.surveyTeamMapId);
    return;
  }
  const dbFlowId = run.surveyTeamMap.survey.WaFlow.dbFlowId;
  const flow = await getFlowFromDb(dbFlowId, run.orgId);
  if (!flow) {
    log.error("Flow not found: %s", dbFlowId);
    return;
  }

  const questionResponses = generateQuestionResponsesFromFlowResponse({
    flow,
    flowResponses: flowResponse,
    surveyTeamMapId: run.surveyTeamMap.id,
  });

  // A static flow submits every answer in this one payload, so the collected
  // set is replaced rather than appended to.
  const uniqueResponses = removeDuplicateResponses(questionResponses);
  await saveResponses({
    ...run,
    responses: uniqueResponses,
    idempotencyKey: run.flowToken,
  });

  const versionCheck = run.surveyTeamMap.survey.WaFlow.version === 1;

  const sendGRLink = versionCheck
    ? shouldShowGoogleReview({
        questions: run.surveyTeamMap.survey.questions,
        // v1 answers always carry `type`; narrow away the v2 variant.
        responses: uniqueResponses.filter((r): r is QuestionResponse => "type" in r),
      })
    : shouldShowGoogleReviewV2({
        screens: run.surveyTeamMap.survey.WaFlow.json.screens,
        responses: uniqueResponses,
      });

  if (sendGRLink) {
    await sendGReviewLink({
      phone: run.phone,
      surveyTeamMapId: run.surveyTeamMap.id,
      orgId: run.orgId,
    });
  }

  // Use the utility function to find the recent automation
  const progress = await findRecentAutomation(run.phone, orgId);
  const automation = progress?.waAutomatedReply;
  if (automation) {
    if (!progress.currentNode) {
      log.error("Automation progress for phone %s has no currentNode", run.phone);
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
        phone: run.phone,
        orgId,
        flowId: dbFlowId,
        recentActivity: {
          ...progress,
          currentNode: nextNode.id,
        },
      });

      await processNextNode(run.phone, automation, progress.currentNode, orgId, automationLog?.id);
    }
  }
  await endFlowRun(run);
}

export function removeDuplicateResponses<T extends { questionId: string }>(responses: T[]): T[] {
  const qIds = responses.map((r) => r.questionId);

  const uniqueQIds = [...new Set(qIds)];

  const reversedRes = responses.toReversed();

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
