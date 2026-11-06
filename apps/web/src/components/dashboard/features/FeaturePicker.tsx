import { IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSubscription } from "@/backend/subscription/subscription.query";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useOrgModules } from "@/hooks/useOrgModules.ts";
import { cn } from "@/lib/utils.ts";
import {
  alwaysIncluded,
  moduleDescription,
  moduleDetails,
  moduleLabel,
  ORG_MODULE_INFO,
  type OrgModule,
} from "@/utils/modules.ts";
import { isPlanGateOpen } from "@/utils/subscription/subscription.ts";

/** The org's feature choice as an unsaved draft, seeded from what it shows now. */
export function useFeatureDraft() {
  const { isOn } = useOrgModules();
  const [draft, setDraft] = useState<Set<OrgModule> | null>(null);
  const current = new Set(ORG_MODULE_INFO.map((info) => info.key).filter((key) => isOn(key)));
  const selected = draft ?? current;

  return {
    selected,
    dirty: draft !== null && ORG_MODULE_INFO.some((info) => draft.has(info.key) !== isOn(info.key)),
    hidden: ORG_MODULE_INFO.map((info) => info.key).filter((key) => !selected.has(key)),
    toggle: (key: OrgModule) => {
      const next = new Set(selected);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setDraft(next);
    },
    reset: () => setDraft(null),
  };
}

/** Every optional feature explained, as a pick list; shared by setup and the Features page. */
export function FeaturePicker({
  selected,
  onToggle,
  canEdit,
}: Readonly<{
  selected: ReadonlySet<OrgModule>;
  onToggle: (key: OrgModule) => void;
  canEdit: boolean;
}>) {
  const { t } = useTranslation();
  const { data: subscription } = useSubscription();

  return (
    <>
      {!canEdit && (
        <Alert>
          <AlertDescription>
            {t(
              "Features marked In your menu are on for your organization. Ask an admin to turn on any of the others.",
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {ORG_MODULE_INFO.map((info) => {
          const Icon = info.icon;
          const label = moduleLabel(t, info.key);
          const details = moduleDetails(t, info.key);
          const checked = selected.has(info.key);
          const notOnPlan =
            info.planGate && subscription && !isPlanGateOpen(subscription, info.planGate);
          const content = (
            <>
              <span className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-5 text-foreground" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{label}</span>
                    {notOnPlan ? <Badge variant="outline">{t("Not on your plan")}</Badge> : null}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {moduleDescription(t, info.key)}
                  </span>
                </span>
                {canEdit ? (
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md border",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input",
                    )}
                  >
                    {checked ? <IconCheck className="size-3.5" /> : null}
                  </span>
                ) : (
                  <Badge variant={checked ? "secondary" : "outline"} className="shrink-0">
                    {checked ? t("In your menu") : t("Turned off")}
                  </Badge>
                )}
              </span>
              <span className="text-sm leading-relaxed text-foreground">{details.meaning}</span>
              <span className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                {details.uses.map((use) => (
                  <span key={use} className="flex items-start gap-2">
                    <IconCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {use}
                  </span>
                ))}
              </span>
            </>
          );
          const cardClass = cn(
            "flex flex-col gap-4 rounded-xl border bg-card p-5 text-left transition-colors",
            checked ? "border-primary bg-primary/5" : "border-border",
          );

          // Members read the same cards as a catalogue; only admins get a control.
          if (!canEdit) {
            return (
              <div key={info.key} className={cardClass}>
                {content}
              </div>
            );
          }
          return (
            <button
              key={info.key}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => onToggle(info.key)}
              className={cn(
                cardClass,
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                !checked && "hover:bg-muted/40",
              )}
            >
              {content}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-input bg-muted p-4">
        <span className="text-sm font-medium">{t("Always included")}</span>
        <div className="flex flex-wrap gap-2">
          {alwaysIncluded(t).map((name) => (
            <Badge key={name} variant="secondary">
              {name}
            </Badge>
          ))}
        </div>
      </div>
    </>
  );
}
