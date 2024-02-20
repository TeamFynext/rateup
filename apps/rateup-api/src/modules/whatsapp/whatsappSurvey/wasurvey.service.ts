import { ResponsePlatform, SurveyResponse } from "@prisma/client";
import {
  CampaignParticipantStatus,
  LogicAction,
  QuestionType,
  TestimonialFeatureQuestions,
} from "../../../types/enums";
import {
  WaMessageBody,
  WaSendMessageBody,
} from "../../../types/whatsapp.types";
import { log } from "../../../utils/logger";
import prisma from "../../../utils/prisma";
import { getQuestionsBySurveyId } from "../../question/question.service";
import { parseLogicAction } from "../../question/question.utils";
import { createResponse } from "../../response/response.service";
import { getWaSettings } from "../settings/wa_settings.service";
import { callWhatsappApi } from "../wa_axios";
import {
  createTextMessage,
  generateMessageDataFromQuestion,
  createTemplateMessage,
  getQuestionByIdFromSession,
  createCTAButtonMessage,
  parseMessage,
  ratingEmoji,
  createNativeListMessage,
  getMessageObject,
  downloadAndUpload,
} from "./wasurvey.utils";
import { updateCampaignParticipant } from "../../campaign/campaignParticipants/campaignParticipants.service";
import { CreateResponseInput } from "../../response/response.schema";
import { QuestionType as Q } from "../../../types/enums";
import {
  updateCompletedSurvey,
  updateVisitedSurvey,
} from "../../survey/survey.service";
import { fetchLocationFromIp } from "../../../utils/location";

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
  messageData: WaSendMessageBody,
) {
  const waSettings = await getWaSettings(orgId);

  log.trace(`sending message to %s \n%o`, messageData.to, messageData);
  try {
    const res = await callWhatsappApi(
      `/${waSettings.phoneId}/messages`,
      "POST",
      waSettings.accessToken,
      messageData,
    );
    log.trace(`sent successfully %o %o `, res.data, res.statusText);
    return true;
  } catch (e: any) {
    log.error("Error sending message");
    console.log(e.response);
    return false;
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
    },
    include: toBeIncludedWaSessionRelations,
  });

  log.info("Session created");
  log.trace("Session created \n%o\n", session);
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
/**
 * Saves responses to the database in SurveyResponse table.
 * To be called after getting response to the last question.
 *
 * -> updates completedSurvey count
 */
export async function saveResponses(session: WaSessionWithRelations) {
  log.trace("Saving responses for %o", session);
  const questionResponses =
    session.responses as unknown as Array<QuestionResponse>;

  const surveyResponse: CreateResponseInput = {
    surveyTeamMapId: session.surveyTeamMapId,
    responses: questionResponses,
    language: session.language,
    platform: ResponsePlatform.WHATSAPP,
    location: await fetchLocationFromIp(session.ip),
  };
  const res = await createResponse(surveyResponse);
  log.info("Responses saved \n%o\n", surveyResponse);

  // TODO move out of this function
  updateCompletedSurvey(session.surveyTeamMapId).catch((e) => log.error(e));
  if (session.campaignParticipantId) {
    await updateCampaignParticipant(session.campaignParticipantId, {
      status: CampaignParticipantStatus.COMPLETED,
      responseId: res.id,
    });
  }
  return res;
}

export async function sendTextMessage(
  session: WaSessionWithRelations,
  title: string,
  description: string = "",
) {
  const messageData = createTextMessage(session.phone, title, description);
  await sendMessage(session.orgId, messageData);
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
  if (features?.hasJobTitle && !response.jobTitle) {
    const description = "\nPlease share your job title";
    const nextSubQuestion = createTextMessage(to, null, description);
    await sendMessage(session.orgId, nextSubQuestion);
  }
  if (!response.testimonial) {
    const description = "\nPlease share your experience briefly";
    const nextSubQuestion = createTextMessage(to, null, description);
    await sendMessage(session.orgId, nextSubQuestion);
  }
  if (features?.hasRating && !response.rating) {
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
  if (features?.hasPhoto && !response.photo) {
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
  } else if (features?.hasJobTitle && !response.jobTitle) {
    //assume its job title
    response.jobTitle = message;
  } else if (!response.testimonial) {
    //assume its testimonial
    response.testimonial = message;
  } else if (features?.hasRating && !response.rating) {
    //assume its rating
    const rating = Number.parseInt(
      reply.entry[0].changes[0].value.messages[0].interactive.list_reply.id,
    );
    if (rating < 1 || rating > 5) isValid = false;
    else response.rating = rating;
  } else if (features?.hasPhoto && !response.photo) {
    //assume its photo
    const message = getMessageObject(reply);
    const uniqueFilename = await downloadAndUpload(session, message.image.id);
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
