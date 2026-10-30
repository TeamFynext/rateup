import { IconPlayerPlay, IconX } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useChannels } from "@/backend/channels/channels.query";
import type { ChatbotRule } from "@/backend/chatbots/chatbots.api.ts";
import {
  useChatbotRules,
  useToggleChatbotMutation,
  useTurnOnStartRuleMutation,
} from "@/backend/chatbots/chatbots.query.ts";
import { useMessengerProfile } from "@/backend/whatsapp/messenger-profile/messengerProfile.query.ts";
import { getTriggerEventLabel } from "@/components/dashboard/automation/components/schema.ts";
import { TriggerSetupPrompt } from "@/components/dashboard/chatbots/TriggerSetupPrompt.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { AutomationPlatform } from "@/types/platform.ts";

/**
 * Says how this chatbot starts, in the editor. The wizard makes its rule switched off; while
 * every rule that starts it is off, this card asks for what is missing (a keyword) and
 * switches the rule on. With no rule at all, the wizard's set-up prompt shows instead.
 */
export function ChatbotStartPanel({
  chatbotId,
  platform,
  isActive = true,
}: Readonly<{
  chatbotId: string;
  platform: AutomationPlatform;
  isActive?: boolean;
}>) {
  const { data: rules, isPending, isError } = useChatbotRules(chatbotId);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  // Switched off on the Chatbots page: say so first, whatever its rules.
  if (!isActive)
    return <ChatbotOffCard chatbotId={chatbotId} onDismiss={() => setDismissed(true)} />;
  if (isPending || isError) return null;
  if (rules.length === 0) return <TriggerSetupPrompt platform={platform} />;
  if (rules.some((rule) => rule.isActive)) return null;

  return (
    <RuleOffCard
      chatbotId={chatbotId}
      platform={platform}
      rule={rules[0]!}
      onDismiss={() => setDismissed(true)}
    />
  );
}

/**
 * What the API's Get Started rule answers when the Page has no button of its own yet; the
 * API's `DEFAULT_GET_STARTED_PAYLOAD` in chatbotStart.ts.
 */
const DEFAULT_GET_STARTED_PAYLOAD = "GET_STARTED";

/** A keyword rule the wizard made, still waiting for its keyword. */
export function needsKeyword(rule: ChatbotRule) {
  return (
    rule.triggerEvent === "MESSAGE_RECEIVED" &&
    rule.keywords.length === 1 &&
    !rule.keywords[0]!.trim()
  );
}

function RuleOffCard({
  chatbotId,
  platform,
  rule,
  onDismiss,
}: Readonly<{
  chatbotId: string;
  platform: AutomationPlatform;
  rule: ChatbotRule;
  onDismiss: () => void;
}>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const turnOn = useTurnOnStartRuleMutation(chatbotId);
  const [keyword, setKeyword] = useState("");

  const askKeyword = needsKeyword(rule);

  // A Get Started rule made for a Page with no button yet answers the default payload. If the
  // Page still has no Get Started button, switching on adds one that sends it. Read from the
  // rule, not the wizard's params, so it works on any later visit too.
  const isGetStarted =
    platform === AutomationPlatform.FACEBOOK &&
    rule.triggerEvent === "MESSAGE_RECEIVED" &&
    rule.keywords.includes(DEFAULT_GET_STARTED_PAYLOAD);
  const { data: channels } = useChannels();
  const page = isGetStarted
    ? channels?.find(
        (channel) => channel.platform === "FACEBOOK" && channel.accountId === rule.accountIds[0],
      )
    : undefined;
  const { data: profile } = useMessengerProfile(page?.id);
  const addGetStarted = Boolean(page && profile && !profile.getStarted);

  const switchOn = () => {
    turnOn.mutate(
      {
        ruleId: rule.id,
        platform,
        ...(askKeyword && { keyword }),
        ...(addGetStarted &&
          page && {
            getStarted: {
              channelId: page.id,
              payload: DEFAULT_GET_STARTED_PAYLOAD,
            },
          }),
      },
      {
        // The wizard's params have done their job; they would only bring the prompt back.
        onSuccess: () => void navigate({ to: ".", search: {}, replace: true }),
      },
    );
  };

  const message = askKeyword
    ? t("Type the keyword that starts it, then switch it on.")
    : addGetStarted
      ? t("Switching it on also adds a Get Started button to your Page.")
      : t("Finish the messages, then switch on the rule that starts it.");

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex w-[min(34rem,calc(100%-2rem))] -translate-x-1/2 items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-lg">
      <IconPlayerPlay className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="text-sm font-semibold text-foreground">{t("This chatbot is off")}</div>
        <p className="text-sm text-muted-foreground">{message}</p>
        <p className="truncate text-xs text-muted-foreground">
          {t("Rule")}: {rule.name} · {t(getTriggerEventLabel(rule.triggerEvent))}
        </p>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            switchOn();
          }}
        >
          {askKeyword && (
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={t("Keyword, e.g. menu")}
              aria-label={t("Keyword")}
              className="h-8 w-44"
              maxLength={100}
            />
          )}
          <Button
            type="submit"
            size="sm"
            loading={turnOn.isPending}
            disabled={askKeyword && !keyword.trim()}
          >
            {t("Switch on")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            render={
              <Link to="/dashboard/automation/$automationId" params={{ automationId: rule.id }} />
            }
          >
            {t("Edit rule")}
          </Button>
        </form>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        aria-label={t("Dismiss")}
        onClick={onDismiss}
      >
        <IconX className="size-4" />
      </Button>
    </div>
  );
}

/** The chatbot itself is off: nothing but the inbox starts it until it is switched on. */
function ChatbotOffCard({
  chatbotId,
  onDismiss,
}: Readonly<{ chatbotId: string; onDismiss: () => void }>) {
  const { t } = useTranslation();
  const toggle = useToggleChatbotMutation();
  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex w-[min(34rem,calc(100%-2rem))] -translate-x-1/2 items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-lg">
      <IconPlayerPlay className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="text-sm font-semibold text-foreground">
          {t("This chatbot is switched off")}
        </div>
        <p className="text-sm text-muted-foreground">
          {t("Rules, lead ads and the inbox won't start it. Switch it on to use it again.")}
        </p>
        <div>
          <Button
            size="sm"
            loading={toggle.isPending}
            onClick={() => toggle.mutate({ id: chatbotId, isActive: true })}
          >
            {t("Switch on")}
          </Button>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        aria-label={t("Dismiss")}
        onClick={onDismiss}
      >
        <IconX className="size-4" />
      </Button>
    </div>
  );
}
