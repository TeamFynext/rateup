import { WaSession, ResponsePlatform, Survey } from "@prisma/client";
import { CampaignParticipantStatus, LogicAction } from "../../../types/enums";
import { WaSendMessageBody } from "../../../types/whatsapp.types";
import { log } from "../../../utils/logger";
import prisma from "../../../utils/prisma";
import { getQuestionsBySurveyId, getQuestionById } from "../../question/question.service";
import { parseLogicAction } from "../../question/question.utils";
import { createResponse } from "../../response/response.service";
import { getWaSettings } from "../settings/wa_settings.service";
import { callWhatsappApi } from "../wa_axios";
import { createTextMessage, generateMessageDataFromQuestion, createTemplateMessage } from "./wasurvey.utils";
import { updateCampaignParticipant } from "../../campaign/campaignParticipants/campaignParticipants.service";



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
  });
  if (!session) {
    throw new Error("Session not found");
  }
  return session;
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

export async function createSession(
  phone: string,
  surveyId: string,
  orgId: string,
  templateId?: string,
  language: string = "",
  currentQuestionId?: string,
  campaignParticipantId?: string
) {
  log.info("Creating session \n%o\n", { phone, surveyId, language });

  const session = await prisma.waSession.create({
    data: {
      phone: phone,
      surveyId: surveyId,
      language: language,
      templateId: templateId,
      orgId: orgId,
      currentQuestionId: currentQuestionId,
      campaignParticipantId: campaignParticipantId
    },
  });

  log.info("Session created \n%o\n", session);
  return session;
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
    data: data,
  });
  log.trace("Session updated \n%o\n", session)
  return session;
}

export async function sendNextQuestion(session: WaSession, response: any) {
  const { currentQuestionId, surveyId } = session;
  if (!currentQuestionId) {
    log.error("CurrentQuestionId is null")
    throw new Error("CurrentQuestionId is null")
  }
  const questions = await getQuestionsBySurveyId(surveyId);
  const currentQuestion = questions.find(q => q.id === currentQuestionId)
  if (!currentQuestion) {
    throw new Error("CurrentQuestion Not Found")
  }
  // TODO
  const next = parseLogicAction(currentQuestion.type, currentQuestion.logic, response)
  log.info("Next action: %s", next);
  const currentIndex = questions.findIndex((q) => q.id === currentQuestionId);

  if (next === LogicAction.NextQ && questions.length > currentIndex + 1) {
    // Send next question
    const nextQuestion = questions[currentIndex + 1];
    await sendQuestion(nextQuestion, session);
  } else if (next === LogicAction.EndSurvey || questions.length <= currentIndex + 1) {
    // End Survey
    const ThankYouMessage = createTextMessage(
      session.phone,
      "Thank You",
      "Have a nice day!"
    );
    await saveResponses(session);
    await sendMessage(session.orgId, ThankYouMessage);
    await deleteSession(session.orgId, session.phone);
  } else {
    // 'next' is a question id
    const nextQuestion = await getQuestionById(surveyId, next);
    if (!nextQuestion) {
      throw new Error("Question not found");
    }
    await sendQuestion(nextQuestion, session);
  }
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
export async function sendQuestion(question: Question, session: WaSession) {
  const message = await generateMessageDataFromQuestion(session, question);
  await updateCurrentQuestion(session.orgId, session.phone, question.id,);
  await sendMessage(session.orgId, message);
}
async function saveResponses(session: WaSession) {
  log.trace("Saving responses for %o", session)
  const questionResponses =
    session.responses as unknown as Array<QuestionResponse>;

  const surveyResponse = {
    surveyId: session.surveyId,
    responses: questionResponses,
    language: session.language,
    platform: ResponsePlatform.WHATSAPP,
  };
  const res = await createResponse(surveyResponse);
  log.info("Responses saved \n%o\n", surveyResponse);
  await updateCampaignParticipant(session.campaignParticipantId, {
    status: CampaignParticipantStatus.COMPLETED,
    responseId: res.id
  })
}

export async function updateResponses(
  orgId: string,
  phone: string,
  responses: Array<QuestionResponse>
) {
  return await prisma.waSession.update({
    where: {
      phone_orgId: {
        phone,
        orgId: orgId,
      }
    },
    data: {
      responses: responses as any,
    },
  });
}

export async function sendTextMessage(
  session: WaSession,
  title: string,
  description: string = ""
) {
  const messageData = createTextMessage(session.phone, title, description);
  await sendMessage(session.orgId, messageData);
}

/**
 * Creates a session with currentQuestionId as null & sends the template with name "survey_consent"
 * @param phone 
 * @param survey 
 */
export async function sendSurveyToWaCustomer(phone: string, survey: Survey, dbTemplate: WaTemplateWithTypes) {
  log.trace("Sending survey to waCustomer %s", phone);
  // TODO: implement language selection
  const session = await createSession(phone, survey.id, dbTemplate.orgId, dbTemplate.id, survey.languages[0])
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
  await sendMessage(session.orgId, consentTemplateMessage);
}

export async function sendSurveyToParticipant(campaignParticipantId: string, phone: string, survey: Survey, dbTemplate: WaTemplateWithTypes) {
  try {
    log.trace("Sending survey to participant %s", phone);
    const session = await createSession(phone, survey.id, dbTemplate.orgId, dbTemplate.id, survey.languages[0], undefined, campaignParticipantId)
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