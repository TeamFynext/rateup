import { PageType, SurveyType } from "../../types/enums.js";
import { neutralizePlainText, sanitizeRichText } from "../html/sanitizeRichText.js";

/**
 * Write-time sanitising of the survey fields rateup.app renders as HTML (FE-1).
 *
 * - Web surveys: every question's `title` (all languages) plus the page questions'
 *   `titleText` / `subtitleText` are tiptap rich text → `sanitizeRichText`.
 * - WhatsApp / WhatsApp Flow surveys: the same fields are plain text that goes out in WhatsApp
 *   messages, so escaping `&` or `<3` would show up on the customer's phone. They only get
 *   `neutralizePlainText`, which escapes nothing but a `<` that would open a tag.
 * - `Custom` page questions are left alone: their title is a whole custom HTML page, rendered
 *   through DOMPurify's default (much wider) profile by `CustomHTML.tsx`; the rich-text
 *   allow-list here would strip legitimate layout from it.
 *
 * Plain-text fields (`description`, `label`, choices, button texts) are never touched.
 */

type Sanitizer = <T>(value: T) => T;

function sanitizerFor(surveyType: string | null | undefined): Sanitizer {
  return surveyType === SurveyType.WhatsApp || surveyType === SurveyType.WaFlow
    ? neutralizePlainText
    : sanitizeRichText;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeQuestion<Q>(question: Q, clean: Sanitizer): Q {
  if (!isRecord(question)) return question;
  if (question["type"] === PageType.Custom) return question;

  const next: Record<string, unknown> = { ...question };
  const title = question["title"];
  if (isRecord(title)) {
    next["title"] = Object.fromEntries(
      Object.entries(title).map(([language, value]) => [language, clean(value)]),
    );
  }
  for (const key of ["titleText", "subtitleText"] as const) {
    if (typeof question[key] === "string") next[key] = clean(question[key]);
  }
  return next as Q;
}

/**
 * Sanitise a survey's questions array before it is written. Returns new objects; the input is
 * not mutated. An unknown survey type is treated as a web survey (the stricter rule).
 */
export function sanitizeSurveyQuestions<Q>(
  questions: readonly Q[],
  surveyType: string | null | undefined,
): Q[];
export function sanitizeSurveyQuestions<T>(questions: T, surveyType: string | null | undefined): T;
export function sanitizeSurveyQuestions(questions: unknown, surveyType: string | null | undefined) {
  // Anything that is not an array (a partial row, a missing column) is returned as it was.
  if (!Array.isArray(questions)) return questions;
  const clean = sanitizerFor(surveyType);
  return questions.map((question: unknown) => sanitizeQuestion(question, clean));
}

/**
 * Sanitise the page titles inside a survey theme JSON (`WebSurveyTheme.theme`,
 * `Survey.webSurveyPagesTheme`): `<page>.title.title` and `<page>.subtitle.subtitle`.
 * Everything else (styles, colours, images) is returned as it was.
 */
export function sanitizeSurveyThemeJson<T>(theme: T): T {
  if (!isRecord(theme)) return theme;
  const next: Record<string, unknown> = {};
  for (const [pageKey, page] of Object.entries(theme)) {
    if (!isRecord(page)) {
      next[pageKey] = page;
      continue;
    }
    const pageNext: Record<string, unknown> = { ...page };
    for (const key of ["title", "subtitle"] as const) {
      const block = page[key];
      if (isRecord(block) && typeof block[key] === "string") {
        pageNext[key] = { ...block, [key]: sanitizeRichText(block[key]) };
      }
    }
    next[pageKey] = pageNext;
  }
  return next as T;
}
