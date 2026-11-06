import { WaFlowLayoutType, WaQuestions } from "../../../types/enums.js";

/**
 * Ready-made flows the create-flow wizard offers — today, feedback surveys, one per kind of
 * business, for flows created with the LOYALTY_FEEDBACK category. `createFlowHandler` turns
 * the chosen one into a real WaFlow/Survey pair, so everything here has to be the v2 flow
 * dialect the editor writes and the reply handlers read:
 *
 * - every interactive element has `id === name`. v2 answers come back keyed by element
 *   name (`generateQuestionResponsesFromFlowResponse`), and `shouldShowGoogleReviewV2`
 *   looks the element up by `id`, so the two have to agree.
 * - rating choices are ids "1".."5". The Google-review gate does `parseInt(answer)` and
 *   compares it with `googleReview.minRating`, so the id *is* the star count.
 * - the Footer's `complete` payload is rewritten with the real form bindings at publish
 *   time (`syncLocalFlowToWhatsapp`), and `id`/`metaType`/`googleReview` are stripped
 *   before Meta sees the JSON — which is why the happy threshold can change without a
 *   re-publish.
 */

export const FEEDBACK_DRAFT_KEYS = ["restaurant", "retail", "salon", "gym", "generic"] as const;
export type FeedbackDraftKey = (typeof FEEDBACK_DRAFT_KEYS)[number];

export function isFeedbackDraftKey(value: unknown): value is FeedbackDraftKey {
  return typeof value === "string" && (FEEDBACK_DRAFT_KEYS as readonly string[]).includes(value);
}

export type FeedbackQuestionKind = "rating" | "text";

export interface FeedbackDraftQuestion {
  /** Element id and name in the flow; `^[a-z_]+$` because Meta requires an identifier. */
  key: string;
  title: string;
  kind: FeedbackQuestionKind;
  /** The one rating the Google-review decision is made on. Exactly one per draft. */
  overall?: boolean;
}

export interface FeedbackDraftDefinition {
  key: FeedbackDraftKey;
  label: string;
  description: string;
  /** Opening line above the questions. */
  intro: string;
  questions: FeedbackDraftQuestion[];
}

/** The shape the UI's draft picker consumes: the definition plus a renderable flow JSON. */
export interface FeedbackDraft {
  key: FeedbackDraftKey;
  label: string;
  description: string;
  questions: Array<{ title: string; kind: FeedbackQuestionKind }>;
  previewJson: WaFlowJson;
}

const OVERALL: FeedbackDraftQuestion = {
  key: "overall_rating",
  title: "Overall experience",
  kind: "rating",
  overall: true,
};
const COMMENTS: FeedbackDraftQuestion = {
  key: "comments",
  title: "Anything we could do better?",
  kind: "text",
};

export const FEEDBACK_DRAFTS: readonly FeedbackDraftDefinition[] = [
  {
    key: "restaurant",
    label: "Restaurant & café",
    description: "Overall experience, food quality and service.",
    intro: "Thanks for visiting! How did we do today?",
    questions: [
      OVERALL,
      { key: "food_quality", title: "Food quality", kind: "rating" },
      { key: "service", title: "Service", kind: "rating" },
      COMMENTS,
    ],
  },
  {
    key: "retail",
    label: "Retail store",
    description: "Overall experience, product range and staff helpfulness.",
    intro: "Thanks for shopping with us! How was your visit?",
    questions: [
      OVERALL,
      { key: "product_range", title: "Product range", kind: "rating" },
      { key: "staff_helpfulness", title: "Staff helpfulness", kind: "rating" },
      COMMENTS,
    ],
  },
  {
    key: "salon",
    label: "Salon & spa",
    description: "Overall experience, service quality and cleanliness.",
    intro: "Thanks for coming in! How was your appointment?",
    questions: [
      OVERALL,
      { key: "service_quality", title: "Service quality", kind: "rating" },
      { key: "cleanliness", title: "Cleanliness & comfort", kind: "rating" },
      COMMENTS,
    ],
  },
  {
    key: "gym",
    label: "Gym & fitness",
    description: "Overall experience, facilities and trainers.",
    intro: "Thanks for training with us! How was your session?",
    questions: [
      OVERALL,
      { key: "facilities", title: "Equipment & facilities", kind: "rating" },
      { key: "trainers", title: "Trainers & staff", kind: "rating" },
      COMMENTS,
    ],
  },
  {
    key: "generic",
    label: "Any business",
    description: "Overall experience, likelihood to recommend, and a comment.",
    intro: "Thanks for your visit! How did we do?",
    questions: [
      OVERALL,
      { key: "recommend", title: "How likely are you to recommend us?", kind: "rating" },
      COMMENTS,
    ],
  },
];

export function getFeedbackDraft(key: string): FeedbackDraftDefinition | undefined {
  return FEEDBACK_DRAFTS.find((draft) => draft.key === key);
}

/**
 * The draft to preselect, read off the programme's onboarding preset. The loyalty presets
 * and the feedback drafts are different lists (`cafe` is the food-service preset), so
 * this is a mapping rather than a shared key.
 */
