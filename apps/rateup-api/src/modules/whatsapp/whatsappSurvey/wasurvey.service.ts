import { ResponsePlatform } from "@prisma/client";
import { CampaignParticipantStatus, LogicAction } from "../../../types/enums";
import { WaSendMessageBody } from "../../../types/whatsapp.types";
import { log } from "../../../utils/logger";
import prisma from "../../../utils/prisma";
import { getQuestionsBySurveyId } from "../../question/question.service";
import { parseLogicAction } from "../../question/question.utils";
import { createResponse } from "../../response/response.service";
import { getWaSettings } from "../settings/wa_settings.service";
import { callWhatsappApi } from "../wa_axios";
import { createTextMessage, generateMessageDataFromQuestion, createTemplateMessage, getQuestionByIdFromSession, createCTAButtonMessage } from "./wasurvey.utils";
import { updateCampaignParticipant } from "../../campaign/campaignParticipants/campaignParticipants.service";
import { CreateResponseInput } from "../../response/response.schema";
import { QuestionType as Q } from "../../../types/enums";

export const toBeIncludedWaSessionRelations = {
  surveyTeamMap: {
    include: {
      survey: true,
      team: true
    }
  }
}

export async function sendMessage(orgId: string, messageData: WaSendMessageBody) {
  const waSettings = await getWaSettings(orgId);

  log.trace(`sending message to %s \n%o`, messageData.to, messageData);
  try {
    const res = await callWhatsappApi(
      `/${waSettings.phoneId}/messages`,
      "POST",
      waSettings.accessToken,
      messageData
    )
    log.trace(`sent successfully %o %o `, res.data, res.statusText)
    return true;
  } catch (e: any) {
    log.error("Error sending message")
    console.log(e.response);
    return false
  }
}

