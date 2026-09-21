import { IconChartBar, IconEdit, IconUnlink, IconSend } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { FeedbackState } from "@/backend/loyalty/feedback.api.ts";
import {
  useDetachFeedbackMutation,
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
 * still a draft, switch sending on once Meta has approved everything, or detach it.
 */
export function FeedbackStatusCard({
  state,
  onViewResults,
}: Readonly<{ state: FeedbackState; onViewResults: () => void }>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const submit = useSubmitFeedbackFlowMutation();
  const detach = useDetachFeedbackMutation();
  const update = useUpdateFeedbackSettingsMutation();

  const { flow, template, setting, team, reward, counts } = state;
  if (!flow || !setting) return null;

  const tone = feedbackTone(flow, template, setting.enabled);
  const isDraft = flow.status === WaFlowStatus.DRAFT;
  // A flow that was already published when it was picked never went through submit, and
  // submit is the only thing that creates the template — so without this the card would
  // sit on "Awaiting Meta" for a template that does not exist, with no button to make one.
  const needsSubmit = isDraft || flow.pendingSave || !template;
  /** The published-flow case above: the only thing outstanding is the template itself. */
  const templateOnly = !isDraft && !flow.pendingSave && !template;
  const enableable = canEnableFeedback(flow, template);

  const onSubmit = async () => {
    const ok = await confirm({
      title: templateOnly ? t("Create the message template?") : t("Submit the flow to Meta?"),
      description: templateOnly
        ? t(
            "The survey is already published. This creates the message template that carries it and sends it to Meta for approval; sending switches on once Meta approves.",
          )
        : t(
            "The survey is published and a message template is sent to Meta for approval. Once published, the questions can no longer be edited — you would start over with a new draft.",
          ),
      confirmText: templateOnly ? t("Create") : t("Submit"),
    });
    if (ok) submit.mutate();
  };

  const onDetach = async () => {
    const ok = await confirm({
      title: t("Detach this flow?"),
      description: t(
        "The flow stays in WhatsApp → Flow and you can pick another here. Surveys already sent still record their answers, but no review link is sent for them. Results are kept.",
      ),
      confirmText: t("Detach"),
    });
    if (ok) detach.mutate();
  };

  const summary = [
    team ? t("Reviews go to {team}", { team: team.name }) : null,
    reward ? t("Reward: {reward}", { reward: reward.name }) : t("No review reward"),
    t("{sent} asked · {completed} answered", {
      sent: counts.sent,
      completed: counts.completed,
    }),
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
              : templateOnly
                ? t(
                    "The survey is published, but the message template that carries it has not been created yet. Create it here, and sending switches on once Meta approves it.",
                  )
                : tone === "pending"
                  ? t(
                      "Meta is reviewing the message template — usually hours, sometimes a day. Sending switches on as soon as it is approved.",
                    )
                  : tone === "rejected"
                    ? t(
                        "Meta rejected the message template. Detach, then select the flow again to resubmit.",
                      )
                    : t("This flow can no longer be sent. Detach it and pick another.")}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {needsSubmit && (
            <Button type="button" onClick={onSubmit} loading={submit.isPending}>
              <IconSend size={16} />
              {templateOnly ? t("Create message template") : t("Submit to Meta")}
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
            onClick={onDetach}
            loading={detach.isPending}
          >
            <IconUnlink size={16} />
            {t("Detach")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
