import {
  PlatformType,
  ResponsePlatform,
  WhatsappSettings,
} from "../../../../generated/prisma/client";
import {
  CampaignParticipantStatus,
  LogicAction,
  QuestionType as Q,
  QuestionType,
  QuestionType2,
  WaEvent,
  WaQuestions,
} from "../../../types/enums";
import {
  LeadGenBody,
  WaMessageBody,
  WaReceiveMessageBody,
  WaSendMessageBody,
} from "../../../types/whatsapp.types";
import { log } from "../../../utils/logger";
import prisma from "../../../utils/prisma";
import {
  updateCampaignParticipant,
  updateDripCampaignParticipant,
} from "../../campaign/campaignParticipants/campaignParticipants.service";
import { getOrCreateContactByPhone } from "../../contact/contact.service";
import { getQuestionsBySurveyId } from "../../question/question.service";
import { parseLogicAction } from "../../question/question.utils";
import { CreateResponseInput } from "../../response/response.schema";
import {
  createResponse,
  saveResponseToGoogleSheet,
  sendResponseToWebhook,
  updateResponse,
} from "../../response/response.service";
import {
  updateCompletedSurvey,
  updateVisitedSurvey,
} from "../../survey/survey.service";
import { handleWaMessages } from "../inbox/message/wamessage.controller";
import {
  getWaSettings,
  getWaSettingsByIbaId,
} from "../settings/wa_settings.service";
import { GraphApiError, callWhatsappApi } from "../wa_axios";
import {
  createCTAButtonMessage,
  createNativeListMessage,
  createTemplateMessage,
  createTextMessage,
  downloadAndUpload,
  generateMessageDataFromQuestion,
  getMessageObject,
  getQuestionByIdFromSession,
  parseMessage,
  ratingEmoji,
} from "./wasurvey.utils";
import { getGraphApiErrorMessage } from "../wa_error_handler";
import { uploadFile } from "../../../utils/upload/s3Upload";
import axios from "axios";
import { handleLoyaltyFeedback } from "../../loyalty/settings/settings.service";

import {
  findRecentAutomation,
  logAutomationAction,
  logFlowCompletion,
} from "./automation-logger.utils";
import { processNextNode } from "./wasurvey.controller";
import { waStatusQueue } from "../../../utils/redisConnection";
import { assertNodeType, LeadgenNodeData, NodeData } from "./node-types";

export const toBeIncludedWaSessionRelations = {
  surveyTeamMap: {
    include: {
      survey: {
        include: {
          WaFlow: true,
        },
      },
      team: true,
    },
  },
};

export async function sendMessage(
  orgId: string,
  messageData: WaSendMessageBody | IgSendMessageBody,
  userName?: string,
  userId?: string,
  whatsappSettingsPhoneId?: string,
  platform: PlatformType = PlatformType.WHATSAPP,
) {
  let waSettings: Omit<WhatsappSettings, "accessToken_iv">;
  let to: string;
  let configId: string;
  let accessToken: string;
  let sourceIdentifier: string;
  if (platform === PlatformType.INSTAGRAM) {
    waSettings = await getWaSettingsByIbaId(whatsappSettingsPhoneId);
    to = (messageData as IgSendMessageBody).recipient.id;
    configId = "me";
    accessToken = waSettings.pageAccessToken;
    sourceIdentifier = waSettings.ibaId;
  } else {
    waSettings = await getWaSettings(orgId, whatsappSettingsPhoneId);
    to = (messageData as WaSendMessageBody).to;
    configId = waSettings.phoneId;
    accessToken = waSettings.accessToken;
    sourceIdentifier = waSettings.phone;
  }
  log.trace(`sending message to %s \n%o`, to, messageData);
  try {
    const res = await callWhatsappApi(
      `/${configId}/messages`,
      "POST",
      platform === PlatformType.INSTAGRAM ? null : accessToken,
      messageData,
      platform === PlatformType.INSTAGRAM
        ? { params: { access_token: accessToken } }
        : {},
    );
    log.trace(`sent successfully %o %o `, res.data, res.statusText);
    await handleWaMessages(
      "send",
      messageData,
      to,
      orgId,
      platform,
      sourceIdentifier,
      userName,
      platform === PlatformType.INSTAGRAM
        ? res?.data?.message_id
        : res?.data?.messages?.[0]?.id,
      userId,
    );
    return { status: true, message: res?.data?.messages?.[0]?.id };
  } catch (e: any) {
    console.log("🚀 ~ e:", e);
    await handleWaMessages(
      "send",
      messageData,
      to,
      orgId,
      platform,
      sourceIdentifier,
      userName,
      null,
      userId,
      true,
    );
    log.error("Error sending message", e);
    let errorMessage = `Failed to send message`;
    if (e instanceof GraphApiError) {
      errorMessage = getGraphApiErrorMessage(e);
    }
    return {
      status: false,
      message: errorMessage,
    };
  }
}

