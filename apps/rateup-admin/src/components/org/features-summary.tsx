import { IconCheck, IconX } from "@tabler/icons-react";

import type { OrgSubscription } from "@/api/org-actions.api";
import { formatLimit, LIMITS, SWITCHES } from "@/components/org/actions/features";
import { cn } from "@/lib/utils";

function OverrideTag() {
  return (
    <span className="rounded bg-tone-peach px-1 py-px text-[10px] font-semibold tracking-wide text-tone-peach-accent uppercase">
      Override
    </span>
  );
}

/**
 * What the org can actually do: its stored features, with anything that differs from its
 * plan's own features tagged, so a hand-set limit is visible without opening the editor.
 */
export function FeaturesSummary({
  subscription,
  className,
}: {
  subscription: OrgSubscription;
  className?: string;
}) {
  const { features, planFeatures } = subscription;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
        {LIMITS.map((limit) => {
          const value = limit.get(features);
          const overridden = !!planFeatures && limit.get(planFeatures) !== value;
          return (
            <div key={limit.key} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {limit.label}
                {overridden && <OverrideTag />}
              </dt>
              <dd className="mt-0.5 text-sm font-medium tabular">
                {formatLimit(value)}
                {"hint" in limit && value !== undefined && (
                  <span className="font-normal text-muted-foreground"> {limit.hint}</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <ul className="flex flex-wrap gap-1.5" aria-label="Features">
        {SWITCHES.map((gate) => {
          const on = !!gate.get(features);
          const overridden = !!planFeatures && !!gate.get(planFeatures) !== on;
          return (
            <li
              key={gate.key}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium",
                on ? "bg-tone-mint text-tone-mint-accent" : "bg-secondary text-muted-foreground",
                overridden && "ring-1 ring-tone-peach-accent/60",
              )}
              title={overridden ? "Differs from the plan" : undefined}
            >
              {on ? <IconCheck className="size-3" /> : <IconX className="size-3" />}
              {gate.label}
              <span className="sr-only">{on ? "on" : "off"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
