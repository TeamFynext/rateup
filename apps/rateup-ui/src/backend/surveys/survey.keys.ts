/**
 * Query keys for the survey family (surveys, questions, responses, themes, variables).
 *
 * Every literal is byte-identical to the inline key it replaced, so the cache layout and all
 * existing partial-match invalidations behave exactly as before.
 *
 * The roots are deliberately NOT unified here. `["survey", id]` (one survey) and
 * `["surveys"]` (the listing) are separate top-level roots that grew independently, as are
 * `["questions", …]`, `["responses"]` and `["surveyVariables", …]`. Nesting them under a
 * single `["survey"]` root would change the cache layout and every invalidation that
 * depends on it — a deliberate follow-up, not something to smuggle into this pass.
 */

/** Opaque state (filters, time ranges) that only ever gets serialised into a key. */
type KeyPart = unknown;

export const surveyKeys = {
  /** Bare `["survey"]` root — one caller invalidates this to sweep every single-survey query. */
  root: () => ["survey"] as const,
  detail: (surveyId: KeyPart) => ["survey", surveyId] as const,

  /** The survey listing. Separate root from `detail`. */
  all: () => ["surveys"] as const,
  byTeam: (teamId: KeyPart) => ["surveys", teamId] as const,
  summary: () => ["surveysSummary"] as const,
  landing: () => ["surveysLanding"] as const,
  withQuestions: () => ["surveyswithquestions"] as const,
  whatsapp: () => ["whatsappsurveys"] as const,

  questions: (surveyId: KeyPart) => ["questions", surveyId] as const,
  variables: (surveyId: KeyPart) => ["surveyVariables", surveyId] as const,
  theme: (surveyThemeId: KeyPart) => ["surveyTheme", surveyThemeId] as const,
  templates: (surveyType: KeyPart) => ["survey-templates", surveyType] as const,
  languages: (teamId: KeyPart) => ["surveyLanguages", teamId] as const,
  stats: (surveyTeamMapId: KeyPart) => ["surveyStats", surveyTeamMapId] as const,
  happyResponseAnalytics: (surveyId: KeyPart, timeFilter: KeyPart) =>
    ["survey-happy-response-analytics", surveyId, timeFilter] as const,
} as const;

export const responseKeys = {
  all: () => ["responses"] as const,
  bySurveyTeamMap: (surveyTeamMapId: KeyPart) => ["responses", surveyTeamMapId] as const,
  bySurvey: (surveyId: KeyPart, filter: KeyPart) =>
    ["response", "survey", surveyId, filter] as const,
  count: (surveyId: KeyPart) => ["responseCount", surveyId] as const,
  comparison: (surveyId: KeyPart) => ["responseComparison", surveyId] as const,
} as const;
