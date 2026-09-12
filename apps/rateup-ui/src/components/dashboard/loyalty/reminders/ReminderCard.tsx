import { IconAlertTriangle, IconClock, IconGift, IconPencil } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { EventTrigger } from "@/backend/loyalty/eventTriggers.api";
import type { SaveReminderInput } from "@/backend/loyalty/reminders.api";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

import type { LoyaltyEventDefinition } from "../messages/loyaltyMessageCatalog.ts";
import { LoyaltyTemplateStatusBadge } from "../messages/LoyaltyTemplateStatusBadge.tsx";
import { MessageBubble } from "../messages/MessageBubble.tsx";
import { templateBodyOf } from "../messages/templateUsage.ts";
import { LOYALTY_PATHS } from "../paths.ts";
import { DEFAULT_SEND_HOUR, sendHourOptions, type ReminderDefinition } from "./reminderCatalog.ts";

const NO_GIFT = "__none__";

interface GiftOption {
  id: string;
  name: string;
}

/** Just the part of a stored template this card reads. */
type TemplateEntry = Parameters<typeof templateBodyOf>[0] & {
  data?: { status?: string } | null;
};

/**
 * One occasion's schedule.
 *
 * Mirrors `EventMessageCard` on the Messages page rather than forking it: same switch, same
 * status badge, same preview bubble — so a reminder reads the same wherever you meet it.
 * What differs is the middle: this card owns the timing, and links across for the words.
 */
export function ReminderCard({
  occasion,
  trigger,
  message,
  template,
  gifts,
  timezone,
  isSaving,
  onSave,
}: Readonly<{
  occasion: ReminderDefinition;
  trigger: EventTrigger | undefined;
  message: LoyaltyEventDefinition | undefined;
  template: TemplateEntry | undefined;
  gifts: GiftOption[];
  timezone: string | null | undefined;
  isSaving: boolean;
  onSave: (patch: SaveReminderInput) => void;
}>) {
  const { t } = useTranslation();
  const uid = useId();

  const days = occasion.timing === "quietDays" ? trigger?.triggerDays : trigger?.leadDays;
  const [draftDays, setDraftDays] = useState(
    days === null || days === undefined ? String(occasion.defaultDays ?? "") : String(days),
  );

  const hasTemplate = Boolean(trigger?.waTemplateId);
  const hours = useMemo(() => sendHourOptions(), []);

  // A reminder with no message cannot send, so the switch stays out of reach until one
  // exists — the same rule Messages applies to its own cards.
  const canEnable = hasTemplate;

  const saveDays = () => {
    const parsed = Number(draftDays);
    if (!Number.isInteger(parsed) || parsed < 0) return;
    onSave(occasion.timing === "quietDays" ? { triggerDays: parsed } : { leadDays: parsed });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{occasion.label}</h3>
              <LoyaltyTemplateStatusBadge
                status={template?.data?.status}
                hasTemplate={hasTemplate}
                enabled={trigger?.enabled}
              />
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {occasion.timingHint}
            </p>
            {occasion.requires && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <IconAlertTriangle size={13} className="shrink-0 text-amber-600" />
                {occasion.requires}
              </p>
            )}
          </div>

          {canEnable ? (
            <Switch
              checked={Boolean(trigger?.enabled)}
              disabled={isSaving}
              onCheckedChange={(enabled) => onSave({ enabled })}
              aria-label={t("Send this reminder")}
            />
          ) : (
            <Tooltip>
              <TooltipTrigger render={<div />}>
                <Switch checked={false} disabled aria-label={t("Send this reminder")} />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("Write the message first, on Messages › Automatic.")}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* One row, all three inputs on the same baseline: each Field is a label over a
            control, with nothing below it to push the others out of line. */}
        <div className="flex flex-wrap items-end gap-4">
          {occasion.timing !== "onTheDay" && (
            <Field className="w-52">
              <FieldLabel htmlFor={`${uid}-days`}>{occasion.daysLabel}</FieldLabel>
              <Input
                id={`${uid}-days`}
                type="number"
                min={0}
                value={draftDays}
                disabled={isSaving}
                onChange={(event) => setDraftDays(event.target.value)}
                onBlur={saveDays}
              />
            </Field>
          )}

          <Field className="w-40">
            <FieldLabel htmlFor={`${uid}-hour`} className="flex items-center gap-1">
              <IconClock size={12} className="shrink-0 text-muted-foreground" />
              {t("Send at")}
              {/* The zone rides on the label rather than under the select: a helper line
                  made this field taller than Gift and left the two off the same baseline. */}
              <span className="truncate font-normal text-muted-foreground">
                {timezone ?? t("UTC")}
              </span>
            </FieldLabel>
            <Select
              value={String(trigger?.sendHour ?? DEFAULT_SEND_HOUR)}
              items={hours}
              onValueChange={(value) => value && onSave({ sendHour: Number(value) })}
            >
              <SelectTrigger id={`${uid}-hour`} className="w-full" disabled={isSaving}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hours.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {occasion.canGift && (
            <Field className="w-56">
              <FieldLabel htmlFor={`${uid}-gift`}>{t("Gift")}</FieldLabel>
              <Select
                value={trigger?.rewardId ?? NO_GIFT}
                items={[
                  { value: NO_GIFT, label: t("No gift") },
                  ...gifts.map((gift) => ({ value: gift.id, label: gift.name })),
                ]}
                onValueChange={(value) =>
                  onSave({ rewardId: !value || value === NO_GIFT ? null : value })
                }
              >
                <SelectTrigger id={`${uid}-gift`} className="w-full" disabled={isSaving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GIFT}>{t("No gift")}</SelectItem>
                  {gifts.map((gift) => (
                    <SelectItem key={gift.id} value={gift.id}>
                      <span className="flex items-center gap-1.5">
                        <IconGift size={14} />
                        {gift.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>

        {/* What the customer actually reads, filled with the catalog's sample values — the
            old settings screens had this and it was the quickest way to see the wording
            was wrong before sending it to anyone. */}
        {message && (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t("How it reads, with sample details")}
              </span>
              <Button
                variant="ghost"
                size="xs"
                render={<Link to={LOYALTY_PATHS.messages} search={{ tab: "automatic" }} />}
              >
                <IconPencil size={13} />
                {t("Edit wording")}
              </Button>
            </div>
            <MessageBubble
              text={fillSample(templateBodyOf(template) ?? message.body, message.example)}
            />
            {!hasTemplate && (
              <Badge variant="outline" className="w-fit">
                {t("Not written yet")}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * `{{1}}`, `{{2}}` … replaced with the catalog's example values, so the preview reads as a
 * sentence rather than as a template. An unmatched slot is left as it is — better to show
 * the merchant a gap than to invent a value for it.
 */
function fillSample(body: string, example: string[]): string {
  if (!body) return "";
  return body.replace(
    /\{\{(\d+)\}\}/g,
    (match, index: string) => example[Number(index) - 1] ?? match,
  );
}
