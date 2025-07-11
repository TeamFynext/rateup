import axios from "axios";
import { getWaSettings } from "../settings/wa_settings.service";
import { callWhatsappApi } from "../wa_axios";
import {
  generateFlowMessageData,
  generateQuestionResponsesFromFlowResponse,
  getFlowFormElementNameFromQuestionId,
  getFlowJsonWithTitleAndDescription,
  injectIdToFlowJson,
  parseFlowResponse,
  parseResponseFromCurrentScreenResponse,
  removeIdFromFlowJson,
} from "./flow.utils";
import { WaFlow } from "../../../../../../../../generated/prisma/client";
import { UpdateFlowInput } from "./flow.schema";
import FormData from "form-data";
import {
  deleteSession,
  getSession,
  saveResponses,
  sendMessage,
  shouldShowGoogleReview,
  updateSession,
} from "../whatsappSurvey/wasurvey.service";
import {
  createCTAButtonMessage,
  parseMessage,
} from "../whatsappSurvey/wasurvey.utils";
import { WaFlowStatus, LogicAction } from "../../../../../../../types/enums";
import { FlowLogicJump } from "../../../../../../../types/global";
import { WaMessageBody } from "../../../../../../../types/whatsapp.types";
import {
  getShortUrlId,
  shortIdUniqueConstraintErrHandler,
} from "../../../../../../../utils/commonUtils";
import { log } from "../../../../../../../utils/logger";
import prisma from "../../../../../../../utils/prisma";
import { validateLogic } from "../../../../../../question/question.utils";
import { getSurveyById } from "../../../../../../survey/survey.service";

/**
 * Get flows from whatsapp
 * @param orgId
 * @returns
 */
export async function getFlowsFromWa(orgId: string) {
  const waSettings = await getWaSettings(orgId);

  const res = await callWhatsappApi(
    `/${waSettings.wabaId}/flows`,
    "GET",
    waSettings.accessToken,
  );

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
  //query: fields=id,name,categories,preview,status,validation_errors,json_version,data_api_version,data_channel_uri,whatsapp_business_account,application

  const res = await callWhatsappApi(
    `/${flowId}`,
    "GET",
    waSettings.accessToken,
  );

  const flow = res.data as WaFlowWa;

  return flow;
}

export async function getFlowPreviewFromWa(orgId: string, waFlowId: string) {
  const waSettings = await getWaSettings(orgId);

  const res = await callWhatsappApi(
    `/${waFlowId}?fields=preview`,
    "GET",
    waSettings.accessToken,
  );

  return res.data.preview as WaFlowPreview;
}

export async function getFlowPreviewFromDb(dbFlowId: string) {
  const flow = await prisma.waFlow.findFirst({
    where: {
      dbFlowId,
    },
  });
  return flow.preview;
}

