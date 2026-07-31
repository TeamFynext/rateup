import type { QuestionFormFeatures } from "@/backend/surveys/questions/questions.types.ts";
import type { PageType, QuestionType } from "@/types/enums.ts";
import type { TNC, Wop } from "@/types/global";

/**
 * The form surface the per-question "extra props" editors are written against.
 *
 * These editors still call the Mantine form API (`form.values`,
 * `form.setFieldValue`), but `QuestionDetailedView` hands them a
 * **react-hook-form** instance, which exposes neither. In practice that means
 * `values` reads as `undefined` and `setFieldValue` is not callable — see the
 * migration notes; this type describes what the components touch rather than
 * changing their behaviour.
 */

export interface QuestionFormValues {
  /** The question's type, as `QuestionType` or `PageType`. */
  type?: QuestionType | PageType;
  /** Question heading, per language. */
  title?: Record<string, string>;
  features?: Record<string, QuestionFormFeatures>;
  choices?: Record<string, Choice[]>;
  tnc?: Record<string, TNC>;
  wop?: Wop;
  [key: string]: unknown;
}

export interface QuestionExtraPropsForm {
  values?: QuestionFormValues;
  setFieldValue?: (path: string, value: unknown) => void;
  /** Present on the react-hook-form instance some callers actually pass. */
  getValues?: unknown;
}

export type {
  QuestionFormFeatures,
  QuestionFormField,
} from "@/backend/surveys/questions/questions.types.ts";