export function suggestFeedbackDraftKey(presetKey: string | null | undefined): FeedbackDraftKey {
  switch (presetKey) {
    case "cafe":
    case "restaurant":
      return "restaurant";
    case "retail":
      return "retail";
    case "salon":
      return "salon";
    case "gym":
      return "gym";
    default:
      return "generic";
  }
}

export const FEEDBACK_FLOW_SCREEN_ID = "FEEDBACK_SCREEN";
export const DEFAULT_HAPPY_MIN_RATING = 4;

// Same five choices the editor writes for a Rating element (RatingScale in the UI); the
// ids double as the numeric score.
const RATING_CHOICES: readonly WaFlowFormChoice[] = [
  { id: "1", title: "⭐️", description: "VeryPoor" },
  { id: "2", title: "⭐️⭐️", description: "Poor" },
  { id: "3", title: "⭐️⭐️⭐️", description: "Average" },
  { id: "4", title: "⭐️⭐️⭐️⭐️", description: "Good" },
  { id: "5", title: "⭐️⭐️⭐️⭐️⭐️", description: "Excellent" },
];

function ratingElement(question: FeedbackDraftQuestion, happyMinRating: number): WaFlowForm {
  return {
    id: question.key,
    name: question.key,
    type: WaQuestions.Dropdown,
    metaType: WaQuestions.Rating,
    label: question.title,
    required: true,
    visible: true,
    ...(question.overall ? { googleReview: { minRating: happyMinRating } } : {}),
    "data-source": RATING_CHOICES.map((choice) => ({ ...choice })),
  };
}

function textElement(question: FeedbackDraftQuestion): WaFlowForm {
  return {
    id: question.key,
    name: question.key,
    type: WaQuestions.TextArea,
    metaType: WaQuestions.TextArea,
    label: question.title,
    required: false,
    visible: true,
    "max-length": 600,
  };
}

export function buildFeedbackFlowJson(
  draft: FeedbackDraftDefinition,
  options: { happyMinRating?: number } = {},
): WaFlowJson {
  const happyMinRating = options.happyMinRating ?? DEFAULT_HAPPY_MIN_RATING;
  const children: WaFlowForm[] = [
    {
      id: "intro",
      type: WaQuestions.TextSubheading,
      metaType: WaQuestions.TextSubheading,
      text: draft.intro,
    },
    ...draft.questions.map((question) =>
      question.kind === "rating" ? ratingElement(question, happyMinRating) : textElement(question),
    ),
    {
      id: "footer_feedback",
      type: WaQuestions.Footer,
      metaType: WaQuestions.Footer,
      label: "Submit",
      // The payload is filled with the form bindings when the flow is pushed to Meta.
      "on-click-action": { name: "complete", payload: {} },
    },
  ];

  return {
    version: "7.2",
    screens: [
      {
        id: FEEDBACK_FLOW_SCREEN_ID,
        title: "Your feedback",
        terminal: true,
        data: {},
        layout: { type: WaFlowLayoutType.scl, children },
      },
    ],
  };
}

/** The interactive message that opens the flow inside a service window. */
export function buildFeedbackTemplateMessage(
  businessName: string | null | undefined,
): WaFlowTemplateMessage {
  const where = businessName?.trim() ? ` at ${businessName.trim()}` : "";
  return {
    body: `Thanks for your visit${where}! Could you spare 30 seconds to tell us how we did?`,
    cta: "Share feedback",
  };
}

/**
 * Every rating element in the flow, in screen order. v2 answers are keyed by element name
 * and the Google-review gate looks the element up by id, so only elements where the two
 * agree count — an imported flow with Meta-authored names and injected ids does not.
 */
export function ratingElements(json: WaFlowJson): WaFlowForm[] {
  return json.screens.flatMap((screen) =>
    screen.layout.children.filter(
      (element) =>
        element.metaType === WaQuestions.Rating &&
        typeof element.name === "string" &&
        element.id === element.name,
    ),
  );
}

/** Whether an element is the one the Google-review decision can be made on. */
export function isReviewGatedRating(element: WaFlowForm): boolean {
  return typeof element.googleReview?.minRating === "number";
}

/** The element the Google-review decision is made on: the rating carrying a threshold. */
export function findOverallRatingElement(json: WaFlowJson): WaFlowForm | undefined {
  return ratingElements(json).find(isReviewGatedRating);
}

/**
 * A copy of the flow JSON with the happy threshold moved to `minRating`. Only the element
 * that already carries `googleReview` changes, so a business that edited the questions in
 * the flow editor keeps its own gating on the others.
 */
export function setHappyMinRating(json: WaFlowJson, minRating: number): WaFlowJson {
  const copy = structuredClone(json);
  for (const element of ratingElements(copy)) {
    if (element.googleReview !== undefined) {
      element.googleReview = { ...element.googleReview, minRating };
    }
  }
  return copy;
}

export function feedbackDraftForApi(
  draft: FeedbackDraftDefinition,
  happyMinRating = DEFAULT_HAPPY_MIN_RATING,
): FeedbackDraft {
  return {
    key: draft.key,
    label: draft.label,
    description: draft.description,
    questions: draft.questions.map(({ title, kind }) => ({ title, kind })),
    previewJson: buildFeedbackFlowJson(draft, { happyMinRating }),
  };
}
