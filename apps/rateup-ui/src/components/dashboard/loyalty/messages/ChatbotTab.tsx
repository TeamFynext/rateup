import {
  IconAlertTriangle,
  IconCheck,
  IconExternalLink,
  IconMessageCircle,
  IconRobot,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useLoyaltyProgram } from "@/backend/loyalty/program.query";
import { useLoyaltyCommands } from "@/backend/loyalty/settings/settings.query";
import {
  useAllWaAutomatedReplies,
  useCreateWaAutomatedReplyMutation,
  useUpdateWaAutomatedReplyMutation,
} from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useCreateRuleMutation, useRules } from "@/backend/whatsapp/rule/rule.query";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { WaAutomatedReply } from "@/types/global";

import { LOYALTY_PATHS } from "../paths.ts";
import {
  findLoyaltyChatbot,
  findMenuRule,
  loyaltyChatbotPayload,
  loyaltyMenuGraph,
  loyaltyMenuPlan,
  loyaltyMenuRule,
  MENU_MAX_ROWS,
  MENU_ROW_TITLE_MAX,
  menuDrift,
  menuRowTitles,
  ruleTriggerWords,
  withMenuRows,
  type LoyaltyMenuEntry,
} from "./loyaltyChatbot.ts";
import { loyaltyMessageCatalog } from "./loyaltyMessageCatalog.ts";

const DEFAULT_TRIGGER_WORD = "menu";

/**
 * The keyword replies, as one tappable WhatsApp menu.
 *
 * The programme already answers POINTS, REWARDS and the rest — but only for a customer who
 * knows to type them. This builds a chatbot in WhatsApp › Chatbot that lists them instead,
 * and a rule so that texting one word opens it. Tapping a row sends that row's keyword, so
 * the reply that comes back is the real one, computed live; nothing about the answers moves
 * here. See `loyaltyChatbot.ts` for why that works.
 */
