import { IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { WebhookEvent } from "@/backend/webhook/webhook.api";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

import { ALL_EVENT_VALUES, ENVELOPE_EVENTS, EVENT_GROUPS } from "./webhookEvents.ts";

/**
 * Which events the endpoint receives. Ticks are local until **Save events**: one request for
 * the whole change, instead of a save — and a toast — per click.
 *
 * Before a webhook exists the card is a picker for the setup form (`onSave` absent): the
 * choice travels with the first **Verify and save**.
 */
export function WebhookEventsCard({
  value,
  onChange,
  saved,
  onSave,
  saving = false,
  readOnly = false,
}: Readonly<{
  value: readonly WebhookEvent[];
  onChange: (next: WebhookEvent[]) => void;
  /** The stored list; set once a webhook exists, which turns on Save / Discard. */
  saved?: readonly WebhookEvent[];
  onSave?: (next: WebhookEvent[]) => void;
  saving?: boolean;
  readOnly?: boolean;
}>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value), [value]);

  const dirty =
    saved !== undefined &&
    (saved.length !== value.length || saved.some((event) => !selected.has(event)));

  const needle = query.trim().toLowerCase();
  const groups = EVENT_GROUPS.map((group) => ({
    ...group,
    events: group.events.filter(
      (option) =>
        !needle ||
        t(option.label).toLowerCase().includes(needle) ||
        t(option.description).toLowerCase().includes(needle) ||
        option.value.includes(needle),
    ),
  })).filter((group) => group.events.length > 0);

  // Keeps the catalogue's order, whatever order the ticks happened in.
  const set = (next: Set<WebhookEvent>) => onChange(ALL_EVENT_VALUES.filter((e) => next.has(e)));

  const toggle = (event: WebhookEvent, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(event);
    else next.delete(event);
    set(next);
  };

  const toggleGroup = (events: readonly WebhookEvent[], on: boolean) => {
    const next = new Set(selected);
    for (const event of events) {
      if (on) next.add(event);
      else next.delete(event);
    }
    set(next);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Events")}</CardTitle>
        <CardDescription>
          {t("{count} of {total} events are sent to your endpoint.", {
            count: value.length,
            total: ALL_EVENT_VALUES.length,
          })}
        </CardDescription>
        {!readOnly && (
          <CardAction className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange([...ALL_EVENT_VALUES])}
              disabled={value.length === ALL_EVENT_VALUES.length}
            >
              {t("Select all")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange([])}
              disabled={value.length === 0}
            >
              {t("Clear")}
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <InputGroup className="max-w-sm">
          <InputGroupAddon>
            <IconSearch />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search events")}
            aria-label={t("Search events")}
          />
        </InputGroup>

        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No events match your search.")}</p>
        ) : (
          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
            {groups.map((group) => {
              const values = group.events.map((e) => e.value);
              const on = values.filter((v) => selected.has(v)).length;
              const groupId = `webhook-group-${group.title.replace(/\W+/g, "-").toLowerCase()}`;
              return (
                <fieldset key={group.title} className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                    <legend className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {t(group.title)}
                    </legend>
                    {!readOnly && (
                      <label
                        htmlFor={groupId}
                        className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"
                      >
                        {on === values.length
                          ? t("All selected")
                          : on > 0
                            ? t("{on} of {total}", { on, total: values.length })
                            : t("Select all")}
                        <Checkbox
                          id={groupId}
                          checked={on === values.length}
                          onCheckedChange={(checked) => toggleGroup(values, checked)}
                          aria-label={t("Select all {group} events", { group: t(group.title) })}
                        />
                      </label>
                    )}
                  </div>
                  {group.events.map((option) => {
                    const id = `webhook-event-${option.value}`;
                    return (
                      <label
                        key={option.value}
                        htmlFor={id}
                        className="flex cursor-pointer items-start gap-3 rounded-md px-1 py-2 hover:bg-muted/50"
                      >
                        <Checkbox
                          id={id}
                          className="mt-0.5"
                          checked={selected.has(option.value)}
                          onCheckedChange={(checked) => toggle(option.value, checked)}
                          disabled={readOnly}
                        />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            {t(option.label)}
                            <code className="font-mono text-[11px] font-normal text-muted-foreground">
                              {option.value}
                            </code>
                            {ENVELOPE_EVENTS.has(option.value) && (
                              <Tooltip>
                                <TooltipTrigger render={<Badge variant="secondary" />}>
                                  {t("Envelope")}
                                </TooltipTrigger>
                                <TooltipContent className="max-w-64">
                                  {t(
                                    "Posted as an envelope with id, type, createdAt, orgId and data, instead of the flat shape the older events use.",
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t(option.description)}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              );
            })}
          </div>
        )}
      </CardContent>

      {onSave && dirty && !readOnly && (
        <CardFooter className="sticky bottom-0 z-10 justify-between gap-3 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <p className="text-sm text-muted-foreground">
            {value.length === 0
              ? t("Pick at least one event")
              : t("You have unsaved changes to the events.")}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onChange([...(saved ?? [])])}>
              {t("Discard")}
            </Button>
            <Button
              onClick={() => onSave([...value])}
              loading={saving}
              disabled={value.length === 0}
            >
              {t("Save events")}
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
