import { IconCheck } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

/**
 * A step in a multi-step flow.
 *
 * `complete` is deliberately separate from position: a resumable wizard can have
 * step 4 finished while step 2 is not, and colouring by index alone would tell
 * the reader something untrue about their own draft.
 */
export interface StepperStep {
  /** Stable key, also used as the value the wizard navigates to. */
  id: string;
  label: string;
  complete?: boolean;
  /** False for a step that cannot be reached yet. Defaults to true. */
  enabled?: boolean;
}

interface StepperProps {
  steps: readonly StepperStep[];
  /** `id` of the step on screen. */
  currentStep: string;
  /** Omit to render a read-only rail. */
  onStepChange?: (id: string) => void;
  className?: string;
}

/**
 * The horizontal numbered rail across the top of a wizard.
 *
 * Three states, each with its own weight and colour, because a resumable draft
 * has to say three different things at a glance: this step is finished, this is
 * where you are, this is still to come. Generalised out of
 * `Form/signup/SignupProgress.tsx`, which had the same shape hard-coded around
 * one three-step array.
 */
export function Stepper({ steps, currentStep, onStepChange, className }: Readonly<StepperProps>) {
  const currentIndex = Math.max(
    steps.findIndex((step) => step.id === currentStep),
    0,
  );

  return (
    <nav aria-label="Progress" className={cn("flex w-full items-center", className)}>
      {steps.map((step, index) => {
        const isCurrent = index === currentIndex;
        const isDone = step.complete ?? false;
        const enabled = (step.enabled ?? true) && Boolean(onStepChange);
        const isLast = index === steps.length - 1;

        return (
          <div
            key={step.id}
            className={cn("flex min-w-0 items-center gap-2", isLast ? "shrink-0" : "flex-1")}
          >
            <button
              type="button"
              disabled={!enabled}
              aria-current={isCurrent ? "step" : undefined}
              onClick={() => onStepChange?.(step.id)}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-md outline-none",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
                enabled ? "cursor-pointer" : "cursor-default",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[11px] font-semibold",
                  isDone && "border-primary bg-primary text-primary-foreground",
                  !isDone && isCurrent && "border-primary text-primary",
                  !isDone && !isCurrent && "border-input text-muted-foreground/70",
                )}
              >
                {isDone ? <IconCheck className="size-3.5" aria-hidden /> : index + 1}
              </span>
              <span
                className={cn(
                  "truncate text-[13px] whitespace-nowrap",
                  isCurrent && "text-foreground font-semibold",
                  !isCurrent && isDone && "text-secondary-foreground font-medium",
                  !isCurrent && !isDone && "text-muted-foreground/70 font-medium",
                )}
              >
                {step.label}
              </span>
            </button>

            {isLast ? null : (
              // min-w-0 lets the connector absorb the leftover width instead of
              // forcing the rail wider than its container on a narrow screen.
              // It fills behind a finished step, so the rail reads as progress.
              <span
                className={cn(
                  "mr-3.5 ml-1.5 h-px min-w-5 flex-1",
                  isDone ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
