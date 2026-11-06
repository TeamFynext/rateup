// Question-shape contracts, as the survey/question endpoints persist and return them.
//
// `QuestionFormFeatures` lived in `components/Survey/.../questionForm.ts`, which imports
// `TNC`/`Wop` back out of `@/types/global` — so `global.d.ts` importing the type from there
// formed a real (type-level) import cycle. It is a persisted shape rather than a form
// concern, so it belongs here; the cycle is gone as a result.

import type { SmileyColorType, SmileyVariantStyle } from "@/types/enums.ts";

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
  /** Smiley question appearance: variant, palette, per-face colours and emoji. */
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
