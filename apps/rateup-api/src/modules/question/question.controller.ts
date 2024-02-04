import { FastifyReply, FastifyRequest } from "fastify";
import {
  CreateQuestionInput,
  QuestionRouteParams,
  QuestionsRouteParams,
  UpdateQuestionInput,
  UpdateQuestionsOrderInput,
} from "./question.schema";
import {
  createQuestion,
  deleteQuestionById,
  getQuestionById,
  getQuestionsBySurveyId,
  reorderQuestions,
  updateQuestion,
  updateQuestionsOnSurvey,
} from "./question.service";
import { hasAccessToSurvey } from "../../utils/auth";

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
    Body: Array<Question>;
    Params: QuestionsRouteParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    const questions = request.body;
    await updateQuestionsOnSurvey(surveyId, questions);
    reply.code(200).send();
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}
