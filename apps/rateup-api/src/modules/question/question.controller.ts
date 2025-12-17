import { FastifyReply, FastifyRequest } from "fastify";
import {
  CreateQuestionInput,
  QuestionRouteParams,
  QuestionsRouteParams,
  UpdateQuestionInput,
  UpdateQuestionsOrderInput,
} from "./question.schema.js";
import {
  createQuestion,
  deleteQuestionById,
  getAllowedEmailsFromFile,
  getQuestionById,
  getQuestionsBySurveyId,
  reorderQuestions,
  updateLogicJump,
  updateQuestion,
  updateQuestionsOnSurvey,
} from "./question.service.js";
import { hasAccessToSurvey } from "../../utils/auth.js";
import { getSurveyById } from "../survey/survey.service.js";

export async function createQuestionHandler(
  request: FastifyRequest<{
    Body: CreateQuestionInput;
    Params: QuestionsRouteParams;
  }>,
  reply: FastifyReply,
) {
  const body = request.body;
  try {
    const surveyId = request.params.surveyId;
    const question = await createQuestion(surveyId, body);
    reply.code(201).send(question);
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}

export async function getQuestionByIdHandler(
  request: FastifyRequest<{
    Params: QuestionRouteParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    const question = await getQuestionById(surveyId, request.params.id);

    if (!question) {
      reply.code(404);
    } else {
      reply.send(question);
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}

export async function getQuestionsBySurveyIdHandler(
  request: FastifyRequest<{
    Params: QuestionsRouteParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const questions = await getQuestionsBySurveyId(request.params.surveyId);
    reply.send(questions);
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}

export async function deleteQuestionByIdHandler(
  request: FastifyRequest<{
    Params: QuestionRouteParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    const question = await getQuestionById(surveyId, request.params.id);

    if (!question) {
      reply.code(404);
    } else {
      await deleteQuestionById(surveyId, request.params.id);
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}

export async function reorderQuestionsHandler(
  request: FastifyRequest<{
    Body: UpdateQuestionsOrderInput;
    Params: QuestionsRouteParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    await reorderQuestions(surveyId, request.body);
    reply.code(200).send();
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}

export async function updateQuestionHandler(
  request: FastifyRequest<{
    Body: UpdateQuestionInput;
    Params: QuestionRouteParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    const id = request.params.id;
    // check if question exists
    const question = await getQuestionById(surveyId, id);
    if (!question) {
      reply.code(404);
    } else {
      // update question
      await updateQuestion(surveyId, id, request.body);
      reply.code(200).send();
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}

export async function replaceQuestionsHandler(
  request: FastifyRequest<{
    Body: { questions: Array<Question>; screenId?: string };
    Params: QuestionsRouteParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    const { questions, screenId } = request.body;
    await updateQuestionsOnSurvey(surveyId, questions);
    screenId && (await updateLogicJump(screenId, surveyId));
    reply.code(200).send();
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}

export async function importAllowedEmailIdsHandler(
  request: FastifyRequest<{ Params: QuestionRouteParams }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    const id = request.params.id;
    const question = await getQuestionById(surveyId, id);
    const languages = (await getSurveyById(surveyId)).languages;
    if (!question) {
      reply.code(404).send({ error: "Question not found" });
    } else {
      const file = await request.file();
      const allowedEmails = (await getAllowedEmailsFromFile(
        file,
      )) as Array<string>;
      if (allowedEmails) {
        for (const lang of languages) {
          const existingEmails = question.features?.[lang]?.allowedEmails || [];
          const remainingEmails = allowedEmails.filter(
            (email) => !existingEmails?.includes(email),
          );
          question.features = {
            ...question?.features,
            [lang]: {
              ...question?.features?.[lang],
              isRestricted:
                existingEmails.length || remainingEmails.length ? true : false,
              allowedEmails: [...existingEmails, ...remainingEmails],
            },
          };
        }
        await updateQuestion(
          surveyId,
          id,
          question as unknown as UpdateQuestionInput,
        );
        reply.code(200).send();
      } else {
        reply.code(500).send({ error: "Something went wrong" });
      }
    }
  } catch (e) {
    console.error(e);
    reply.code(500).send({ error: e?.message || "Something went wrong" });
  }
}