export async function getSession(orgId: string, phone: string) {
  const session = await prisma.waSession.findUnique({
    where: {
      phone_orgId: {
        phone: phone,
        orgId: orgId,
      }
    },
    include: toBeIncludedWaSessionRelations
  });
  if (!session) {
    throw new Error("Session not found");
  }
  return session as unknown as WaSessionWithRelations; // overriding JSON type of responses
}
export async function deleteSession(orgId: string, phone: string) {
  log.info("Deleting session for %o", { phone, orgId });
  try {
    await prisma.waSession.delete({
      where: {
        phone_orgId: {
          phone,
          orgId
        }
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
  phone: string,
  surveyTeamMapId: string,
  orgId: string,
  templateId?: string,
  language?: string,
  currentQuestionId?: string,
  campaignParticipantId?: string
}
export async function createSession({
  phone,
  surveyTeamMapId,
  orgId,
  templateId,
  language = "",
  currentQuestionId,
  campaignParticipantId
}: createSessionParams
) {
  log.info("Creating session \n%o\n", { phone, surveyTeamMapId, language });

  const session = await prisma.waSession.create({
    data: {
      phone: phone,
      surveyTeamMapId: surveyTeamMapId,
      language: language,
      templateId: templateId,
      orgId: orgId,
      currentQuestionId: currentQuestionId,
      campaignParticipantId: campaignParticipantId
    },
    include: toBeIncludedWaSessionRelations
  });

  log.info("Session created \n%o\n", session);
  return session as unknown as WaSessionWithRelations; // overriding JSON type of responses
}

export async function updateSession(orgId: string, phone: string, data: any) {
  log.trace("Updating session \n%o\n", { phone, orgId, data });
  const session = await prisma.waSession.update({
    where: {
      phone_orgId: {
        phone: phone,
        orgId: orgId,
      }
    },
    include: toBeIncludedWaSessionRelations,
    data: data,
  });
  log.trace("Session updated \n%o\n", session)
  return session as unknown as WaSessionWithRelations; // overriding JSON type of responses
}

export async function sendNextQuestion(session: WaSessionWithRelations, response: any) {
  const { currentQuestionId, surveyTeamMap } = session;
  if (!currentQuestionId) {
    log.error("CurrentQuestionId is null")
    throw new Error("CurrentQuestionId is null")
  }
  const questions = surveyTeamMap.survey.questions as Array<Question>;
  const currentQuestion = questions.find(q => q.id === currentQuestionId)
  if (!currentQuestion) {
    throw new Error("CurrentQuestion Not Found")
  }
  const next = parseLogicAction(currentQuestion.type, currentQuestion.logic, response)
  log.info("Next action: %s", next);
  const currentIndex = questions.findIndex((q) => q.id === currentQuestionId);

  if (next === LogicAction.NextQ && questions.length > currentIndex + 1) {
    // Send next question
    const nextQuestion = questions[currentIndex + 1];
    await sendQuestion(nextQuestion, session);
  } else if (next === LogicAction.EndSurvey || questions.length <= currentIndex + 1) {
    // End Survey
    await saveResponses(session);
    if (shouldShowGoogleReview({ session })) {
      log.trace("Sending google review link to %s", session.phone)
      const googleReviewMessage = createCTAButtonMessage({
        to: session.phone,
        buttonText: "Review us on Google",
        url: session.surveyTeamMap.team.googleLink,
        body: "Thank you for your feedback!"
      })
      await sendMessage(session.orgId, googleReviewMessage);
    } else {
      const ThankYouMessage = createTextMessage(
        session.phone,
        "Thank You",
        "Have a nice day!"
      );
      await sendMessage(session.orgId, ThankYouMessage);
    }
    await deleteSession(session.orgId, session.phone);
  } else {
    // 'next' is a question id
    const nextQuestion = getQuestionByIdFromSession(session, next)
    if (!nextQuestion) {
      throw new Error("Question not found");
    }
    await sendQuestion(nextQuestion, session);
  }
}
const googleReviewSupportedTypes = [Q.Rating, Q.Smiley, Q.Opinion]

function shouldShowGoogleReview({ session }) {
  let showGoogleReview = false;
  session.surveyTeamMap.survey.questions.forEach((q: Question) => {
    if (googleReviewSupportedTypes.includes(q.type) && q.googleReview) {
      const questionResponse = session.responses.find((r) => r.questionId === q.id)
      switch (q.type) {
        case Q.Rating:
          if (Number.parseInt(questionResponse.response[questionResponse.type]) >= q.googleReview.minRating) {
            showGoogleReview = true;
          }
          break;
        case Q.Smiley:
          if (q.googleReview.reqOptions.includes(questionResponse.response[questionResponse.type])) {
            showGoogleReview = true;
          }
          break;
        case Q.Opinion:
          if (Number.parseInt(questionResponse.response[questionResponse.type]) >= q.googleReview.minOpinion) {
            showGoogleReview = true;
          }
          break;
      }
    }
  })
  return showGoogleReview;
}

async function updateCurrentQuestion(orgId: string, from: string, newQId: string) {
  log.trace("Updating current question for %o => %s\n", { from, orgId }, newQId);
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
export async function sendQuestion(question: Question, session: WaSessionWithRelations) {
  const message = await generateMessageDataFromQuestion(session, question);
  await updateCurrentQuestion(session.orgId, session.phone, question.id,);
  await sendMessage(session.orgId, message);
}
/**
 * Saves responses to the database in SurveyResponse table.
 * To be called after getting response to the last question.
 */
async function saveResponses(session: WaSessionWithRelations) {
  log.trace("Saving responses for %o", session)
  const questionResponses =
    session.responses as unknown as Array<QuestionResponse>;

  const surveyResponse: CreateResponseInput = {
    surveyTeamMapId: session.surveyTeamMapId,
    responses: questionResponses,
    language: session.language,
    platform: ResponsePlatform.WHATSAPP,
  };
  const res = await createResponse(surveyResponse);
  log.info("Responses saved \n%o\n", surveyResponse);
  if (session.campaignParticipantId) {
    await updateCampaignParticipant(session.campaignParticipantId, {
      status: CampaignParticipantStatus.COMPLETED,
      responseId: res.id
    })
  }
}

export async function sendTextMessage(
  session: WaSessionWithRelations,
  title: string,
  description: string = ""
) {
  const messageData = createTextMessage(session.phone, title, description);
  await sendMessage(session.orgId, messageData);
}
interface sendSurveyToParticipantParams {
  campaignParticipantId: string;
  phone: string;
  surveyTeamMapId: string;
  dbTemplate: WaTemplateWithTypes
}
export async function sendSurveyToParticipant({
  campaignParticipantId,
  phone,
  surveyTeamMapId,
  dbTemplate
}: sendSurveyToParticipantParams) {
  try {
    log.trace("Sending survey to participant %s", phone);
    let session = await createSession({
      phone,
      surveyTeamMapId,
      orgId: dbTemplate.orgId,
      templateId: dbTemplate.id,
      campaignParticipantId
    })
    log.trace("Session created %o", session)
    const { name, language } = dbTemplate.data;
    const templateQuery = {
      name,
      language: {
        code: language
      }
    }
    const consentTemplateMessage = createTemplateMessage(phone, templateQuery);

    // TODO: send error if sending template failed
    return await sendMessage(session.orgId, consentTemplateMessage);
  } catch (e) {
    log.error(e)
    return false
  }
}