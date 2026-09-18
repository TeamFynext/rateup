import { IconArrowBackUp, IconChevronDown, IconPencil, IconPhoto } from "@tabler/icons-react";
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
import {
  templateBodyProblem,
  variableHint,
  type LoyaltyEventDefinition,
} from "./loyaltyMessageCatalog.ts";
import { LoyaltyTemplateStatusBadge } from "./LoyaltyTemplateStatusBadge.tsx";
import { MessageBubble } from "./MessageBubble.tsx";
import { quickReplyLabelOf, templateBodyOf, templateHasRichParts } from "./templateUsage.ts";

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
  /** Extra controls under the message — reminder days, the birthday gift. */
  extra?: React.ReactNode;
}

/**
 * One automatic message, the way the setup wizard shows it: what it says, whether it is
 * on, and where it stands with Meta. Two ways to change it: "Edit message" rewrites the
 * words in place and submits them; "Open in WhatsApp template editor" opens the full
 * WhatsApp editor for an image header, a footer or buttons, and for saving as a draft or
 * publishing to Meta.
 *
 * That second one is a link either way. With a template it opens that template — a draft
 * the merchant saved and never submitted included. Without one it opens the editor on this
 * message's starter, and nothing is stored until they save there.
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
  extra,
}: Readonly<EventMessageCardProps>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const body = templateBodyOf(template);
  // The resolved template, not the trigger's own column: a template made in the editor is
  // matched back to this message by name, and it can be switched on before anything has
  // written that link onto the trigger.
  const hasTemplate = Boolean(template);
  const richParts = templateHasRichParts(template, { ownButton: definition.joinButton });
  const editorId = `event-message-${definition.eventType}`;

  const startEditing = () => {
    setDraft(body ?? definition.body);
    setEditing(true);
  };

  // This button submits to Meta, and a refusal comes back minutes later as a rejected
  // template. Saying so here costs one line and saves that round trip.
  const problem = editing ? templateBodyProblem(draft, t) : null;

  const save = async () => {
    if (!draft.trim() || problem) return;
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
              invalid={Boolean(problem)}
              error={problem ? { message: problem } : undefined}
            />
            {definition.joinButton && (
              <p className="text-xs text-muted-foreground">
                {t(
                  "The Join button is added for you, named after your join keyword. Tapping it signs the customer up.",
                )}
              </p>
            )}
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
                disabled={isSavingText || !draft.trim() || Boolean(problem)}
              >
                {isSavingText ? t("Submitting…") : t("Save and submit to Meta")}
              </Button>
            </div>
          </div>
        ) : body ? (
          <div className="flex flex-col gap-1">
            <MessageBubble text={body} className="line-clamp-3" />
            {definition.joinButton && (
              <JoinButtonPreview label={quickReplyLabelOf(template) ?? t("Join")} />
            )}
          </div>
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
            <Button
              variant={richParts ? "default" : "outline"}
              size="sm"
              render={
                template ? (
                  <Link
                    to="/dashboard/loyalty/templates/$templateId"
                    params={{ templateId: template.id }}
                    search={{ starter: undefined }}
                  />
                ) : (
                  <Link
                    to="/dashboard/loyalty/templates/$templateId"
                    params={{ templateId: "create" }}
                    search={{ starter: definition.templateName }}
                  />
                )
              }
            >
              <IconPhoto size={14} />
              {t("Open in WhatsApp template editor")}
            </Button>
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

/** The quick reply as WhatsApp draws it under the message bubble. */
function JoinButtonPreview({ label }: Readonly<{ label: string }>) {
  return (
    <span className="flex items-center justify-center gap-1.5 rounded-lg bg-muted/60 px-3 py-1.5 text-sm font-medium text-primary">
      <IconArrowBackUp size={14} />
      {label}
    </span>
  );
}
