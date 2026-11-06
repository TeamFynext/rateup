import { useTranslation } from "react-i18next";

import { isPasswordValid } from "./signup/shared.tsx";

/** Highest score a password that would still be rejected can reach: "Fair". */
const MAX_SCORE_UNTIL_VALID = 2;

/**
 * A 0–4 reading of the password, one point per property the meter can show:
 * length, extra length, mixed case, and a number plus a symbol. Anything typed
 * scores at least 1 so the bar never reads as empty while the field has content.
 * "Good" and "Strong" are kept for passwords `isPasswordValid` accepts — a long
 * mixed-case password with no number or symbol would otherwise read as good to
 * go and then be refused on submit.
 */
export function passwordScore(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  if (password.length > 0 && score === 0) score = 1;
  return isPasswordValid(password) ? score : Math.min(score, MAX_SCORE_UNTIL_VALID);
}

const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"] as const;

/** Fill colour for the meter, by score. Unfilled segments stay on `bg-secondary`. */
function strengthFill(score: number) {
  if (score <= 1) return "bg-destructive";
  if (score === 2) return "bg-amber-500 dark:bg-amber-400";
  return "bg-green-600 dark:bg-green-500";
}

function strengthText(score: number) {
  if (score === 0) return "text-muted-foreground";
  if (score <= 1) return "text-destructive";
  if (score === 2) return "text-amber-700 dark:text-amber-500";
  return "text-green-700 dark:text-green-500";
}

/**
 * The strength meter shown under a new-password field (signup, reset): four
 * segments, a one-word verdict and a hint, so the requirement reads as a target
 * rather than a list of failures. What is accepted is still `isPasswordValid`.
 */
export function PasswordStrengthMeter({ password }: Readonly<{ password: string }>) {
  const { t: translations } = useTranslation();
  const score = passwordScore(password);
  const strengthHint =
    score >= 3
      ? translations("Good to go — that would take years to guess.")
      : translations("Mix cases, a number and a symbol. 12+ is ideal.");

  return (
    <>
      {/* The row is pinned to the height of the verdict — without that it is only
          as tall as the 4px bars until the first keystroke, and the whole card
          jumps the moment a verdict appears. */}
      <div className="flex h-4 items-center gap-2.5">
        <div
          className="grid flex-1 grid-cols-4 gap-1"
          role="meter"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={4}
          aria-label={translations("Password strength")}
        >
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              className={`h-1 rounded-sm transition-colors ${
                score >= segment ? strengthFill(score) : "bg-secondary"
              }`}
            />
          ))}
        </div>
        <span
          className={`min-w-14 text-right text-xs leading-4 font-semibold ${strengthText(score)}`}
        >
          {score > 0 ? translations(STRENGTH_LABEL[score]) : ""}
        </span>
      </div>
      <p className="text-[11.5px] text-muted-foreground">{strengthHint}</p>
    </>
  );
}
