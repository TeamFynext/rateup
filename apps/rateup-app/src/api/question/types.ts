/**
 * A survey question as returned by `GET /api/question/:surveyId`.
 *
 * Localized fields are keyed by language, and the key varies by survey vintage
 * — web forms use full names ("English") while flows use codes ("en") — so
 * callers index them directly rather than through a fixed union.
 */
export type SurveyQuestion = {
  id: string;
  title?: Record<string, string>;
  description?: Record<string, string>;
  /** Only present on whatsapp-flow surveys. */
  label?: Record<string, string>;
  type?: string;
  required?: boolean;
};
