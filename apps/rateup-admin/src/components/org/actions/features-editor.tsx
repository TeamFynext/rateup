import { UNLIMITED_COUNT, type SubscriptionFeatures } from "@/api/org-actions.api";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { formatLimit, isUnlimited, LIMITS, SWITCHES } from "./features";

/**
 * The four limits and the feature switches, edited in place. Given a `reference` (the
 * plan an org is on) each field shows the reference value under it and marks a
 * difference; without one (editing the plan itself) the fields stand alone.
 */
export function FeaturesEditor({
  draft,
  onChange,
  reference = null,
  referenceLabel = "Plan",
}: {
  draft: SubscriptionFeatures;
  onChange: (change: (features: SubscriptionFeatures) => void) => void;
  reference?: Partial<SubscriptionFeatures> | null;
  referenceLabel?: string;
}) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        {LIMITS.map((limit) => {
          const value = limit.get(draft) ?? 0;
          const unlimited = isUnlimited(value);
          return (
            <div key={limit.key} className="flex flex-col gap-2">
              <Label htmlFor={`limit-${limit.key}`}>
                {limit.label}
                {"hint" in limit && (
                  <span className="font-normal text-muted-foreground"> {limit.hint}</span>
                )}
              </Label>
              <Input
                id={`limit-${limit.key}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={UNLIMITED_COUNT - 1}
                disabled={unlimited}
                value={unlimited ? "" : value}
                placeholder={unlimited ? "Unlimited" : undefined}
                onChange={(event) => {
                  const next = Math.max(0, Math.floor(Number(event.target.value) || 0));
                  onChange((features) => limit.set(features, Math.min(next, UNLIMITED_COUNT - 1)));
                }}
                className="h-11 rounded-xl tabular"
              />
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                {reference ? (
                  <ReferenceHint
                    label={referenceLabel}
                    value={formatLimit(limit.get(reference))}
                    differs={limit.get(reference) !== limit.get(draft)}
                  />
                ) : (
                  <span />
                )}
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={unlimited}
                    onCheckedChange={(checked) =>
                      onChange((features) =>
                        limit.set(
                          features,
                          checked === true
                            ? UNLIMITED_COUNT
                            : Math.min(limit.get(reference) ?? 0, UNLIMITED_COUNT - 1),
                        ),
                      )
                    }
                  />
                  Unlimited
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col divide-y rounded-2xl border">
        {SWITCHES.map((gate) => (
          <label key={gate.key} className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm">
              {gate.label}
              {reference && (
                <span className="block text-xs">
                  <ReferenceHint
                    label={referenceLabel}
                    value={gate.get(reference) ? "on" : "off"}
                    differs={!!gate.get(reference) !== !!gate.get(draft)}
                  />
                </span>
              )}
            </span>
            <Switch
              checked={!!gate.get(draft)}
              onCheckedChange={(checked) => onChange((features) => gate.set(features, checked))}
            />
          </label>
        ))}
      </div>
    </>
  );
}

/** The reference's own value under a field, marked when the draft differs from it. */
function ReferenceHint({
  label,
  value,
  differs,
}: {
  label: string;
  value: string;
  differs: boolean;
}) {
  return (
    <span className={differs ? "font-medium text-tone-peach-accent" : "text-muted-foreground"}>
      {label}: {value}
      {differs && " · overridden"}
    </span>
  );
}
