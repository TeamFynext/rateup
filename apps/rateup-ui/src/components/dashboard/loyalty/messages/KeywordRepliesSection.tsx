import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useApplyMessagesStepMutation } from "@/backend/loyalty/onboarding.query";
import type { LoyaltyWaCommand } from "@/backend/loyalty/settings/settings.api";
import {
  useDeleteLoyaltyTemplate,
  useLoyaltyCommands,
} from "@/backend/loyalty/settings/settings.query";
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
import { Textarea } from "@/components/ui/textarea.tsx";
import { useConfirm } from "@/context/confirm-provider";

import { plainTextFromRichText } from "./richText.ts";

/**
 * The inbound keywords the programme answers, and what it says back. These are plain
 * replies — no Meta approval — so they work the moment the programme is live.
 *
 * The five kinds are the ones the inbound handler dispatches; a keyword of another kind
 * would be stored but never answered, so the picker offers only what is missing.
 */
const KEYWORD_KINDS: Array<{ type: string; label: string; hint: string }> = [
  { type: "CustomerRegistration", label: "Join", hint: "Registers the sender and welcomes them." },
  {
    type: "PointInformation",
    label: "Points",
    hint: "Replies with their balance. {{1}} balance · {{2}} redeemed · {{3}} earned.",
  },
  {
    type: "Referral",
    label: "Refer",
    hint: "Sends their referral code and link. {{1}} code · {{2}} link.",
  },
  { type: "RewardsIssued", label: "Rewards", hint: "Lists what they can redeem right now." },
  { type: "CustomerRemoval", label: "Stop", hint: "Removes them from the programme." },
];

export function KeywordRepliesSection() {
  const { t } = useTranslation();
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
  const missing = KEYWORD_KINDS.filter((kind) => !used.has(kind.type));

  const onDelete = async (command: LoyaltyWaCommand) => {
    const ok = await confirm({
      title: t("Remove the “{keyword}” reply?", { keyword: command.requestMessage ?? "" }),
      description: t("Customers who text it will get no answer until you add it back."),
      confirmText: t("Remove"),
    });
    if (ok) remove.mutate(command.id);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("When a customer texts you")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("Plain replies — they work as soon as your program is live. No approval needed.")}
          </p>
        </div>
        {missing.length > 0 && !adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <IconPlus size={14} />
            {t("Add keyword")}
          </Button>
        )}
      </div>

      {isPending && <Skeleton className="h-24 rounded-xl" />}

      <div className="flex flex-col gap-2">
        {(commands ?? []).map((command) =>
          editing === command.id ? (
            <KeywordEditor
              key={command.id}
              type={command.type}
              initialKeyword={command.requestMessage ?? ""}
              initialText={plainTextFromRichText(command.content)}
              isSaving={save.isPending}
              onCancel={() => setEditing(null)}
              onSave={(keyword, text) =>
                save.mutate({
                  commands: [{ type: command.type, requestMessage: keyword, text }],
                  eventTemplates: [],
                })
              }
            />
          ) : (
            <Card key={command.id} className="border-border">
              <CardContent className="flex items-start gap-3 p-4">
                <Badge variant="secondary" className="shrink-0 font-mono">
                  {command.requestMessage}
                </Badge>
                <div className="min-w-0 flex-1">
                  {command.responseType === "Template" ? (
                    <p className="text-sm text-muted-foreground">
                      {t("Replies with an approved WhatsApp template.")}{" "}
                      {command.waTemplateId && (
                        <Link
                          to="/dashboard/loyalty/templates/$templateId"
                          params={{ templateId: command.waTemplateId }}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {t("Open template")}
                        </Link>
                      )}
                    </p>
                  ) : (
                    <p className="whitespace-pre-line text-sm text-foreground">
                      {plainTextFromRichText(command.content) || t("(empty reply)")}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(KEYWORD_KINDS.find((k) => k.type === command.type)?.hint ?? command.type)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {command.responseType !== "Template" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("Edit")}
                      onClick={() => setEditing(command.id)}
                    >
                      <IconPencil size={16} />
                    </Button>
                  )}
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
              </CardContent>
            </Card>
          ),
        )}

        {adding && (
          <KeywordEditor
            kinds={missing}
            isSaving={save.isPending}
            onCancel={() => setAdding(false)}
            onSave={(keyword, text, type) =>
              type &&
              save.mutate({
                commands: [{ type, requestMessage: keyword, text }],
                eventTemplates: [],
              })
            }
          />
        )}

        {!isPending && (commands ?? []).length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">
            {t("No keyword replies yet. Run setup to seed them, or add one.")}
          </p>
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
  isSaving,
  onCancel,
  onSave,
}: Readonly<{
  type?: string;
  kinds?: Array<{ type: string; label: string; hint: string }>;
  initialKeyword?: string;
  initialText?: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (keyword: string, text: string, type?: string) => void;
}>) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<string | undefined>(type ?? kinds?.[0]?.type);
  const [keyword, setKeyword] = useState(initialKeyword || (kinds?.[0]?.label.toLowerCase() ?? ""));
  const [text, setText] = useState(initialText);

  return (
    <Card className="border-primary/30">
      <CardContent className="flex flex-col gap-3 p-4">
        {kinds && (
          <Field>
            <FieldLabel>{t("What it does")}</FieldLabel>
            <Select
              value={kind ?? null}
              items={kinds.map((k) => ({ value: k.type, label: t(k.label) }))}
              onValueChange={(value) => {
                const next = kinds.find((k) => k.type === value);
                setKind(value ?? undefined);
                if (next) setKeyword(next.label.toLowerCase());
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kinds.map((k) => (
                  <SelectItem key={k.type} value={k.type}>
                    {t(k.label)}
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
            <FieldLabel htmlFor="reply">{t("You reply")}</FieldLabel>
            <Textarea
              id="reply"
              rows={3}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <FieldDescription className="text-xs">
              {t(
                kinds?.find((k) => k.type === kind)?.hint ??
                  KEYWORD_KINDS.find((k) => k.type === type)?.hint ??
                  "",
              )}
            </FieldDescription>
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
            {t("Cancel")}
          </Button>
          <Button
            size="sm"
            disabled={isSaving || !keyword.trim() || !text.trim() || (kinds && !kind)}
            onClick={() => onSave(keyword.trim(), text.trim(), kind)}
          >
            {isSaving ? t("Saving…") : t("Save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
