import { IconChevronDown, IconPencil, IconPhoto } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { EventTrigger } from "@/backend/loyalty/eventTriggers.api";
import type { WaTemplateListEntry } from "@/backend/whatsapp/whatsapp.api";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";

import { EventMessageBodyField } from "./EventMessageBodyField.tsx";
import { variableHint, type LoyaltyEventDefinition } from "./loyaltyMessageCatalog.ts";
import { LoyaltyTemplateStatusBadge } from "./LoyaltyTemplateStatusBadge.tsx";
import { MessageBubble } from "./MessageBubble.tsx";
import { templateBodyOf, templateHasRichParts } from "./templateUsage.ts";

interface EventMessageCardProps {
  definition: LoyaltyEventDefinition;
  trigger: EventTrigger | undefined;
  /** The template the trigger points at, looked up once by the parent. */
  template: WaTemplateListEntry | undefined;
  /** Every loyalty template, for the advanced picker. */
  templateItems: ReadonlyArray<{ value: string; label: string }>;
  isSaving: boolean;
  isSavingText: boolean;
  onToggle: (enabled: boolean) => void;
  onTemplateChange: (waTemplateId: string | null) => void;
  /** Resolves once the text is saved; the editor closes on success. */
  onSaveText: (body: string) => Promise<unknown>;
  /**
   * Opens the full template editor for an event that has no template yet — a draft is made
   * from this event's starter first, so the merchant lands on a body they can add an image
   * or buttons to.
   */
  onDesign: () => void;
  /** Extra controls under the message — reminder days, the birthday gift. */
  extra?: React.ReactNode;
}

/**
 * One automatic message, the way the setup wizard shows it: what it says, whether it is
 * on, and where it stands with Meta. Two ways to change it: "Edit message" rewrites the
 * words in place and submits them; "Template editor" opens the full WhatsApp editor for
 * an image header, a footer or buttons.
 */
export function EventMessageCard({
  definition,
  trigger,
  template,
  templateItems,
  isSaving,
  isSavingText,
  onToggle,
  onTemplateChange,
  onSaveText,
  onDesign,
  extra,
}: Readonly<EventMessageCardProps>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const body = templateBodyOf(template);
  const hasTemplate = Boolean(trigger?.waTemplateId);
  const richParts = templateHasRichParts(template);
  const editorId = `event-message-${definition.eventType}`;

  const startEditing = () => {
    setDraft(body ?? definition.body);
    setEditing(true);
  };

  const save = async () => {
    if (!draft.trim()) return;
    await onSaveText(draft.trim());
    setEditing(false);
  };

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">{definition.label}</p>
              <LoyaltyTemplateStatusBadge
                status={template?.data?.status}
                hasTemplate={hasTemplate}
                enabled={trigger?.enabled}
                pendingSince={template?.createdAt}
              />
            </div>
            <p className="text-xs text-muted-foreground">{definition.description}</p>
          </div>
          <Switch
            checked={Boolean(trigger?.enabled)}
            onCheckedChange={onToggle}
            disabled={isSaving || !hasTemplate}
            aria-label={definition.label}
          />
        </div>

        {editing ? (
          <div className="flex flex-col gap-2">
            {!body && (
              <p className="text-xs text-muted-foreground">
                {t("This is an example — make it yours, then save.")}
              </p>
            )}
            <EventMessageBodyField
              id={editorId}
              value={draft}
              onChange={setDraft}
              params={definition.params}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
                disabled={isSavingText}
              >
                {t("Cancel")}
              </Button>
              <Button
                size="sm"
                onClick={() => void save()}
                disabled={isSavingText || !draft.trim()}
              >
                {isSavingText ? t("Submitting…") : t("Save and submit to Meta")}
              </Button>
            </div>
          </div>
        ) : body ? (
          <MessageBubble text={body} className="line-clamp-3" />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("Nothing written yet — customers get no message for this.")}
          </p>
        )}

        {!editing && (
          <div className="flex flex-wrap items-center gap-2">
            {!richParts && (
              <Button variant={body ? "outline" : "default"} size="sm" onClick={startEditing}>
                <IconPencil size={14} />
                {body ? t("Edit message") : t("Write it")}
              </Button>
            )}
            {template ? (
              <Button
                variant={richParts ? "default" : "outline"}
                size="sm"
                render={
                  <Link
                    to="/dashboard/loyalty/templates/$templateId"
                    params={{ templateId: template.id }}
                  />
                }
              >
                <IconPhoto size={14} />
                {t("Open in WhatsApp template editor")}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onDesign}>
                <IconPhoto size={14} />
                {t("Design in WhatsApp template editor")}
              </Button>
            )}
            {richParts && (
              <span className="text-xs text-muted-foreground">
                {t("Has an image, footer or buttons — edited in the WhatsApp template editor.")}
              </span>
            )}
            {extra}
            <Collapsible
              open={advancedOpen}
              onOpenChange={setAdvancedOpen}
              className="ml-auto flex flex-col items-end gap-2"
            >
              <CollapsibleTrigger
                render={<Button variant="ghost" size="sm" className="text-muted-foreground" />}
              >
                {t("Advanced")}
                <IconChevronDown
                  size={14}
                  className={
                    advancedOpen ? "rotate-180 transition-transform" : "transition-transform"
                  }
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-wrap items-end gap-2">
                <div className="min-w-56">
                  <p className="mb-1 text-xs text-muted-foreground">{t("Template")}</p>
                  <Select
                    value={trigger?.waTemplateId ?? null}
                    items={templateItems}
                    onValueChange={(value) => onTemplateChange(value)}
                    disabled={isSaving || templateItems.length === 0}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue
                        placeholder={
                          templateItems.length === 0
                            ? t("No loyalty templates yet")
                            : t("Pick a template")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {templateItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {!editing && definition.params.length > 0 && (
          <p className="font-mono text-[11px] text-muted-foreground">
            {variableHint(definition.params)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
