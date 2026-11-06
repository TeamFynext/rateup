// Extracted verbatim from `SignupFormNew.tsx`. Behaviour is unchanged.

import type { FieldValues, UseFormReturn } from "react-hook-form";

export const signUpType = {
  SIGNUP_WITH_GOOGLE: "google",
  SIGNUP_WITH_APPLE: "apple",
  SIGNUP_WITH_EMAIL: "email",
  SIGNUP_WITH_PHONE: "phone",
};

// Single source of truth for which step owns which field. The submit guard and each
// step's gate read from these, so a field can never be required by one and unchecked
// by the other.
export const STEP_ONE_FIELDS = ["name", "email", "password"] as const;

export const STEP_TWO_FIELDS = [
  "orgName",
  "website",
  "phoneNumber",
  "industry",
  "teamSize",
] as const;

/**
 * The wizard's react-hook-form instance. The steps are shared by two signup
 * flows whose schemas differ in which fields are optional, so this uses
 * react-hook-form's own open `FieldValues` rather than one concrete schema.
 */
export type SignupForm = UseFormReturn<FieldValues>;

/**
 * react-hook-form's `Control` is invariant in its field-values type, so a form
 * built from either flow's concrete zod schema is not assignable to the shared
 * `SignupForm` — even though every field the steps touch exists on both. This
 * is the single place that gap is bridged.
 */
export function asSignupForm<T extends FieldValues>(form: UseFormReturn<T>): SignupForm {
  return form as unknown as SignupForm;
}

/**
 * react-hook-form types a field error's `message` loosely (it can nest for
 * array/object fields). Every message this form sets is a plain string, so
 * anything else is dropped rather than handed to React.
 */
export const errorMessage = (error?: { message?: unknown }) =>
  typeof error?.message === "string" ? error.message : null;

export const isPasswordValid = (pass: string) =>
  /.{8,}/.test(pass) &&
  /[A-Z]/.test(pass) &&
  /[a-z]/.test(pass) &&
  /[0-9]/.test(pass) &&
  /[!@#$%^&*(),.?":{}|<>]/.test(pass);

/**
 * The red asterisk on a required field's label. The glyph itself is decorative,
 * so the word it stands for is spelled out for screen readers instead.
 */
export function RequiredMark() {
  return (
    <span className="text-destructive">
      <span aria-hidden="true">*</span>
      <span className="sr-only"> (required)</span>
    </span>
  );
}