function createBlockWhatsappUserBody(phoneNumbersList: string[]) {
  const listBody = phoneNumbersList.map((phone) => ({ user: phone }));
  return {
    messaging_product: "whatsapp",
    block_users: listBody,
  };
}

export async function blockWhatsappUser(orgId: string, phoneNumbers: string[]) {
  const waSettings = await getWaSettings(orgId);
  const body = createBlockWhatsappUserBody(phoneNumbers);
  try {
    const res = await callWhatsappApi(
      `/${waSettings.phoneId}/block_users`,
      "POST",
      waSettings.accessToken,
      body,
    );
    if (res.status === 200) {
      log.trace(`blocked users successfully %o %o`, res.data, res.statusText);
      await prisma.contact.updateMany({
        where: {
          phone: {
            in: phoneNumbers,
          },
          orgId,
        },
        data: {
          blockedOnWhatsApp: true,
        },
      });
      return { success: true };
    }
    if (res.status === 400 && res.data?.error?.code === 139100) {
      log.error("Failed to block some users: see error %o", res.data);
      const blockedNumbers = res.data?.blocked_users?.added_users?.map(
        (user) => user?.input,
      );
      const failedNumbers = res.data?.blocked_users?.failed_users?.map(
        (user) => user?.input,
      );
      log.trace(`blocked users successfully %o %o`, res.data, res.statusText);
      await prisma.contact.updateMany({
        where: {
          phone: {
            in: blockedNumbers,
          },
          orgId,
        },
        data: {
          blockedOnWhatsApp: true,
        },
      });
      return {
        success: false,
        failedNumbers,
      };
    }
    return { success: false };
  } catch (e) {
    console.error(e);
    log.error(e);
    return { success: false, error: e };
  }
}

export async function unblockWhatsappUser(
  orgId: string,
  phoneNumbers: string[],
) {
  const waSettings = await getWaSettings(orgId);
  const body = createBlockWhatsappUserBody(phoneNumbers);
  try {
    const res = await callWhatsappApi(
      `/${waSettings.phoneId}/block_users`,
      "DELETE",
      waSettings.accessToken,
      body,
    );
    if (res.status === 200) {
      log.trace(`blocked users successfully %o %o`, res.data, res.statusText);
      await prisma.contact.updateMany({
        where: {
          phone: {
            in: phoneNumbers,
          },
          orgId,
        },
        data: {
          blockedOnWhatsApp: false,
        },
      });
      return { success: true };
    }
    if (res.status === 400 && res.data?.error?.code === 139100) {
      log.error("Failed to block some users: see error %o", res.data);
      const unblockedNumbers = res.data?.blocked_users?.added_users?.map(
        (user) => user?.input,
      );
      const failedNumbers = res.data?.blocked_users?.failed_users?.map(
        (user) => user?.input,
      );
      log.trace(`blocked users successfully %o %o`, res.data, res.statusText);
      await prisma.contact.updateMany({
        where: {
          phone: {
            in: unblockedNumbers,
          },
          orgId,
        },
        data: {
          blockedOnWhatsApp: false,
        },
      });
      return {
        success: false,
        failedNumbers,
      };
    }
    return { success: false };
  } catch (e) {
    console.error(e);
    log.error(e);
    return { success: false, error: e };
  }
}