export async function getFlowPreview(orgId: string, dbFlowId: string) {
  const flow = await getFlowFromDb(dbFlowId);
  if (
    flow?.preview?.expires_at &&
    new Date(flow.preview.expires_at) > new Date()
  ) {
    return flow.preview;
  } else {
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
export async function getFlowsFromDb(orgId: string) {
  const flows = await prisma.waFlow.findMany({
    where: {
      orgId,
    },
    include: {
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
  const jsonWithTitle = getFlowJsonWithTitleAndDescription(
    flow.json as unknown as WaFlowJson,
    flow.map,
    flow.survey,
  );
  const response = await updateFlowJsonInWa(
    orgId,
    flow.flowId,
    jsonWithTitle as WaFlowJson,
  );
  log.trace("Flow synced to whatsapp: %o", response);
  await updateFlowInDb(orgId, dbFlowId, { pendingSave: false });
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

export async function getFlowWithSurveyTeamMapIds(
  orgId: string,
  flowId: string,
) {
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

export async function getUnsyncedFlows(orgId: string) {
  const waFlows = await getFlowsFromWa(orgId);
  const dbFlows = await getFlowsFromDb(orgId);

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
  previousFlow: any,
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
  const { id, ...surveyWithoutId } = survey;

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
  const clonedSurvey = {
    ...surveyWithoutId,
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: null,
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
  const newClonedSurvey =
    await shortIdUniqueConstraintErrHandler(createClonedSurvey);
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
    },
  });
  return newClonedSurvey;
}

export async function getFlowJsonFromWa(orgId: string, waFlowId: string) {
  const assets = await getFlowAssets(orgId, waFlowId);
  const jsonAssetLink = assets.find(
    (asset) => asset.asset_type === "FLOW_JSON",
  ).download_url;

  const res = await axios.get(jsonAssetLink);
  const json = injectIdToFlowJson(res.data);
  return json;
}

/**
 *
 * @param orgId
 * @param waFlowId Flow id generated by Meta
 * @returns
 */
export async function getFlowAssets(orgId: string, waFlowId: string) {
  const waSettings = await getWaSettings(orgId);
  // TODO: handle pagination

  const res = await callWhatsappApi(
    `/${waFlowId}/assets`,
    "GET",
    waSettings.accessToken,
  );

  return res.data.data;
}

interface sendFlowProps {
  orgId: string;
  dbFlowId: string;
  phone: string;
}
export async function sendFlow({ orgId, dbFlowId, phone }: sendFlowProps) {
  try {
    log.trace("Sending flow %s to %s", dbFlowId, phone);
    const dbFlow = await getFlowFromDb(dbFlowId);

    const messageData = generateFlowMessageData({
      to: phone,
      dbFlow,
    });
    await sendMessage(orgId, { ...messageData, to: phone });
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
  flowMap: any;
  surveyId: string;
  status: string;
  name: string;
  logicJumps?: {};
  templateMessage?: {
    body: string;
    cta: string;
  };
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
  const { wabaId, accessToken } = await getWaSettings(orgId);

  const { data } = await callWhatsappApi(
    `/${wabaId}/flows`,
    "POST",
    accessToken,
    createFlowInput,
  );
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
  const { wabaId, accessToken } = await getWaSettings(orgId);

  const { data } = await callWhatsappApi(
    `/${wabaId}/flows`,
    "POST",
    accessToken,
    createFlowInput,
  );
  return data as { id: string };
}

export async function updateFlowInDb(
  orgId: string,
  dbFlowId: string,
  data: UpdateFlowInput,
) {
  const updatedFlow = prisma.waFlow.update({
    where: {
      dbFlowId: dbFlowId,
    },
    data: data,
    include: {
      survey: true,
    },
  });

  // updating survey title if name is updated
  if (data.name) {
    await prisma.survey.updateMany({
      where: {
        WaFlow: {
          dbFlowId,
          orgId,
        },
      },
      data: {
        title: data.name,
      },
    });
  }

  return updatedFlow;
}
export async function updateFlowMetaDataInWa(
  orgId: string,
  flowId: string,
  updatedData: { name?: string; categories?: string[]; endpoint_uri?: string },
) {
  const { accessToken } = await getWaSettings(orgId);
  const { data } = await callWhatsappApi(
    `/${flowId}`,
    "POST",
    accessToken,
    updatedData,
  );
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
) {
  const { accessToken } = await getWaSettings(orgId);
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
    const res = await axios.post(
      `https://graph.facebook.com/v18.0/${waFlowId}/assets`,
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
    log.trace("Failed to update flow json in wa %o", e);
  }
}

export async function deleteFlowInWa(orgId: string, waFlowId: string) {
  const { accessToken } = await getWaSettings(orgId);
  const res = await callWhatsappApi(`/${waFlowId}`, "DELETE", accessToken);
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
  const { accessToken } = await getWaSettings(orgId);
  const res = await callWhatsappApi(
    `/${waFlowId}/deprecate`,
    "POST",
    accessToken,
  );
  return res.data;
}

export async function publishFlowInWa(orgId: string, waFlowId: string) {
  const { accessToken } = await getWaSettings(orgId);
  const res = await callWhatsappApi(
    `/${waFlowId}/publish`,
    "POST",
    accessToken,
  );
  return res.data;
}
export async function getFlowBySurveyId(surveyId: string) {
  return prisma.waFlow.findFirst({
    where: {
      surveyId,
    },
  });
}

// TODO: move to controller.ts
export const handleDecryptedFlowRequest = async (
  decryptedBody,
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
      // save responses
      log.trace("Received data exchange request");
      const currentScreenResponses = parseResponseFromCurrentScreenResponse(
        dbFlow,
        questions,
        data,
      );
      log.trace("Current screen responses: %o", currentScreenResponses);
      session = await updateSession(session.orgId, session.phone, {
        responses: [...session.responses, ...currentScreenResponses],
      });
      // handle the request based on the current screen
      let nextScreen = null;
      const currentIndex = json.screens.findIndex((s) => s.id === screen);

      if (Object.keys(dbFlow.logicJumps[screen] || {}).length > 0) {
        log.trace(
          "Logic jumps found for screen: %s \n %o",
          screen,
          dbFlow.logicJumps[screen],
        );
        const logicJumps = dbFlow.logicJumps[
          screen
        ] as unknown as FlowLogicJump[];
        for (const logicJump of logicJumps) {
          let logicPassed = logicJump.conditions.every((condition) => {
            const flowElementName = getFlowFormElementNameFromQuestionId(
              condition.questionId,
              dbFlow.map,
            );
            const question = questions.find(
              (q) => q.id === condition.questionId,
            );
            log.trace("raw response: %o", data[flowElementName]);
            if (!data[flowElementName]) {
              // TODO: add logicCondition for skipped questions
              return false;
            }
            const response = parseFlowResponse({
              flowJson: json,
              flowMap: dbFlow.map,
              elementName: flowElementName,
              response: data[flowElementName],
            });
            log.trace("parsed response: %s", response);
            return validateLogic(
              question,
              response,
              "en", //TODO
              condition.condition,
              condition.response,
            );
          });

          if (logicPassed) {
            if (logicJump.action === LogicAction.NextQ) {
              log.trace("Logic passed, moving to next question");
              nextScreen = json.screens[currentIndex + 1]?.id;
              console.log("nextScreen", nextScreen, currentIndex);
            } else if (logicJump.action === LogicAction.EndSurvey) {
              return await handleFlowEnd({
                session,
                decryptedBody,
              });
            } else {
              log.trace(
                "Logic passed, jumping to screen: %s",
                logicJump.action,
              );
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
          session,
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
    log.error("Error in handling flow request: %o", error);
    throw new Error(
      "Unhandled endpoint request. Make sure you handle the request action & screen logged above.",
    );
  }
};

interface handleFlowEndProps {
  session: WaSessionWithRelations;
  decryptedBody: any;
}
async function handleFlowEnd({ session, decryptedBody }: handleFlowEndProps) {
  log.trace("Ending Flow");
  const { version, flow_token } = decryptedBody;
  const uniqueResponses = removeDuplicateResponses(session.responses);
  session.responses = uniqueResponses;
  await saveResponses(session);
  const sendGRLink = shouldShowGoogleReview({
    questions: session.surveyTeamMap.survey.questions,
    responses: uniqueResponses,
  });

  if (sendGRLink) {
    sendGReviewLink({
      phone: session.phone,
      surveyTeamMapId: session.surveyTeamMapId,
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

interface sendGReviewLinkProps {
  phone: string;
  surveyTeamMapId: string;
  orgId: string;
}
export async function sendGReviewLink({
  phone,
  surveyTeamMapId,
  orgId,
}: sendGReviewLinkProps) {
  log.trace("Sending google review link to %s", phone);
  const thankYouPage = `${process.env.FRONTEND_URL}/public/survey/${surveyTeamMapId}/end?k=n&msg=thanks`;
  const googleReviewMessage = createCTAButtonMessage({
    to: phone,
    buttonText: "Review us on Google",
    url: thankYouPage,
    body: "Thank you for your feedback!",
  });
  await sendMessage(orgId, googleReviewMessage);
}

export function removeDuplicateResponses(responses: QuestionResponse[]) {
  const qIds = responses.map((r) => r.questionId);

  const uniqueQIds = [...new Set(qIds)];

  const reversedRes = responses.reverse();

  return uniqueQIds.map((qId) => reversedRes.find((r) => r.questionId === qId));
}

export async function handleStaticFlowReply(
  orgId: string,
  waMessage: WaMessageBody,
) {
  log.trace("handling flow reply");
  const { from, flowResponse } = parseMessage(waMessage);
  if (flowResponse["responses_saved"]) {
    log.trace("Flow response already saved. Ignoring...");
    return;
  }

  let session = await getSession(orgId, from);
  if (!session) {
    log.error("Session not found for %s", from);
    return;
  }
  const dbFlowId = session.surveyTeamMap.survey.WaFlow.dbFlowId;
  const flow = await getFlowFromDb(dbFlowId);

  const questionResponses = generateQuestionResponsesFromFlowResponse({
    flow,
    flowResponses: flowResponse,
    surveyTeamMapId: session.surveyTeamMapId,
  });

  const uniqueResponses = removeDuplicateResponses(questionResponses);
  session.responses = uniqueResponses;
  await saveResponses(session);

  if (
    shouldShowGoogleReview({
      questions: session.surveyTeamMap.survey.questions,
      responses: uniqueResponses,
    })
  ) {
    await sendGReviewLink({
      phone: session.phone,
      surveyTeamMapId: session.surveyTeamMapId,
      orgId: session.orgId,
    });
  }
  await deleteSession(session.orgId, session.phone);
}
