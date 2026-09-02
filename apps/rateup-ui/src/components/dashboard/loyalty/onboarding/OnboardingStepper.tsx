import { IconCheck } from "@tabler/icons-react";

import { cn } from "@/lib/utils.ts";

export interface StepDefinition {
  id: string;
  label: string;
}

interface OnboardingStepperProps {
  steps: readonly StepDefinition[];
  currentIndex: number;
  /** Index of the furthest step already saved — everything up to it is revisitable. */
  furthestIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Kept local to the wizard rather than promoted to `components/ui`: the signup wizard
 * hand-rolls its own and shadcn has no stepper, so there is no shared contract to meet yet.
 */
export function OnboardingStepper({
  steps,
  currentIndex,
  furthestIndex,
  onSelect,
}: Readonly<OnboardingStepperProps>) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {steps.map((step, index) => {
        const isDone = index < furthestIndex;
        const isCurrent = index === currentIndex;
        // Only steps the user has already saved are safe to jump to — later ones may
        // depend on values that do not exist yet.
        const isReachable = index <= furthestIndex;

        return (
          <li key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!isReachable}
              onClick={() => onSelect(index)}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-medium transition-colors",
                isReachable ? "cursor-pointer" : "cursor-not-allowed",
                isCurrent
                  ? "bg-primary/10 text-primary"
                  : isReachable
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-muted-foreground/50",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
                  isDone
                    ? "border-green-600 bg-green-600 text-white"
                    : isCurrent
                      ? "border-primary text-primary"
                      : "border-border",
                )}
              >
                {isDone ? <IconCheck size={13} /> : index + 1}
              </span>
              {step.label}
            </button>

            {index < steps.length - 1 && (
              <span aria-hidden className="hidden h-px w-4 bg-border sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
