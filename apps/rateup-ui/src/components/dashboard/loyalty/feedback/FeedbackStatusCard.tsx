import { IconChartBar, IconEdit, IconLoader2, IconRefresh, IconSend } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { FeedbackState } from "@/backend/loyalty/feedback.api.ts";
import {
  useResetFeedbackMutation,
  useSubmitFeedbackFlowMutation,
  useUpdateFeedbackSettingsMutation,
} from "@/backend/loyalty/feedback.query.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { WaFlowStatus } from "@/types/enums.ts";

import { canEnableFeedback, feedbackTone } from "./feedbackStatus.ts";
import { FeedbackStatusBadge } from "./FeedbackStatusBadge.tsx";

/**
 * Where the flow stands and what to do next: submit it, edit its questions while it is
 * still a draft, switch sending on once Meta has approved everything, or start over.
 */
export function FeedbackStatusCard({
  state,
  onViewResults,
}: Readonly<{ state: FeedbackState; onViewResults: () => void }>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const submit = useSubmitFeedbackFlowMutation();
  const reset = useResetFeedbackMutation();
  const update = useUpdateFeedbackSettingsMutation();

  const { flow, template, setting, team, reward, counts } = state;
  if (!flow || !setting) return null;

  const tone = feedbackTone(flow, template, setting.enabled);
  const isDraft = flow.status === WaFlowStatus.DRAFT;
  const needsSubmit = isDraft || flow.pendingSave;
  const enableable = canEnableFeedback(flow, template);

  const onSubmit = async () => {
    const ok = await confirm({
      title: t("Submit the flow to Meta?"),
      description: t(
        "The survey is published and a message template is sent to Meta for approval. Once published, the questions can no longer be edited — you would start over with a new draft.",
      ),
      confirmText: t("Submit"),
    });
    if (ok) submit.mutate();
  };

  const onReset = async () => {
    const ok = await confirm({
      title: t("Start over?"),
      description: t(
        "The draft flow and these settings are removed so you can pick another survey. Feedback already collected is kept.",
      ),
      confirmText: t("Start over"),
    });
    if (ok) reset.mutate();
  };

  const summary = [
    team ? t("Reviews go to {team}", { team: team.name }) : null,
    reward ? t("Reward: {reward}", { reward: reward.name }) : t("No review reward"),
    t("{sent} asked · {completed} answered", { sent: counts.sent, completed: counts.completed }),
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="flex flex-wrap items-center gap-2">
            <span className="truncate">{flow.name}</span>
            <FeedbackStatusBadge tone={tone} />
          </CardTitle>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className={enableable ? "text-foreground" : "text-muted-foreground"}>
            {setting.enabled ? t("Sending") : t("Not sending")}
          </span>
          <Switch
            checked={setting.enabled}
            disabled={!enableable || update.isPending}
            onCheckedChange={(checked) => update.mutate({ enabled: checked })}
            aria-label={t("Send feedback requests")}
          />
        </label>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!enableable && (
          <p className="text-sm text-muted-foreground">
            {tone === "draft"
              ? t("Submit the flow to Meta to get started.")
              : tone === "pending"
                ? t(
                    "Meta is reviewing the message template — usually hours, sometimes a day. Sending switches on as soon as it is approved.",
                  )
                : tone === "rejected"
                  ? t("Meta rejected the message template. Reset and submit again.")
                  : t("This flow can no longer be sent. Start over with a new draft.")}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {needsSubmit && (
            <Button type="button" onClick={onSubmit} disabled={submit.isPending}>
              {submit.isPending ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconSend size={16} />
              )}
              {t("Submit to Meta")}
            </Button>
          )}
          {isDraft && (
            <Button
              variant="outline"
              render={
                <Link
                  to="/dashboard/whatsapp/flows/v2/$dbFlowId"
                  params={{ dbFlowId: flow.dbFlowId }}
                />
              }
            >
              <IconEdit size={16} />
              {t("Edit questions")}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onViewResults}>
            <IconChartBar size={16} />
            {t("View results")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="ml-auto text-muted-foreground"
            onClick={onReset}
            disabled={reset.isPending}
          >
            <IconRefresh size={16} />
            {t("Start over")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
