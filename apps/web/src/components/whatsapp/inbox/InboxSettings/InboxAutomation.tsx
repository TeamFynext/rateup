import { IconCheck, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useDisableInboxAutomationMutation,
  useEnableInboxAutomationMutation,
  useInboxAutomation,
  useUpdateInboxAutomationMutation,
} from "@/backend/whatsapp/inbox/inboxAutomation/inboxautomation.query";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";

import { SettingsPanel } from "./SettingsPanel.tsx";

type RuleCondition = "UNASSIGNED" | "ASSIGNED";

const RULES: { condition: RuleCondition; title: string; description: string }[] = [
  {
    condition: "UNASSIGNED",
    title: "New and unassigned conversations",
    description: "Tickets nobody has picked up yet.",
  },
  {
    condition: "ASSIGNED",
    title: "Assigned conversations",
    description: "Tickets an agent owns but has stopped replying to.",
  },
];

const PRESET_HOURS = [1, 2, 4, 6, 8, 12, 24, 48, 72, 168];
const MAX_CUSTOM_HOURS = 720;
/** What the API sets when a rule is switched on (`enableInboxAutomation` in rateup-api). */
const DEFAULT_HOURS = 24;
const CUSTOM = "custom";

export default function InboxAutomation() {
  const { t } = useTranslation();
  const { data: rules = [], isLoading } = useInboxAutomation();

  return (
    <SettingsPanel
      title={t("Auto-close")}
      description={t(
        "Close conversations that have gone quiet, so the inbox only shows what still needs a reply. Agents can reopen a closed conversation at any time.",
      )}
    >
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {RULES.map((rule) =>
          isLoading ? (
            <div key={rule.condition} className="flex items-center gap-4 px-4 py-4">
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          ) : (
            <AutoCloseRule
              key={rule.condition}
              condition={rule.condition}
              title={t(rule.title)}
              description={t(rule.description)}
              closeAfterHours={
                rules.find((r) => r.condition === rule.condition)?.closeAfterHours ?? null
              }
              enabled={rules.some((r) => r.condition === rule.condition)}
            />
          ),
        )}
      </div>
    </SettingsPanel>
  );
}

function AutoCloseRule({
  condition,
  title,
  description,
  enabled,
  closeAfterHours,
}: {
  condition: RuleCondition;
  title: string;
  description: string;
  enabled: boolean;
  closeAfterHours: number | null;
}) {
  const { t } = useTranslation();
  const enable = useEnableInboxAutomationMutation();
  const disable = useDisableInboxAutomationMutation();
  const update = useUpdateInboxAutomationMutation();
  const hours = closeAfterHours ?? DEFAULT_HOURS;
  const isPreset = PRESET_HOURS.includes(hours);
  const [customDraft, setCustomDraft] = useState<string | null>(null);
  const isCustomOpen = customDraft !== null;
  const toggling = enable.isPending || disable.isPending;

  const hourLabel = (value: number) => {
    if (value % 168 === 0)
      return t("{count, plural, one {# week} other {# weeks}}", { count: value / 168 });
    if (value % 24 === 0)
      return t("{count, plural, one {# day} other {# days}}", { count: value / 24 });
    return t("{count, plural, one {# hour} other {# hours}}", { count: value });
  };

  function toggle(next: boolean) {
    const mutation = next ? enable : disable;
    mutation.mutate(condition, {
      onSuccess: () => toast.success(next ? t("Auto-close turned on") : t("Auto-close turned off")),
    });
  }

  function save(nextHours: number) {
    update.mutate(
      { condition, data: { closeAfterHours: nextHours } },
      {
        onSuccess: () => {
          setCustomDraft(null);
          toast.success(t("Closes after {time} now", { time: hourLabel(nextHours) }));
        },
      },
    );
  }

  const customHours = Number(customDraft);
  const customValid =
    Number.isInteger(customHours) && customHours >= 1 && customHours <= MAX_CUSTOM_HOURS;
  const options = isPreset ? PRESET_HOURS : [...PRESET_HOURS, hours].sort((a, b) => a - b);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {enabled
            ? t("{description} Closed after {time} without a new message.", {
                description,
                time: hourLabel(hours),
              })
            : description}
        </p>
      </div>

      {enabled && !isCustomOpen && (
        <Select
          value={String(hours)}
          onValueChange={(value) => {
            if (value === CUSTOM) setCustomDraft(isPreset ? "" : String(hours));
            else if (value && Number(value) !== hours) save(Number(value));
          }}
          items={[
            ...options.map((value) => ({ value: String(value), label: hourLabel(value) })),
            { value: CUSTOM, label: t("Custom…") },
          ]}
        >
          <SelectTrigger className="w-32" aria-label={t("Close after")} disabled={update.isPending}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((value) => (
              <SelectItem key={value} value={String(value)}>
                {hourLabel(value)}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM}>{t("Custom…")}</SelectItem>
          </SelectContent>
        </Select>
      )}

      {enabled && isCustomOpen && (
        <form
          className="flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (customValid) save(customHours);
          }}
        >
          <Input
            autoFocus
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_CUSTOM_HOURS}
            value={customDraft}
            onChange={(event) => setCustomDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setCustomDraft(null);
            }}
            aria-label={t("Hours")}
            aria-invalid={customDraft !== "" && !customValid}
            className="h-9 w-20"
          />
          <span className="text-sm text-muted-foreground">{t("hours")}</span>
          <Button
            type="submit"
            size="icon"
            aria-label={t("Save")}
            disabled={!customValid}
            loading={update.isPending}
          >
            <IconCheck />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("Cancel")}
            onClick={() => setCustomDraft(null)}
          >
            <IconX />
          </Button>
        </form>
      )}

      <Switch
        checked={enabled}
        onCheckedChange={toggle}
        disabled={toggling}
        aria-label={t("Auto-close {rule}", { rule: title })}
      />
    </div>
  );
}
