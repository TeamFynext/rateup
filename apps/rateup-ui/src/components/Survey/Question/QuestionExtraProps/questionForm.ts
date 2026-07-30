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
  required?: boolean;
  [key: string]: unknown;
}

/** The per-language `features` bag a question editor reads and writes. */
export interface QuestionFormFeatures {
  fields?: QuestionFormField[];
  questions?: string[];
  [key: string]: unknown;
}

export interface QuestionFormValues {
  features?: Record<string, QuestionFormFeatures>;
  choices?: Record<string, Choice[]>;
  tnc?: TNC;
  wop?: Wop;
  [key: string]: unknown;
}

export interface QuestionExtraPropsForm {
  values?: QuestionFormValues;
  setFieldValue?: (path: string, value: unknown) => void;
}