export function ChatbotTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: program } = useLoyaltyProgram();
  const { data: commands = [], isPending: commandsPending } = useLoyaltyCommands();
  const { data: automations = [], isPending: botsPending } = useAllWaAutomatedReplies();
  const { data: rules = [] } = useRules();

  const createBot = useCreateWaAutomatedReplyMutation();
  const updateBot = useUpdateWaAutomatedReplyMutation();
  const createRule = useCreateRuleMutation();

  const [triggerWord, setTriggerWord] = useState(DEFAULT_TRIGGER_WORD);
  const [accountId, setAccountId] = useState("");

  const catalog = useMemo(() => loyaltyMessageCatalog(t), [t]);
  const plan = useMemo(() => loyaltyMenuPlan(commands, catalog), [commands, catalog]);

  /**
   * A trigger word that is also a keyword never opens the menu: the loyalty handler
   * answers it first (`wasurvey.controller.ts` looks the command up before automations),
   * and the API refuses a loyalty keyword already claimed by an automation. Cheaper to
   * say here than to debug as a menu that silently never appears.
   */
  const triggerClash = commands.some(
    (command) =>
      command.requestMessage?.trim().toLowerCase() === triggerWord.trim().toLowerCase() &&
      Boolean(triggerWord.trim()),
  );

  const chatbot = findLoyaltyChatbot(automations);
  const rule = findMenuRule(rules, chatbot?.id);
  const triggerWords = ruleTriggerWords(rule);
  const drift = useMemo(
    () => menuDrift(chatbot?.matchData?.json, plan.entries),
    [chatbot, plan.entries],
  );

  const copy = {
    header: program?.name ?? t("Rewards"),
    body: t("What would you like to do?"),
    button: t("Open menu"),
    sectionTitle: t("Your rewards"),
  };
  const botName = t("{program} menu", { program: program?.name ?? t("Loyalty") });

  /** Both creates need a word and an account; the rule endpoint refuses either missing. */
  const missingInput = () => {
    if (!triggerWord.trim()) {
      toast.error(t("Give the menu a trigger word first."));
      return true;
    }
    if (!accountId) {
      toast.error(t("Pick a WhatsApp account first."));
      return true;
    }
    if (triggerClash) return true;
    return false;
  };

  const create = () => {
    if (missingInput()) return;
    const word = triggerWord.trim();
    const graph = loyaltyMenuGraph(plan.entries, copy);
    createBot.mutate(
      loyaltyChatbotPayload({ name: botName, graph, whatsappSettingsPhoneId: accountId || null }),
      {
        onSuccess: (created: WaAutomatedReply) => {
          // The rule is what makes the menu reachable, so a failure here is worth saying
          // out loud — the chatbot itself is already saved and the tab will show it.
          createRule.mutate(
            loyaltyMenuRule({
              name: botName,
              chatbotId: created.id,
              triggerWord: word,
              whatsappSettingsPhoneIds: [accountId],
            }),
            {
              onSuccess: () =>
                toast.success(
                  t("Customers can text {word} to open the menu.", { word: word.toUpperCase() }),
                ),
            },
          );
        },
      },
    );
  };

  const addTrigger = () => {
    if (!chatbot || missingInput()) return;
    createRule.mutate(
      loyaltyMenuRule({
        name: botName,
        chatbotId: chatbot.id,
        triggerWord: triggerWord.trim(),
        whatsappSettingsPhoneIds: [accountId],
      }),
    );
  };

  const updateMenu = () => {
    if (!chatbot?.matchData?.json) return;
    updateBot.mutate(
      {
        id: chatbot.id,
        name: chatbot.name,
        platform: chatbot.platform,
        whatsappSettingsPhoneId: chatbot.whatsappSettingsPhoneId,
        matchData: {
          ...chatbot.matchData,
          json: withMenuRows(chatbot.matchData.json, plan.entries, copy.sectionTitle),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["allWaAutomatedReplies"] });
          toast.success(t("Menu updated."));
        },
      },
    );
  };

  if (commandsPending || botsPending) return <Skeleton className="h-64 rounded-xl" />;

  if (plan.entries.length === 0) {
    return (
      <Alert>
        <IconMessageCircle />
        <AlertTitle>{t("No keyword replies yet")}</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center gap-3">
          <span>{t("The menu is built from the keywords on Replies. Write one there first.")}</span>
          <Button
            size="sm"
            variant="outline"
            render={<Link to={LOYALTY_PATHS.messages} search={{ tab: "replies" }} />}
          >
            {t("Go to Replies")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-foreground">
            {t("One menu, so customers do not have to know the words")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(
              "Every keyword below becomes a row customers can tap. Tapping one sends that keyword, so the reply is the same one they get by typing it — balances and codes and all.",
            )}
          </p>
        </div>

        {chatbot ? (
          <Card className="border-border">
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <IconRobot size={16} className="text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{chatbot.name}</p>
                  <Badge
                    variant="secondary"
                    className="bg-green-600/10 text-green-700 dark:text-green-500"
                  >
                    <IconCheck size={12} /> {t("Created")}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <Link
                      to="/dashboard/whatsapp/flowbots/$flowbotId"
                      params={{ flowbotId: chatbot.id }}
                    />
                  }
                >
                  <IconExternalLink size={14} />
                  {t("Open in flow editor")}
                </Button>
              </div>

              {triggerWords.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("Customers open it by texting {words}.", {
                    words: triggerWords.map((word) => word.toUpperCase()).join(", "),
                  })}
                  {rule?.isActive === false && ` ${t("That rule is switched off.")}`}
                </p>
              ) : (
                <Alert>
                  <IconAlertTriangle />
                  <AlertTitle>{t("Nothing opens this menu yet")}</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3">
                    <span className="text-xs">
                      {t("Pick a word customers can text to bring it up.")}
                    </span>
                    <div className="flex flex-wrap items-end gap-3">
                      <TriggerFields
                        triggerWord={triggerWord}
                        onTriggerWordChange={setTriggerWord}
                        accountId={accountId}
                        onAccountChange={setAccountId}
                        clash={triggerClash}
                      />
                      <Button
                        size="sm"
                        onClick={addTrigger}
                        disabled={createRule.isPending || triggerClash}
                      >
                        {createRule.isPending ? t("Adding…") : t("Add trigger word")}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {drift.missing.length > 0 || drift.stale.length > 0 ? (
                <Alert>
                  <IconAlertTriangle />
                  <AlertTitle>{t("The menu is behind your keywords")}</AlertTitle>
                  <AlertDescription className="flex flex-wrap items-center gap-3">
                    <span className="text-xs">
                      {drift.missing.length > 0 &&
                        t("Not in the menu: {words}.", {
                          words: drift.missing.map((entry) => entry.keyword).join(", "),
                        })}{" "}
                      {drift.stale.length > 0 &&
                        t("No longer answered: {words}.", { words: drift.stale.join(", ") })}
                    </span>
                    <Button size="sm" onClick={updateMenu} disabled={updateBot.isPending}>
                      {updateBot.isPending ? t("Updating…") : t("Update the menu")}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <IconCheck size={13} />
                  {t("The menu matches your keywords.")}
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardContent className="flex flex-col gap-4 p-4">
              <div className="flex flex-wrap items-end gap-3">
                <TriggerFields
                  triggerWord={triggerWord}
                  onTriggerWordChange={setTriggerWord}
                  accountId={accountId}
                  onAccountChange={setAccountId}
                  clash={triggerClash}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={create}
                  disabled={createBot.isPending || createRule.isPending || triggerClash}
                >
                  <IconRobot size={16} />
                  {createBot.isPending || createRule.isPending
                    ? t("Creating…")
                    : t("Create the chatbot")}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {t("Adds a chatbot under WhatsApp › Chatbot, and a rule that opens it.")}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {plan.excluded.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {plan.excluded.some((item) => item.reason === "too_long") &&
              t(
                "Left out because a menu row cannot be longer than {max} characters: {words}. Shorten the keyword on Replies to include it.",
                {
                  max: MENU_ROW_TITLE_MAX,
                  words: plan.excluded
                    .filter((item) => item.reason === "too_long")
                    .map((item) => item.keyword)
                    .join(", "),
                },
              )}{" "}
            {plan.excluded.some((item) => item.reason === "over_limit") &&
              t("WhatsApp allows {max} rows, so these did not fit: {words}.", {
                max: MENU_MAX_ROWS,
                words: plan.excluded
                  .filter((item) => item.reason === "over_limit")
                  .map((item) => item.keyword)
                  .join(", "),
              })}
          </p>
        )}
      </div>

      <MenuPreview
        title={copy.header}
        body={copy.body}
        button={copy.button}
        sectionTitle={copy.sectionTitle}
        entries={plan.entries}
        savedRows={chatbot ? menuRowTitles(chatbot.matchData?.json) : undefined}
      />
    </div>
  );
}

/**
 * What the rule needs: the word that opens the menu, and the number it listens on. Both
 * creates go through here, because the rule endpoint refuses a rule with no account.
 */
function TriggerFields({
  triggerWord,
  onTriggerWordChange,
  accountId,
  onAccountChange,
  clash,
}: Readonly<{
  triggerWord: string;
  onTriggerWordChange: (value: string) => void;
  accountId: string;
  onAccountChange: (value: string) => void;
  /** The word is one of the programme's own keywords, which answers it before the menu can. */
  clash: boolean;
}>) {
  const { t } = useTranslation();
  return (
    <>
      <Field className="w-56" data-invalid={clash || undefined}>
        <FieldLabel htmlFor="loyalty-menu-trigger">{t("Trigger word")}</FieldLabel>
        <Input
          id="loyalty-menu-trigger"
          value={triggerWord}
          onChange={(event) => onTriggerWordChange(event.target.value)}
          placeholder={DEFAULT_TRIGGER_WORD}
          aria-invalid={clash}
        />
        {clash ? (
          <FieldError>
            {t("That word is already one of your keyword replies, so it answers on its own.")}
          </FieldError>
        ) : (
          <FieldDescription>
            {t("Texting this exact word opens the menu. It cannot be one of the keywords below.")}
          </FieldDescription>
        )}
      </Field>
      <div className="w-56">
        <AccountSelector
          value={accountId}
          onChange={(value) => onAccountChange(value ?? "")}
          label={t("WhatsApp account")}
          withAllOption={false}
          optional={false}
        />
      </div>
    </>
  );
}

/** What the customer sees — the list as WhatsApp renders it. */
function MenuPreview({
  title,
  body,
  button,
  sectionTitle,
  entries,
  savedRows,
}: Readonly<{
  title: string;
  body: string;
  button: string;
  sectionTitle: string;
  entries: readonly LoyaltyMenuEntry[];
  /** The rows the saved bot carries, when there is one; rows only in the plan are marked. */
  savedRows?: string[];
}>) {
  const { t } = useTranslation();
  const saved = savedRows && new Set(savedRows.map((row) => row.toLowerCase()));
  return (
    <div className="w-full shrink-0 lg:w-80">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{t("What customers see")}</p>
      <div className="rounded-xl border border-border bg-muted/30 p-3">
        <div className="rounded-lg bg-card p-3 shadow-sm">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-foreground">{body}</p>
          <div className="mt-3 rounded-md border border-border">
            <p className="border-b border-border px-3 py-2 text-center text-xs font-medium text-primary">
              ☰ {button}
            </p>
            <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {sectionTitle}
            </p>
            <ul className="flex flex-col divide-y divide-border">
              {entries.map((entry) => (
                <li key={entry.keyword} className="flex items-start gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{entry.keyword}</p>
                    {entry.description && (
                      <p className="truncate text-xs text-muted-foreground">{entry.description}</p>
                    )}
                  </div>
                  {saved && !saved.has(entry.keyword.toLowerCase()) && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {t("New")}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