export async function getSession(orgId: string, phone: string) {
  const session = await prisma.waSession.findUnique({
    where: {
      phone_orgId: {
        phone: phone,
        orgId: orgId,
      },
    },
    include: toBeIncludedWaSessionRelations,
  });
  return session;
}
export async function deleteSession(orgId: string, phone: string) {
  log.info("Deleting session for %o", { phone, orgId });
  try {
    await prisma.waSession.delete({
      where: {
        phone_orgId: {
          phone,
          orgId,
        },
      },
    });
  } catch (e: any) {
    if (e.code === "P2025") {
      // No session found. Ignoring...
    } else {
      throw e;
    }
  }
}

export async function getFirstQuestionId(surveyId: string) {
  const questions = await getQuestionsBySurveyId(surveyId);
  return questions[0].id;
}

interface createSessionParams {
  phone: string;
  surveyTeamMapId: string;
  orgId: string;
  templateId?: string;
  language?: string;
  currentQuestionId?: string;
  campaignParticipantId?: string;
  ip?: string;
  tag?: string;
  type?: string;
  createdAt?: string;
}
export async function createSession({
  phone,
  surveyTeamMapId,
  orgId,
  templateId,
  language = "",
  currentQuestionId,
  campaignParticipantId,
  ip = "",
  tag,
  type = "survey",
  createdAt,
}: createSessionParams) {
  log.info("Creating session \n%o\n", { phone, surveyTeamMapId, language });

  const session = await prisma.waSession.create({
    data: {
      phone: phone,
      surveyTeamMapId: surveyTeamMapId,
      language: language,
      templateId: templateId,
      orgId: orgId,
      currentQuestionId: currentQuestionId,
      campaignParticipantId: campaignParticipantId,
      ip: ip ? ip : undefined,
      tag,
      type,
      createdAt,
    },
    include: toBeIncludedWaSessionRelations,
  });

  log.trace("Session created");
  return session as unknown as WaSessionWithRelations; // overriding JSON type of responses
}

export async function updateSession(orgId: string, phone: string, data: any) {
  log.trace("Updating session \n%o\n", { phone, orgId, data });
  const session = await prisma.waSession.update({
    where: {
      phone_orgId: {
        phone: phone,
        orgId: orgId,
      },
    },
    include: toBeIncludedWaSessionRelations,
    data: data,
  });
  log.trace("Session updated");
  return session as unknown as WaSessionWithRelations; // overriding JSON type of responses
}

export async function sendNextQuestion(
  session: WaSessionWithRelations,
  response: any,
) {
  const { currentQuestionId, surveyTeamMap } = session;
  if (!currentQuestionId) {
    log.error("CurrentQuestionId is null");
    throw new Error("CurrentQuestionId is null");
  }
  const questions = surveyTeamMap.survey.questions;
  const currentQuestion = questions.find((q) => q.id === currentQuestionId);
  if (!currentQuestion) {
    throw new Error("CurrentQuestion Not Found");
  }
  const next = parseLogicAction(currentQuestion, response, session.language);
  log.info("Next action: %s", next);
  const currentIndex = questions.findIndex((q) => q.id === currentQuestionId);

  if (next === LogicAction.NextQ && questions.length > currentIndex + 1) {
    // Send next question
    const nextQuestion = questions[currentIndex + 1];
    await sendQuestion(nextQuestion, session);
  } else if (
    next === LogicAction.EndSurvey ||
    questions.length <= currentIndex + 1
  ) {
    // End Survey
    await saveResponses(session);
    if (
      shouldShowGoogleReview({
        questions: session.surveyTeamMap.survey.questions,
        responses: session.responses,
      })
    ) {
      log.trace("Sending google review link to %s", session.phone);
      const thankYouPage = `${process.env.FRONTEND_URL}/public/survey/${session.surveyTeamMapId}/end?k=n&msg=thanks`;
      const googleReviewMessage = createCTAButtonMessage({
        to: session.phone,
        buttonText: "Review us on Google",
        url: thankYouPage,
        body: "Thank you for your feedback!",
      });
      await sendMessage(session.orgId, googleReviewMessage);
    } else {
      const ThankYouMessage = createTextMessage(
        session.phone,
        "Thank You",
        "Have a nice day!",
      );
      await sendMessage(session.orgId, ThankYouMessage);
    }
    await deleteSession(session.orgId, session.phone);
  } else {
    // 'next' is a question id
    const nextQuestion = getQuestionByIdFromSession(session, next);
    if (!nextQuestion) {
      throw new Error("Question not found");
    }
    await sendQuestion(nextQuestion, session);
  }
}
const googleReviewSupportedTypes = [Q.Rating, Q.Smiley, Q.Opinion];

