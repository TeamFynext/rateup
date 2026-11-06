/**
 * Survey rows → wire shapes. Allowlisted field by field, like loyalty/presenters.ts, so a
 * new column on Survey or SurveyResponse never becomes part of the public contract by
 * accident.
 */

import { toWirePhone } from "../phone.js";

/** The first language's text of a localised field. */
const firstText = (value: Record<string, string> | undefined | null): string | null =>
  (value && Object.values(value).find((v) => typeof v === "string" && v.length > 0)) || null;

export function presentSurvey(row: { id: string; title: string; type: string; createdAt: Date }) {
  return { id: row.id, title: row.title, type: row.type, createdAt: row.createdAt.toISOString() };
}

export function presentSurveyDetail(row: {
  id: string;
  title: string;
  type: string;
  createdAt: Date;
  questions: unknown[];
}) {
  const questions = row.questions as unknown as Question[];
  return {
    ...presentSurvey(row),
    questions: questions.map((q) => ({
      id: q.id,
      type: String(q.type),
      required: Boolean(q.required),
      title: q.title ?? {},
    })),
  };
}

export function questionTitles(questions: unknown[]): Map<string, string | null> {
  return new Map(
    (questions as unknown as Question[]).map((q) => [
      q.id,
      firstText(q.title) ?? firstText(q.description) ?? firstText(q.label),
    ]),
  );
}

export function presentSurveyResponse(
  row: {
    id: string;
    createdAt: Date;
    language: string;
    tag: string | null;
    responses: unknown[];
    encryptedResponses: string | null;
    surveyTeamMap: { teamId: string };
    Contact: { phone: string | null } | null;
  },
  titles: Map<string, string | null>,
) {
  const encrypted = Boolean(row.encryptedResponses);
  const answers = encrypted ? [] : (row.responses as unknown as QuestionResponse[]);
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    teamId: row.surveyTeamMap.teamId,
    language: row.language,
    tag: row.tag || null,
    phone: toWirePhone(row.Contact?.phone),
    encrypted,
    encryptedAnswers: row.encryptedResponses ?? null,
    answers: answers.map(({ questionId, type, response }) => ({
      questionId,
      type: String(type),
      title: titles.get(questionId) ?? null,
      // `response` is keyed by the question type, holding exactly one entry.
      value: Object.values(response ?? {})[0] ?? null,
    })),
  };
}
