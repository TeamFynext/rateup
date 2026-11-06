import { IconBolt, IconX } from "@tabler/icons-react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { findExample, findTrigger } from "@/config/chatbotExamples/index.ts";
import type { AutomationPlatform } from "@/types/platform.ts";

/** The rule builder's platform values are the API's, upper-case. */
const RULE_PLATFORM = {
  whatsapp: "WHATSAPP",
  instagram: "INSTAGRAM",
  facebook: "FACEBOOK",
} as const;

/**
 * Shown once in the editor of a chatbot the wizard just made: a chatbot does nothing until
 * something starts it. The wizard sends `?trigger=` (the "How it starts" choice), `?example=`
 * and, when an account was picked, `?channel=`; acting on the prompt or dismissing it drops
 * them, so it does not come back.
 */
export function TriggerSetupPrompt({ platform }: Readonly<{ platform: AutomationPlatform }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const example = findExample(typeof search.example === "string" ? search.example : undefined);
  const channel = typeof search.channel === "string" ? search.channel : undefined;
  const chosen = typeof search.trigger === "string" ? search.trigger : example?.trigger;
  const trigger = findTrigger(platform, chosen);

  if (!trigger) return null;

  const dismiss = () => {
    void navigate({ to: ".", search: {}, replace: true });
  };

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-lg">
      <IconBolt className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="text-sm font-semibold text-foreground">{t("Set up the trigger")}</div>
        <p className="text-sm text-muted-foreground">{t(trigger.hint)}</p>
        {trigger.triggerEvent && (
          <div>
            <Button
              size="sm"
              render={
                <Link
                  to="/dashboard/automation/rules/$ruleId"
                  params={{ ruleId: "new" }}
                  search={{
                    platform: RULE_PLATFORM[platform],
                    triggerEvent: trigger.triggerEvent,
                    ...(channel && { channel }),
                  }}
                />
              }
            >
              {t("Create the rule")}
            </Button>
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        aria-label={t("Dismiss")}
        onClick={dismiss}
      >
        <IconX className="size-4" />
      </Button>
    </div>
  );
}
