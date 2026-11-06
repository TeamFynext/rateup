import { IconCheck } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
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
  /** Replaces the step number inside the circle. A finished step still shows the tick. */
  icon?: React.ReactNode;
  /** A short chip after the label — an estimated time, a count. */
  meta?: string;
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
                // Natural width, never squeezed: the connector beside it is what gives way.
                "flex shrink-0 items-center gap-2 rounded-md outline-none",
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
                {isDone ? <IconCheck className="size-3.5" aria-hidden /> : (step.icon ?? index + 1)}
              </span>
              {/* Names are never truncated — a step called "P.." tells nobody anything. Below
                  `md` only the current step is named and the rest are their circles. */}
              <span
                className={cn(
                  "text-[13px] whitespace-nowrap",
                  !isCurrent && "hidden md:inline",
                  isCurrent && "text-foreground font-semibold",
                  !isCurrent && isDone && "text-secondary-foreground font-medium",
                  !isCurrent && !isDone && "text-muted-foreground/70 font-medium",
                )}
              >
                {step.label}
              </span>
              {/* Only the current step carries its chip: six chips do not fit beside six
                  names at the wizard's width, and it is the step in hand that is timed. */}
              {step.meta && isCurrent && (
                <Badge
                  variant="outline"
                  className="hidden h-5 shrink-0 px-1.5 text-[10px] sm:inline-flex"
                >
                  {step.meta}
                </Badge>
              )}
            </button>

            {isLast ? null : (
              // min-w-0 lets the connector absorb the leftover width instead of
              // forcing the rail wider than its container on a narrow screen.
              // It fills behind a finished step, so the rail reads as progress.
              <span
                className={cn(
                  "mr-2 ml-1 h-px min-w-2 flex-1 md:mr-3 md:ml-1.5 md:min-w-3",
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