interface ShouldShowGoogleReviewProps {
  questions: Question[];
  responses: QuestionResponse[];
}
export function shouldShowGoogleReview({
  questions,
  responses,
}: ShouldShowGoogleReviewProps) {
  log.trace("q\n%o\nr%o", questions, responses);
  let showGoogleReview = false;
  questions.forEach((q: Question) => {
    if (googleReviewSupportedTypes.includes(q.type) && q.googleReview) {
      const questionResponse = responses.find((r) => r.questionId === q.id);
      switch (q.type) {
        case Q.Rating:
          if (
            Number.parseInt(questionResponse.response[questionResponse.type]) >=
            q.googleReview.minRating
          ) {
            showGoogleReview = true;
          }
          break;
        case Q.Smiley:
          if (
            q.googleReview.reqOptions.includes(
              questionResponse.response[questionResponse.type],
            )
          ) {
            showGoogleReview = true;
          }
          break;
        case Q.Opinion:
          if (
            Number.parseInt(questionResponse.response[questionResponse.type]) >=
            q.googleReview.minOpinion
          ) {
            showGoogleReview = true;
          }
          break;
      }
    }
  });
  return showGoogleReview;
}
export function shouldShowGoogleReviewV2({ screens, responses }) {
  const questions = screens.flatMap((screen) =>
    screen.layout.children.filter((child) =>
      [WaQuestions.Rating, WaQuestions.Smiley, WaQuestions.Opinion].includes(
        child.metaType,
      ),
    ),
  );
  log.trace("q\n%o\nr%o", questions, responses);
  let showGoogleReview = false;
  questions.forEach((q: Question2) => {
    if (q.googleReview) {
      const questionResponse = responses.find((r) => r.questionId === q.id);
      switch (q.metaType) {
        case WaQuestions.Rating:
          if (
            Number.parseInt(questionResponse.response) >=
            q.googleReview.minRating
          ) {
            showGoogleReview = true;
          }
          break;
        case WaQuestions.Smiley:
          if (q.googleReview.reqOptions.includes(questionResponse.response)) {
            showGoogleReview = true;
          }
          break;
        case WaQuestions.Opinion:
          if (
            Number.parseInt(questionResponse.response) >=
            q.googleReview.minOpinion
          ) {
            showGoogleReview = true;
          }
          break;
      }
    }
  });
  return showGoogleReview;
}
async function updateCurrentQuestion(
  orgId: string,
  from: string,
  newQId: string,
) {
  log.trace(
    "Updating current question for %o => %s\n",
    { from, orgId },
    newQId,
  );
  await prisma.waSession.update({
    where: {
      phone_orgId: {
        phone: from,
        orgId: orgId,
      },
    },
    data: {
      currentQuestionId: newQId,
    },
  });
}
export async function sendQuestion(
  question: Question,
  session: WaSessionWithRelations,
) {
  if (question.type == QuestionType.Testimonial) {
    const hasResponse = session.responses.find(
      (s) => s.questionId == question.id,
    );
    if (!hasResponse) {
      await startTestimonialQuestion(question, session);
    } else {
      await handleTestimonialQuestion(question, session);
    }
  } else {
    const message = await generateMessageDataFromQuestion(session, question);
    await updateCurrentQuestion(session.orgId, session.phone, question.id);
    await sendMessage(session.orgId, message);
  }
}

