import axios from "axios";
import { WaSendMessageBody } from "../../types/whatsapp.types";
import prisma from "../../utils/prisma";
import {
  getQuestionById,
  getQuestionsBySurveyId,
} from "../question/question.service";
import { ResponsePlatform, Survey, WaSession } from "@prisma/client";
import {
  createTemplateMessage,
  createTextMessage,
  generateMessageDataFromQuestion,
} from "./wasurvey.utils";
import { getNextAction } from "../question/question.utils";
import { LogicAction } from "../../types/enums";
import { createResponse } from "../response/response.service";
import { log } from "../../utils/logger";

const config = {
  headers: {
    Authorization: "Bearer " + process.env.WA_ACCESS_TOKEN,
  },
};

export async function sendMessage(messageData: WaSendMessageBody) {
  const phone_number_id = process.env.WA_PHONE_ID;

  log.info(`sending message to %s \n%o`, messageData.to, messageData);
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v16.0/${phone_number_id}/messages`,
      messageData,
      config
    );
    console.log(res.data, res.statusText)
  } catch (e: any) {
    log.error("Error sending message")
    console.log(e.response);
  }
}

export async function getSession(phone: string) {
  const session = await prisma.waSession.findUnique({
    where: {
      phone: phone,
    },
  });
  if (!session) {
    throw new Error("Session not found");
  }
  return session;
}
export async function deleteSession(phone: string) {
  log.info("Deleting previous sessions if any", { phone });
  try {
    await prisma.waSession.delete({
      where: {
        phone: phone,
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

export async function getFirstQuestion(surveyId: string) {
  const questions = await getQuestionsBySurveyId(surveyId);
  console.log(questions)
  return questions[0].id;
}

export async function createSession(
  phone: string,
  surveyId: string,
  language: string = ""
) {
  log.info("Creating session \n%o\n", { phone, surveyId, language });

  const firstQId = await getFirstQuestion(surveyId);
  const session = await prisma.waSession.create({
    data: {
      phone: phone,
      surveyId: surveyId,
      currentQuestionId: firstQId,
      language: language,
    },
  });

  log.info("Session created \n%o\n", session);
  return session;
}

export async function updateSession(phone: string, data: any) {
  log.info("Updating session \n%o\n", { phone, data });
  const session = await prisma.waSession.update({
    where: {
      phone: phone,
    },
    data: data,
  });
  return session;
}

export async function sendNextQuestion(session: WaSession, response: any) {
  const { currentQuestionId, surveyId } = session;
  const questions = await getQuestionsBySurveyId(surveyId);

  // TODO
  const next = getNextAction(questions, currentQuestionId!, response);
  log.info("Next action: %s", next);

  if (next === LogicAction.NextQ) {
    // Send next question
    const currentIndex = questions.findIndex((q) => q.id === currentQuestionId);
    const nextQuestion = questions[currentIndex + 1];
    await sendQuestion(nextQuestion, session);
  } else if (next === LogicAction.EndSurvey) {
    // End Survey
    const ThankYouMessage = createTextMessage(
      session.phone,
      "Thank You",
      "Have a nice day!"
    );
    await saveResponses(session.phone);
    await sendMessage(ThankYouMessage);
  } else {
    // 'next' is a question id
    const nextQuestion = await getQuestionById(surveyId, next);
    if (!nextQuestion) {
      throw new Error("Question not found");
    }
    await sendQuestion(nextQuestion, session);
  }
}

async function updateCurrentQuestion(newQId: string, from: string) {
  log.info("Updating current question for %s => %s\n", from, newQId);
  await prisma.waSession.update({
    where: {
      phone: from,
    },
    data: {
      currentQuestionId: newQId,
    },
  });
}
export async function sendQuestion(question: Question, session: WaSession) {
  const message = await generateMessageDataFromQuestion(session, question);
  await updateCurrentQuestion(question.id, session.phone);
  await sendMessage(message);
}
async function saveResponses(phone: string) {
  // fetching latest session
  const session = await getSession(phone);
  if (!session) {
    throw new Error("No session found");
  }
  const questionResponses =
    session.responses as unknown as Array<QuestionResponse>;

  const surveyResponse = {
    surveyId: session.surveyId,
    responses: questionResponses,
    phone,
    // TODO lang
    language: session.language,
    platform: ResponsePlatform.WHATSAPP,
  };
  await createResponse(surveyResponse);
  log.info("Responses saved \n%o\n", surveyResponse);
}

export async function updateResponses(
  phone: string,
  responses: Array<QuestionResponse>
) {
  await prisma.waSession.update({
    where: {
      phone: phone,
    },
    data: {
      responses: responses as any,
    },
  });
}

export async function sendTextMessage(
  to: string,
  title: string,
  description: string = ""
) {
  const messageData = createTextMessage(to, title, description);
  await sendMessage(messageData);
}

// TODO: move to .env & upgrade to v17.0?
const WA_API_VERSION = "v16.0";
const manager_config = {
  headers: {
    Authorization: "Bearer " + process.env.WA_MARKETING_API_TOKEN,
  },
};
export async function getTemplates() {
  try {
    const wa_business_id = process.env.WA_BUSINESS_ID;
  const res = await axios.get(
    `https://graph.facebook.com/${WA_API_VERSION}/${wa_business_id}/message_templates`,
    manager_config
  );
  console.log(res)
  return res.data
  } catch (e: any) {
    log.error("Error getting templates")
    console.log(e.response);
  }
  
}

export async function getSurveyConsentTemplate() {
  const templates = await getTemplates();
  const consentTemplate = templates.data.find((t: any) => t.name === "survey_consent");
  return consentTemplate;
}

const templateQuery = {
  name: "survey_consent",
  language: {
    code: "en"
  }
}

/**
 * Creates a session with currentQuestionId as null & sends the template with name "survey_consent"
 * @param phone 
 * @param survey 
 */
export async function sendSurveyToRespondent(phone: string, survey: Survey ) {
   await prisma.waSession.create({
    data: {
      phone,
      surveyId: survey.id,
      language: survey.languages[0],
    }
  })
  const consentTemplateMessage = createTemplateMessage(phone, templateQuery);
  await sendMessage(consentTemplateMessage);
}