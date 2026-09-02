import { motion } from "motion/react";

/** What each step is called and how long it takes, in wizard order. */
export const SIGNUP_STEPS = [
  { label: "Account", hint: "about 40 seconds" },
  { label: "Your store", hint: "about 30 seconds" },
  { label: "Goals", hint: "last one" },
] as const;

export const SIGNUP_TOTAL_STEPS = SIGNUP_STEPS.length;

/** Heading and subtitle for the card at each step. */
export const SIGNUP_COPY = [
  {
    title: "Create your account",
    subtitle: "About two minutes, and no card needed.",
  },
  {
    title: "Tell us about your store",
    subtitle: "What your customers will see in chat.",
  },
  {
    title: "What should RateUp do first?",
    subtitle: "Pick one or more — you can change this later.",
  },
] as const;

/**
 * The step rail above the signup card: which step of three, roughly how long it
 * takes, and three segments that fill as the wizard advances.
 *
 * @param currentStep 1-based index of the step on screen.
 */
export function SignupProgress({ currentStep }: Readonly<{ currentStep: number }>) {
  const index = Math.min(Math.max(currentStep, 1), SIGNUP_TOTAL_STEPS) - 1;
  const step = SIGNUP_STEPS[index];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11.5px] font-semibold tracking-[0.1em] text-ru-blue-500 uppercase dark:text-primary">
          Step {index + 1} of {SIGNUP_TOTAL_STEPS} · {step.label}
        </span>
        <span className="text-[12.5px] text-muted-foreground">{step.hint}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {SIGNUP_STEPS.map((segment, i) => (
          <span key={segment.label} className="h-1 overflow-hidden rounded-sm bg-secondary">
            <motion.span
              className="block h-full rounded-sm bg-primary"
              initial={false}
              animate={{ scaleX: i <= index ? 1 : 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ originX: 0 }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