function checkShouldRaiseTicket(ticketIssued: FlowTicket[], responses) {
  let shouldRaiseTicket = false;
  for (const ticket of ticketIssued) {
    const response = responses.find((r) => r.questionId === ticket.questionId);
    if (!response) continue;
    if (ticket.condition.submissionTicket) shouldRaiseTicket = true;
    switch (ticket.type) {
      case QuestionType2.Rating:
        shouldRaiseTicket =
          Number(response.response) <= ticket.condition.minRating;
        break;
      case QuestionType2.Smiley:
        shouldRaiseTicket = ticket.condition.reqOptions.includes(
          response.response,
        );
        break;
      case QuestionType2.Opinion:
        shouldRaiseTicket =
          Number(response.response) <= ticket.condition.minOpinion;
        break;
      case QuestionType2.CheckboxGroup:
      case QuestionType2.ChipsSelector:
      case QuestionType2.Dropdown:
      case QuestionType2.RadioButtonsGroup:
        shouldRaiseTicket = Array.isArray(response.response)
          ? ticket.condition.reqOptions.some((op) =>
              response.response.includes(op),
            )
          : ticket.condition.reqOptions.includes(response.response);
        break;
    }
    if (shouldRaiseTicket) return true;
  }
  return shouldRaiseTicket;
}
function getColumnIdFromTickets(ticketIssued: FlowTicket[], responses) {
  for (const ticket of ticketIssued) {
    const response = responses.find((r) => r.questionId === ticket.questionId);
    if (!response) continue;
    return ticket.selectedColumnId;
  }
  return null;
}
/**
 * Saves responses to the database in SurveyResponse table.
 * To be called after getting response to the last question.
 *
 * -> updates completedSurvey count
 */
export async function saveResponses(session: WaSessionWithRelations) {
  let anonymous = session?.surveyTeamMap?.survey?.WaFlow?.anonymous ?? false;
  log.trace("Saving responses for %o", {
    id: session.id,
    phone: anonymous ? "anonynous" : session.phone,
    responses: session.responses,
  });
  let questionResponses =
    session.responses as unknown as Array<QuestionResponse>;
  let responsesWithSha256 = questionResponses?.filter((response) => {
    return (
      response.response &&
      Array.isArray(response.response) &&
      response.response.some((r) => r.sha256)
    );
  });
  if (responsesWithSha256?.length > 0) {
    try {
      const settings = await getWaSettings(session.orgId);
      // Step 1: Download the media from WhatsApp API
      for await (let response of responsesWithSha256) {
        let parsedResponse = response.response?.[0];
        const fileUrl = await callWhatsappApi(
          `/${parsedResponse?.id}`,
          "GET",
          settings.accessToken,
        );
        if (fileUrl?.data) {
          // Step 2: Convert the downloaded media to a Buffer (for binary data)
          const fileResponse = await axios.get(fileUrl?.data.url, {
            responseType: "arraybuffer",
            headers: {
              Authorization: `Bearer ${settings.accessToken}`,
            },
          });
          // Step 3: Prepare S3 upload parameters
          const imageBuffer = Buffer.from(fileResponse.data, "binary");

          const s3Params = {
            Bucket: process.env.AWS_S3_BUCKET || "rateup-survey-uploads",
            Key: parsedResponse.file_name,
            ContentType: parsedResponse?.mime_type,
            Body: imageBuffer,
          };

          // Step 4: Upload the file to S3
          const obj = await uploadFile(s3Params);
          if (response.type) {
            response.response[response.type] = obj["Key"] ? obj["Key"] : null;
          } else {
            response.response = obj["Key"] ? obj["Key"] : null;
          }
        } else {
          log.error("Failed to download media file from WhatsApp API.");
        }
      }
    } catch (error) {
      log.error("Error occurred while processing media file:", error);
    }
  }
  // TODO: save name
  const contact =
    !anonymous &&
    (await getOrCreateContactByPhone(session.phone, session.orgId));
  const surveyResponse: CreateResponseInput = {
    surveyTeamMapId: session.surveyTeamMapId,
    responses: questionResponses,
    language: session.language,
    platform: ResponsePlatform.WHATSAPP,
    contactId: contact?.id,
    tag: session.tag,
  };
  const ticketIssued = session?.surveyTeamMap?.survey?.WaFlow
    ?.ticketIssued as unknown as FlowTicket[];
  let shouldRaiseTicket =
    session?.surveyTeamMap?.survey?.enableAutoGenerateTicket;
  let columnId = session?.surveyTeamMap?.survey?.ticketColumnId;
  if (ticketIssued.length && !shouldRaiseTicket) {
    columnId = getColumnIdFromTickets(ticketIssued, questionResponses);
    shouldRaiseTicket = checkShouldRaiseTicket(ticketIssued, questionResponses);
  }
  const res = await createResponse(
    surveyResponse,
    shouldRaiseTicket,
    false,
    null,
    columnId,
  );
  await updateResponse(res.id, { ip: session.ip, location: undefined });
  const loyalty = await prisma.loyaltyAction.findFirst({
    where: {
      flowId: session.surveyTeamMap.survey.WaFlow.dbFlowId,
    },
  });
  if (loyalty) {
    await handleLoyaltyFeedback(session.phone, loyalty);
  }
  log.info("Responses saved \n%o\n", surveyResponse);
  const { surveyTeamMapId, responses, language, createdAt, Contact, tag } = res;
  await saveResponseToGoogleSheet({
    surveyTeamMapId,
    responses,
    language,
    createdAt,
    respondent: !anonymous && Contact?.phone,
    tag,
  });
  await sendResponseToWebhook(res);
  // TODO move out of this function
  updateCompletedSurvey(session.surveyTeamMapId).catch((e) => log.error(e));
  if (session.campaignParticipantId) {
    if (session.campaignParticipantDripStageId) {
      await updateDripCampaignParticipant(
        session.campaignParticipantDripStageId,
        {
          status: CampaignParticipantStatus.COMPLETED,
          // responseId: res.id,
        },
      );
      await updateDripCampaignStats(session.campaignParticipantDripStageId);
    } else {
      await updateCampaignParticipant(session.campaignParticipantId, {
        status: CampaignParticipantStatus.COMPLETED,
        responseId: res.id,
      });
    }

    await updateCampaignStats(session.campaignParticipantId);
  }
  return res;
}
async function updateCampaignStats(id: string) {
  const participant = await prisma.campaignParticipant.findFirst({
    where: {
      id,
    },
    select: {
      campaignId: true,
    },
  });
  if (participant?.campaignId) {
    await prisma.campaignStats.update({
      where: {
        campaignId: participant?.campaignId,
      },
      data: {
        totalCompleted: { increment: 1 },
      },
    });
  }
}
async function updateDripCampaignStats(id: string) {
  const participant = await prisma.campaignParticipantDripStage.findFirst({
    where: {
      id,
    },
    select: {
      dripStageId: true,
    },
  });
  if (participant?.dripStageId) {
    await prisma.campaignDripStage.update({
      where: {
        id: participant?.dripStageId,
      },
      data: {
        totalCompleted: { increment: 1 },
      },
    });
  }
}

