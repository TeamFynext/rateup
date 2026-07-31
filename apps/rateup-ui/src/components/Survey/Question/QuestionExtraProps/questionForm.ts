import type { PageType, QuestionType } from "@/types/enums.ts";
import type { TNC, Wop } from "@/types/global";

import type { SmileyColorType, SmileyVariantStyle } from "./SmileyExtraProps.tsx";
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

/** A single field of a MultiTextInput question. */
export interface QuestionFormField {
  fieldKey: string;
  label?: string;
  placeholder?: string;
  /** The take-survey renderer reads the placeholder under this name. */
  placeholderText?: string;
  required?: boolean;
  [key: string]: unknown;
}

/** The per-language `features` bag a question editor reads and writes. */
export interface QuestionFormFeatures {
  fields?: QuestionFormField[];
  /** EmailOTP question: the allow-list and whether it is enforced. */
  allowedEmails?: string[];
  isRestricted?: boolean;
  questions?: string[];
  /** Smiley question appearance: variant, palette, per-face colours and emoji. */
  /** MCQ/MSQ questions: the free-text "Other" option. */
  other?: { isEnabled?: boolean; title?: string; placeholder?: string };
  /** Contact question: which sub-fields are on, and their prompts. */
  name?: { isEnabled?: boolean; headText?: string; defaultCountryCode?: string };
  phone?: { isEnabled?: boolean; headText?: string; defaultCountryCode?: string };
  email?: { isEnabled?: boolean; headText?: string; defaultCountryCode?: string };
  /** Testimonial question: which sub-fields are on, and their prompts. */
  nameQn?: string;
  jobTitle?: boolean;
  jobTitleQn?: string;
  testimonialQn?: string;
  rating?: boolean;
  ratingQn?: string;
  photo?: boolean;
  photoQn?: string;
  iconStyle?: {
    variant?: SmileyVariantStyle;
    colorType?: SmileyColorType;
    color?: Record<number, string>;
    emojies?: Record<number, string>;
    gradientStartColor?: string;
    gradientEndColor?: string;
  };
  [key: string]: unknown;
}

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
