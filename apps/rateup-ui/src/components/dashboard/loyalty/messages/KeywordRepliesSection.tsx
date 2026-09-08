import { IconPencil, IconPlus, IconRefresh, IconSparkles, IconTrash } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useApplyMessagesStepMutation } from "@/backend/loyalty/onboarding.query";
import type { LoyaltyWaCommand } from "@/backend/loyalty/settings/settings.api";
import {
  useDeleteLoyaltyTemplate,
  useLoyaltyCommands,
} from "@/backend/loyalty/settings/settings.query";
import type { WaTemplateListEntry } from "@/backend/whatsapp/whatsapp.api";
import { SectionHeading } from "@/components/common/page-heading.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useConfirm } from "@/context/confirm-provider";

import {
  loyaltyKeywordCatalog,
  messageVariables,
  variableHint,
  type LoyaltyKeywordDefinition,
  type LoyaltyMessageDefinition,
} from "./loyaltyMessageCatalog.ts";
import { LoyaltyTemplateStatusBadge } from "./LoyaltyTemplateStatusBadge.tsx";
import { MessageBodyEditor } from "./MessageBodyEditor.tsx";
import { MessageBubble } from "./MessageBubble.tsx";
import { plainTextFromRichText } from "./richText.ts";

const NO_TEMPLATE = "__none__";
const JOIN_TYPE = "CustomerRegistration";

interface KeywordRepliesSectionProps {
  /** The loyalty templates a reply may fall back to for customers who never messaged. */
  templates: WaTemplateListEntry[];
  /** The welcome as the programme would write it today; offered on the join reply. */
  suggestedJoinText?: string;
  /** Seeds the five standard replies from the preset, for a programme with none. */
  onSeed?: () => void;
  seeding?: boolean;
  onCreateTemplate?: (definition: LoyaltyMessageDefinition) => void;
}

/**
 * The inbound keywords the programme answers, and what it says back. The text is what
 * goes out — the customer has just messaged, so the window is open and plain text is free.
 * A template, when attached, only matters for someone who has never messaged (a till
 * registration) and so cannot be reached with text.
 *
 * The kinds come from the shared catalog: the picker offers only the ones still missing,
 * and the wizard's Messages step names its cards from the same list.
 */
