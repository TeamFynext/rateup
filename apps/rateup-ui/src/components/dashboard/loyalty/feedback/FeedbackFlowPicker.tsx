import {
  IconAlertTriangle,
  IconCheck,
  IconExternalLink,
  IconMessageStar,
  IconUnlink,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { FeedbackFlowCandidate, FeedbackState } from "@/backend/loyalty/feedback.api.ts";
import {
  useDetachFeedbackMutation,
  useFeedbackFlowCandidates,
  useSetupFeedbackMutation,
} from "@/backend/loyalty/feedback.query.ts";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { cn } from "@/lib/utils.ts";
import { LOYALTY_FEEDBACK_FLOW_CATEGORY, WaFlowStatus } from "@/types/enums.ts";

import { TeamGoogleLinkRow } from "./TeamGoogleLinkRow.tsx";

/**
 * Selecting the flow Feedback sends. The flows come from WhatsApp → Flow — created there with
 * the Loyalty feedback category — so with none to pick from, this points there.
 */
export function FeedbackFlowPicker({ state }: Readonly<{ state: FeedbackState }>) {
  const { t } = useTranslation();
  const { data, isPending } = useFeedbackFlowCandidates();
  const setup = useSetupFeedbackMutation();
  const detach = useDetachFeedbackMutation();
  const [dbFlowId, setDbFlowId] = useState<string | undefined>();
  const [teamId, setTeamId] = useState("");

  // A setting whose flow was deleted in WhatsApp → Flow: the only way on is to detach.
  if (state.setting && !state.flow) {
    return (
      <Alert>
        <IconAlertTriangle />
        <AlertTitle>{t("The selected feedback flow no longer exists")}</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
          <span>{t("It was deleted in WhatsApp → Flow. Detach it here, then pick another.")}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => detach.mutate()}
            disabled={detach.isPending}
          >
            <IconUnlink size={16} />
            {t("Detach")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isPending || !data) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const createLink = (
    <Button
      render={
        <Link
          to="/dashboard/whatsapp/flows"
          search={{ action: "create", for: LOYALTY_FEEDBACK_FLOW_CATEGORY }}
        />
      }
    >
      <IconExternalLink size={16} />
      {t("Create one in WhatsApp → Flow")}
    </Button>
  );

  if (data.flows.length === 0) {
    return (
      <Empty className="rounded-lg border border-dashed py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconMessageStar />
          </EmptyMedia>
          <EmptyTitle>{t("No Loyalty feedback flow yet")}</EmptyTitle>
          <EmptyDescription>
            {t(
              "Create one in WhatsApp → Flow: choose Loyalty feedback and a ready-made survey for your kind of business, publish it from the editor, then come back and select it here.",
            )}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>{createLink}</EmptyContent>
      </Empty>
    );
  }

  const selected = data.flows.find((flow) => flow.dbFlowId === dbFlowId);
  const canUse = Boolean(selected?.eligible && teamId);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("Pick a feedback flow")}</h2>
            <p className="text-sm text-muted-foreground">
              {t(
                "Flows created with the Loyalty feedback category. Publish from the editor, or from here.",
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                to="/dashboard/whatsapp/flows"
                search={{ action: "create", for: LOYALTY_FEEDBACK_FLOW_CATEGORY }}
              />
            }
          >
            <IconExternalLink size={16} />
            {t("Create another")}
          </Button>
        </div>
        <div role="radiogroup" aria-label={t("Feedback flow")} className="grid gap-3">
          {data.flows.map((flow) => (
            <CandidateRow
              key={flow.dbFlowId}
              flow={flow}
              selected={flow.dbFlowId === dbFlowId}
              onSelect={() => setDbFlowId(flow.dbFlowId)}
            />
          ))}
        </div>
      </div>

      <Card className="lg:sticky lg:top-4 lg:self-start">
        <CardHeader>
          <CardTitle>{t("Where the review goes")}</CardTitle>
          <CardDescription>
            {t("Happy customers are sent to this team's Google review link.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel>{t("Team")}</FieldLabel>
            <TeamSelector
              value={teamId}
              onChange={setTeamId}
              enableDefaultValue={false}
              className="w-full"
            />
          </Field>
          <TeamGoogleLinkRow teamId={teamId || undefined} />
          <Button
            type="button"
            disabled={!canUse || setup.isPending}
            onClick={() => selected && setup.mutate({ dbFlowId: selected.dbFlowId, teamId })}
          >
            {setup.isPending ? <Spinner /> : <IconCheck size={16} />}
            {t("Use this flow")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CandidateRow({
  flow,
  selected,
  onSelect,
}: Readonly<{ flow: FeedbackFlowCandidate; selected: boolean; onSelect: () => void }>) {
  const { t } = useTranslation();
  const published = flow.status === WaFlowStatus.PUBLISHED;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={!flow.eligible}
      onClick={onSelect}
      title={flow.reason ?? undefined}
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        flow.eligible ? "hover:bg-muted/60" : "cursor-not-allowed opacity-60",
        selected ? "border-primary bg-primary/5" : "border-border bg-card",
      )}
    >
      <span className="min-w-0 truncate font-medium text-foreground">{flow.name}</span>
      <span className="flex flex-wrap items-center gap-2">
        <Badge variant={published ? "secondary" : "outline"}>
          {published ? t("Published") : t("Draft")}
        </Badge>
        {flow.eligible ? (
          <Badge variant="secondary" className="bg-green-600/10 text-green-700 dark:text-green-500">
            <IconCheck size={12} /> {t("Ready")}
          </Badge>
        ) : (
          <Badge variant="outline">{flow.reason ?? t("Not usable")}</Badge>
        )}
      </span>
    </button>
  );
}