export async function sendTextMessage(
  to: { phone: string; orgId: string },
  title: string,
  description: any = "",
) {
  const messageData = createTextMessage(to.phone, title, description);
  await sendMessage(to.orgId, messageData);
}
interface sendSurveyToParticipantParams {
  campaignParticipantId: string;
  phone: string;
  surveyTeamMapId: string;
  dbTemplate: WaTemplateWithTypes;
}
export async function sendSurveyToParticipant({
  campaignParticipantId,
  phone,
  surveyTeamMapId,
  dbTemplate,
}: sendSurveyToParticipantParams) {
  try {
    log.fatal("Deleting existing session if any for %s", phone); // TODO: handle this. Maybe provide options to send to remaining participants or send to all
    await deleteSession(dbTemplate.orgId, phone);
    log.trace("Sending survey to participant %s", phone);
    let session = await createSession({
      phone,
      surveyTeamMapId,
      orgId: dbTemplate.orgId,
      templateId: dbTemplate.id,
      campaignParticipantId,
    });
    log.trace("Session created %o", session);
    const { name, language } = dbTemplate.data;
    const templateQuery = {
      name,
      language: {
        code: language,
      },
    };
    const consentTemplateMessage = createTemplateMessage(phone, templateQuery);

    // TODO: send error if sending template failed
    await sendMessage(session.orgId, consentTemplateMessage);
    updateVisitedSurvey(session.surveyTeamMapId).then(() => {});
    return true;
  } catch (e) {
    log.error(e);
    return false;
  }
}

