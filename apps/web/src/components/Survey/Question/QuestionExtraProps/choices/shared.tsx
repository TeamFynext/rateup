// Extracted verbatim from `ChoicesCreator.tsx`. Behaviour is unchanged.

import { NPSWeightage, SurveyType } from "@/types/enums.ts";

import type { QuestionExtraPropsForm } from "../questionForm.ts";

/**
 * Either a stored choice or, for image choices, its inner `{ value, image }` payload — the list
 * hands the row itself for text choices and the payload for image ones.
 */
export type ChoiceLike = { value?: Choice["value"]; weightage?: NPSWeightage; image?: string };

export interface ChoiceProps {
  choice: ChoiceLike;
  onDelete: () => void;
  form: QuestionExtraPropsForm;
  index: number;
  image?: boolean;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
  maxCharCount?: number;
  surveyType?: SurveyType;
}