export function KeywordRepliesSection({
  templates,
  suggestedJoinText,
  onSeed,
  seeding = false,
  onCreateTemplate,
}: Readonly<KeywordRepliesSectionProps>) {
  const { t } = useTranslation();
  const kinds = loyaltyKeywordCatalog(t);
  const confirm = useConfirm();
  const { data: commands, isPending } = useLoyaltyCommands();
  const remove = useDeleteLoyaltyTemplate();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const save = useApplyMessagesStepMutation((result) => {
    if (result.skipped.length > 0) {
      toast.error(
        t("“{keyword}” is already in use elsewhere in your inbox.", {
          keyword: result.skipped[0].requestMessage,
        }),
      );
      return;
    }
    toast.success(t("Saved"));
    setEditing(null);
    setAdding(false);
  });

  const used = new Set((commands ?? []).map((command) => command.type));
  const missing = kinds.filter((kind) => !used.has(kind.type));
  const templateById = new Map(templates.map((entry) => [entry.id, entry]));
  const templateItems = [
    { value: NO_TEMPLATE, label: t("None — text only") },
    ...templates.map((entry) => ({ value: entry.id, label: entry.data?.name ?? entry.id })),
  ];

  const onDelete = async (command: LoyaltyWaCommand) => {
    const ok = await confirm({
      title: t("Remove the “{keyword}” reply?", { keyword: command.requestMessage ?? "" }),
      description: t("Customers who text it will get no answer until you add it back."),
      confirmText: t("Remove"),
    });
    if (ok) remove.mutate(command.id);
  };

  const submit = (type: string, keyword: string, text: string, waTemplateId: string | null) =>
    save.mutate({
      commands: [{ type, requestMessage: keyword, text, waTemplateId }],
      eventTemplates: [],
    });

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        title={t("When a customer texts you")}
        hint={t("Plain replies — they work the moment your program is live. No approval needed.")}
        actions={
          missing.length > 0 && !adding ? (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <IconPlus size={14} />
              {t("Add keyword")}
            </Button>
          ) : undefined
        }
      />

      {isPending && <Skeleton className="h-24 rounded-xl" />}

      <div className="flex flex-col gap-2">
        {(commands ?? []).map((command) => {
          const kind = kinds.find((k) => k.type === command.type);
          const template = command.waTemplateId
            ? templateById.get(command.waTemplateId)
            : undefined;
          const text = plainTextFromRichText(command.content);
          return editing === command.id ? (
            <KeywordEditor
              key={command.id}
              type={command.type}
              initialKeyword={command.requestMessage ?? ""}
              initialText={text}
              initialTemplateId={command.waTemplateId}
              templateItems={templateItems}
              suggestedText={command.type === JOIN_TYPE ? suggestedJoinText : undefined}
              isSaving={save.isPending}
              onCancel={() => setEditing(null)}
              onSave={(keyword, body, waTemplateId) =>
                submit(command.type, keyword, body, waTemplateId)
              }
            />
          ) : (
            <Card key={command.id} className="border-border">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {kind?.label ?? command.type}
                      </p>
                      <Badge variant="secondary" className="font-mono">
                        {command.requestMessage}
                      </Badge>
                      {command.waTemplateId && (
                        <LoyaltyTemplateStatusBadge
                          status={template?.data?.status}
                          pendingSince={template?.createdAt}
                        />
                      )}
                    </div>
                    {kind && <p className="text-xs text-muted-foreground">{kind.description}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("Edit")}
                      onClick={() => setEditing(command.id)}
                    >
                      <IconPencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("Remove")}
                      onClick={() => void onDelete(command)}
                      disabled={remove.isPending}
                    >
                      <IconTrash size={16} />
                    </Button>
                  </div>
                </div>
                {text ? (
                  <MessageBubble text={text} />
                ) : (
                  <p className="text-sm text-muted-foreground">{t("(empty reply)")}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {command.waTemplateId && template ? (
                    <>
                      {t("Customers who have never messaged you get the template instead.")}{" "}
                      <Link
                        to="/dashboard/loyalty/templates/$templateId"
                        params={{ templateId: command.waTemplateId }}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {t("Open template")}
                      </Link>
                    </>
                  ) : (
                    <>
                      {t("Only reaches customers who have messaged you in the last 24 hours.")}{" "}
                      {kind && onCreateTemplate && (
                        <button
                          type="button"
                          className="font-medium text-primary underline-offset-4 hover:underline"
                          onClick={() => onCreateTemplate(kind)}
                        >
                          {t("Create a template for the rest")}
                        </button>
                      )}
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          );
        })}

        {adding && (
          <KeywordEditor
            kinds={missing}
            templateItems={templateItems}
            suggestedText={suggestedJoinText}
            isSaving={save.isPending}
            onCancel={() => setAdding(false)}
            onSave={(keyword, body, waTemplateId, type) =>
              type && submit(type, keyword, body, waTemplateId)
            }
          />
        )}

        {!isPending && (commands ?? []).length === 0 && !adding && (
          <Card className="border-dashed border-border">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{t("No keyword replies yet")}</p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Join, points, rewards, refer and stop — written for your program, editable afterwards.",
                  )}
                </p>
              </div>
              {onSeed && (
                <Button size="sm" onClick={onSeed} disabled={seeding}>
                  <IconSparkles size={14} />
                  {seeding ? t("Saving…") : t("Add the standard replies")}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

function KeywordEditor({
  type,
  kinds,
  initialKeyword = "",
  initialText = "",
  initialTemplateId = null,
  templateItems,
  suggestedText,
  isSaving,
  onCancel,
  onSave,
}: Readonly<{
  type?: string;
  /** The kinds still free to pick from. Absent when editing an existing reply. */
  kinds?: LoyaltyKeywordDefinition[];
  initialKeyword?: string;
  initialText?: string;
  initialTemplateId?: string | null;
  templateItems: ReadonlyArray<{ value: string; label: string }>;
  /** What the programme would write for the join reply today. */
  suggestedText?: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (keyword: string, text: string, waTemplateId: string | null, type?: string) => void;
}>) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<string | undefined>(type ?? kinds?.[0]?.type);
  const [keyword, setKeyword] = useState(initialKeyword || (kinds?.[0]?.keyword ?? ""));
  const [text, setText] = useState(initialText);
  const [templateId, setTemplateId] = useState<string>(initialTemplateId ?? NO_TEMPLATE);
  const definition = loyaltyKeywordDefinitionFor(t, kinds, kind ?? type);
  const rewritable = (kind ?? type) === JOIN_TYPE && Boolean(suggestedText);

  return (
    <Card className="border-primary/30">
      <CardContent className="flex flex-col gap-3 p-4">
        {kinds && (
          <Field>
            <FieldLabel>{t("What it does")}</FieldLabel>
            <Select
              value={kind ?? null}
              items={kinds.map((k) => ({ value: k.type, label: k.label }))}
              onValueChange={(value) => {
                const next = kinds.find((k) => k.type === value);
                setKind(value ?? undefined);
                if (next) setKeyword(next.keyword);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kinds.map((k) => (
                  <SelectItem key={k.type} value={k.type}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
          <Field>
            <FieldLabel htmlFor="keyword">{t("They text")}</FieldLabel>
            <Input
              id="keyword"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="font-mono"
            />
          </Field>
          <Field>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="reply">{t("You reply")}</FieldLabel>
              {rewritable && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  onClick={() => setText(suggestedText ?? "")}
                >
                  <IconRefresh size={13} />
                  {t("Write it from my program")}
                </Button>
              )}
            </div>
            <MessageBodyEditor
              id="reply"
              value={text}
              onChange={setText}
              variables={definition ? messageVariables(definition.params) : undefined}
            />
            <FieldDescription className="text-xs">
              {definition?.description}
              {definition && definition.params.length > 0 && (
                <>
                  {" "}
                  <span className="font-mono">{variableHint(definition.params)}</span>
                </>
              )}
            </FieldDescription>
          </Field>
        </div>
        <Field>
          <FieldLabel>{t("Template for customers who haven't messaged yet")}</FieldLabel>
          <Select
            value={templateId}
            items={templateItems}
            onValueChange={(value) => setTemplateId(value ?? NO_TEMPLATE)}
          >
            <SelectTrigger className="h-9 sm:max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templateItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription className="text-xs">
            {t(
              "Plain text only reaches someone who has messaged you in the last 24 hours. A template reaches everyone else — a customer registered at the till, say.",
            )}
          </FieldDescription>
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
            {t("Cancel")}
          </Button>
          <Button
            size="sm"
            disabled={isSaving || !keyword.trim() || !text.trim() || (kinds && !kind)}
            onClick={() =>
              onSave(
                keyword.trim(),
                text.trim(),
                templateId === NO_TEMPLATE ? null : templateId,
                kind,
              )
            }
          >
            {isSaving ? t("Saving…") : t("Save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** The kind being edited, whether it was picked from the list or came in fixed. */
function loyaltyKeywordDefinitionFor(
  t: TFunction,
  kinds: LoyaltyKeywordDefinition[] | undefined,
  type: string | undefined,
): LoyaltyKeywordDefinition | undefined {
  if (!type) return undefined;
  return (kinds ?? loyaltyKeywordCatalog(t)).find((kind) => kind.type === type);
}