export async function handleTestimonialQuestion(
  question: Question,
  session: WaSessionWithRelations,
) {
  const features = question.features?.[session.language];
  const to = session.phone;
  const response = session?.responses?.find((s) => s.questionId == question.id)
    ?.response?.[QuestionType.Testimonial];
  if (features?.jobTitle && !response.jobTitle) {
    const description = "\nPlease share your job title";
    const nextSubQuestion = createTextMessage(to, null, description);
    await sendMessage(session.orgId, nextSubQuestion);
  }
  if (!response.testimonial) {
    const description = "\nPlease share your experience briefly";
    const nextSubQuestion = createTextMessage(to, null, description);
    await sendMessage(session.orgId, nextSubQuestion);
  }
  if (features?.rating && !response.rating) {
    const description = "\nPlease Rate us";
    const sections: WaSectionsType = [
      {
        rows: [1, 2, 3, 4, 5].map((i) => ({
          id: i.toString(),
          title: ratingEmoji.repeat(i),
        })),
      },
    ];
    const nextSubQuestion = createNativeListMessage(
      to,
      null,
      description,
      sections,
    );
    await sendMessage(session.orgId, nextSubQuestion);
  }
  if (features?.photo && !response.photo) {
    const description = "\nPlease share your photo";
    const nextSubQuestion = createTextMessage(to, null, description);
    await sendMessage(session.orgId, nextSubQuestion);
  }
  await sendNextQuestion(session, response);
}

export async function startTestimonialQuestion(
  question: Question,
  session: WaSessionWithRelations,
) {
  if (!session.language) {
    log.error("No language found for session", session);
    throw new Error("No language found for session");
  }
  const title = question.title[session.language];
  let description =
    question.description[session.language] + "\n\nPlease share your name";
  const message = createTextMessage(session.phone, title, description);
  await updateCurrentQuestion(session.orgId, session.phone, question.id);
  await sendMessage(session.orgId, message);
}

export async function handleTestimonialReply(
  reply: WaMessageBody,
  question: Question,
  session: WaSessionWithRelations,
) {
  const features = question.features?.[session?.language];
  let message = parseMessage(reply).message;
  const response = session?.responses?.find((s) => s.questionId == question.id)
    ?.response?.[QuestionType.Testimonial] || {
    name: "",
    testimonial: "",
  };
  let isValid = true;
  if (!message) isValid = false;
  else if (!response.name) {
    //assume its name response
    response.name = message;
  } else if (features?.jobTitle && !response.jobTitle) {
    //assume its job title
    response.jobTitle = message;
  } else if (!response.testimonial) {
    //assume its testimonial
    response.testimonial = message;
  } else if (features?.rating && !response.rating) {
    //assume its rating
    const rating = Number.parseInt(
      (reply.entry[0].changes[0].value as WaReceiveMessageBody).messages[0]
        .interactive.list_reply.id,
    );
    if (rating < 1 || rating > 5) isValid = false;
    else response.rating = rating;
  } else if (features?.photo && !response.photo) {
    //assume its photo
    const { message } = getMessageObject(reply);
    const uniqueFilename = await downloadAndUpload(
      session?.orgId,
      message.image.id,
    );
    if (!(message.type === "image")) {
      return undefined;
    }
    if (!(typeof uniqueFilename === "string" && uniqueFilename.length > 0))
      isValid = false;
    else response.photo = uniqueFilename;
  }
  if (!isValid) {
    await sendTextMessage(session, "Invalid response. Please try again.", "");
    await sendQuestion(question, session);
    return;
  }
  const formattedResponse: QuestionResponse = {
    questionId: session.currentQuestionId!,
    response: {
      [QuestionType.Testimonial]: response,
    },
    type: QuestionType.Testimonial,
  };
  const currentResponses = (
    session.responses as unknown as Array<QuestionResponse>
  ).filter((r) => r.questionId !== session.currentQuestionId);
  const updatedResponses = [...currentResponses, formattedResponse] as any;

  session = await updateSession(session.orgId, session.phone, {
    responses: updatedResponses,
  });
  await handleTestimonialQuestion(question, session);
}

export async function addToStatusUpdateQueue(data: {
  status: string;
  messageId: string;
  errors?: any;
}) {
  await waStatusQueue.add("status-update", data, {
    removeOnComplete: true,
    removeOnFail: true,
  });
}

export const handleMessageStatusUpdate = async (
  status: string,
  messageId: string,
  errors?: any,
) => {
  if (!messageId) return;
  await addToStatusUpdateQueue({ status, messageId, errors });
};

export async function setAiBotActiveStatus(
  phone: string,
  orgId: string,
  isActive: boolean,
  chatbotId: string,
) {
  await prisma.contact.updateMany({
    where: {
      phone: phone,
      orgId: orgId,
    },
    data: {
      isAiBotActive: isActive,
      chatbotId: chatbotId,
    },
  });
}

export async function getAiBotActiveStatus(phone: string, orgId: string) {
  const contact = await prisma.contact.findFirst({
    where: {
      phone: phone,
      orgId: orgId,
    },
  });
  return {
    isAiBotActive: contact?.isAiBotActive,
    chatbotId: contact?.chatbotId ?? null,
  };
}

export async function aibotNodeCompletion(phone: string, orgId: string) {
  const progress = await findRecentAutomation(phone, orgId);
  const automation = progress?.waAutomatedReply;
  if (automation) {
    const matchData = automation.matchData as {
      json: { edges: any[]; nodes: any };
    };
    const nextEdge = matchData?.json?.edges?.find(
      (edge: any) => edge.target === progress.currentNode,
    );

    if (!nextEdge) return;

    const nextNode = matchData?.json?.nodes?.find(
      (node: any) => node.id === nextEdge.source,
    );

    const automationLog = await logAutomationAction({
      phone,
      nodeId: progress.currentNode,
      automationId: automation.id,
      orgId,
    });

    if (nextNode) {
      await processNextNode(
        phone,
        automation,
        progress.currentNode,
        orgId,
        automationLog?.id,
      );
    }
  }
}

export async function handleLeadGen(body: WaMessageBody) {
  log.info("Handling Leadgen webhook");
  for (const lead of body.entry[0].changes) {
    const { page_id, ad_id, leadgen_id } = lead.value as LeadGenBody;
    const nodeType = "leadgenNode";
    const automation = await prisma.waAutomatedReply.findFirst({
      where: {
        matchData: {
          path: ["json", "nodes"],
          array_contains: [
            {
              type: nodeType,
              data: {
                ad: {
                  id: ad_id,
                },
                fbPageId: page_id,
              },
            },
          ],
        },
      },
    });
    if (!automation) {
      log.trace(
        "No lead automation found for pageid:%s and ad id: %s",
        page_id,
        ad_id,
      );
      return;
    }
    const matchData = automation.matchData as {
      json: { edges: any[]; nodes: any };
    };
    const leadgenNode = matchData?.json.nodes.find(
      (node) => node.type === "leadgenNode",
    );
    const leadgenNodeData = leadgenNode.data as LeadgenNodeData;
    let phone = leadgenNodeData.phone;
    let errorMessage = "";
    try {
      const res = await callWhatsappApi(
        `/${leadgen_id}?access_token=${leadgenNodeData.pageAccessToken}`,
        "GET",
      );
      if (res.data)
        await prisma.metaAssets.updateMany({
          where: {
            whatsappSettings: {
              phoneId: automation.whatsappSettingsPhoneId,
              orgId: automation.orgId,
            },
          },
          data: {
            leads: {
              push: res.data,
            },
          },
        });
      if (leadgenNodeData.phoneField?.trim().length && res.data) {
        const formValues = res.data.field_data;
        const fieldValue = formValues.find(
          (field) => field.name === leadgenNodeData.phoneField,
        );
        if (fieldValue) {
          phone = fieldValue?.values[0];
        }
      }
    } catch (e) {
      log.error("error in fetching lead details: %o", e);
      errorMessage = `Error: ${e?.error?.message ?? "some error occured"}`;
    }
    const automationLog = await logAutomationAction({
      phone,
      nodeId: leadgenNode.id,
      automationId: automation.id,
      orgId: automation.orgId,
      response: {
        value: `lead generated ID:${leadgen_id}` + errorMessage,
        action: "initial_interaction",
      },
    });
    await processNextNode(
      phone,
      automation,
      leadgenNode.id,
      automation.orgId,
      automationLog?.id,
      leadgen_id,
    );
  }
}
