import { IconRocket } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useLoyaltyDashboardData } from "@/backend/loyalty/dashboard/dashboard.api";
import {
  useApplyBasicsStepMutation,
  useApplyEarningStepMutation,
  useApplyMessagesStepMutation,
  useApplyRewardsStepMutation,
  useApplyTiersStepMutation,
} from "@/backend/loyalty/onboarding.query";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Loader } from "@/components/ui/loader.tsx";
import { useConfirm } from "@/context/confirm-provider";
import { formatIsoDateString } from "@/utils/dateTime.ts";

import { useGivebackResult } from "../giveback/useGivebackResult.ts";
import { BusinessTypeStep } from "../onboarding/steps/BusinessTypeStep.tsx";
import { EarningStep } from "../onboarding/steps/EarningStep.tsx";
import { MessagesStep } from "../onboarding/steps/MessagesStep.tsx";
import { RewardsStep } from "../onboarding/steps/RewardsStep.tsx";
import { TiersStep } from "../onboarding/steps/TiersStep.tsx";
import { useProgramEditorData } from "../onboarding/useProgramEditorData.ts";
import { LOYALTY_PATHS } from "../paths.ts";
import { ProgramSectionCard } from "./ProgramSectionCard.tsx";
import { ProgramSectionEditor } from "./ProgramSectionEditor.tsx";
import { programStateOf } from "./programState.ts";
import { ProgramStatusBadge } from "./ProgramStatusBadge.tsx";
import { ProgramStatusStrip } from "./ProgramStatusStrip.tsx";
import { buildSectionSummaries, type SectionKey } from "./programSummary.ts";

/**
 * The Program page: everything that defines what the programme promises, in one place.
 *
 * The five cards are the six wizard steps minus Review. Editing one opens the same form
 * the wizard uses, in section mode, and saves through the same endpoint — so there is
 * exactly one place a rule, a tier or a reward can be edited, and one giveback figure
 * that reacts to it.
 */
export function ProgramPage({ section }: Readonly<{ section?: SectionKey }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { data, isLoading } = useProgramEditorData();
  const { data: dashboard } = useLoyaltyDashboardData();
  const { result: giveback } = useGivebackResult();

  const closeSection = () => navigate({ to: LOYALTY_PATHS.program, search: {} });
  const openSection = (key: SectionKey) =>
    navigate({ to: LOYALTY_PATHS.program, search: { section: key } });
  const saved = () => {
    toast.success(t("Saved"));
    closeSection();
  };

  const basics = useApplyBasicsStepMutation(saved);
  const earning = useApplyEarningStepMutation(saved);
  const tiers = useApplyTiersStepMutation(saved);
  const rewards = useApplyRewardsStepMutation(saved);
  const messages = useApplyMessagesStepMutation((result) => {
    if (result.skipped.length > 0) {
      toast.error(
        t("Some keywords are already in use: {keywords}", {
          keywords: result.skipped.map((s) => s.requestMessage).join(", "),
        }),
      );
      return;
    }
    saved();
  });

  const templatesPending = data?.state.counts.templatesPending ?? 0;

  const summaries = useMemo(
    () =>
      data
        ? buildSectionSummaries({ t, state: data.state, dashboard, giveback, templatesPending })
        : [],
    [t, data, dashboard, giveback, templatesPending],
  );

  if (isLoading || !data) return <Loader />;

  const { state, defaults, giveback: context } = data;
  const program = state.program;
  const programState = programStateOf(program);
  const pointsName = data.pointsName;

  const description = program
    ? [
        program.name,
        t("points called {points}", { points: pointsName }),
        programState === "live" && program.onboardingCompletedAt
          ? t("live since {date}", { date: formatIsoDateString(program.onboardingCompletedAt) })
          : programState === "paused"
            ? t("paused — balances kept")
            : t("draft, not activated yet"),
      ].join(" · ")
    : undefined;

  const advancedLink = (target: "earning" | "rewards") => (
    <Link
      to={LOYALTY_PATHS.programAdvanced}
      search={{ section: target }}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      {t("open the full editor")}
    </Link>
  );

  const memberCounts = new Map(
    (dashboard?.tierDistribution ?? [])
      .filter((tier) => tier.id !== null)
      .map((tier) => [tier.id as string, tier.value]),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title={t("Program")}
        description={
          description ? (
            <span className="flex flex-wrap items-center gap-2">
              <span>{description}</span>
              <ProgramStatusBadge state={programState} />
            </span>
          ) : undefined
        }
        actions={
          programState === "draft" ? (
            <Button render={<Link to={LOYALTY_PATHS.onboarding} />}>
              <IconRocket size={16} />
              {t("Continue setup")}
            </Button>
          ) : undefined
        }
      />

      {!section && (
        <>
          <ProgramStatusStrip
            programState={programState}
            pointsName={pointsName}
            currencySymbol={context.currencySymbol}
            currencyCode={context.currencyCode}
            dashboard={dashboard}
            giveback={giveback}
            templatesPending={templatesPending}
            hasWhatsappChannel={data.hasWhatsappChannel}
          />

          <div className="flex flex-col gap-3">
            {summaries.map((summary) => (
              <ProgramSectionCard key={summary.key} summary={summary} />
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {programState === "draft"
              ? t("Everything is saved as you go. Nothing reaches customers until you activate.")
              : t(
                  "Edits apply to new transactions the moment you save. Nothing on this page can put a live program back into draft — pausing it is a Settings decision, and it keeps every balance intact.",
                )}
          </p>
        </>
      )}

      {section === "basics" && (
        <ProgramSectionEditor section="basics">
          <BusinessTypeStep
            mode="section"
            presets={data.presets}
            selectedKey={data.selectedKey}
            onSelectPreset={data.setPresetKeyOverride}
            defaultValues={defaults.basics}
            isSaving={basics.isPending}
            onCancel={closeSection}
            onSubmit={(values) => basics.mutate({ ...values, presetKey: data.selectedKey })}
          />
        </ProgramSectionEditor>
      )}

      {section === "earning" && (
        <ProgramSectionEditor section="earning">
          <EarningStep
            mode="section"
            defaultValues={defaults.earning}
            currencySymbol={context.currencySymbol}
            pointsName={pointsName}
            giveback={context}
            isSaving={earning.isPending}
            onCancel={closeSection}
            onEditAverageOrderValue={() => openSection("basics")}
            advancedEditorHref={advancedLink("earning")}
            onSubmit={(values) => earning.mutate({ ...values, deleteMissing: true })}
          />
        </ProgramSectionEditor>
      )}

      {section === "tiers" && (
        <ProgramSectionEditor section="tiers">
          <TiersStep
            mode="section"
            defaultValues={defaults.tiers}
            currencySymbol={context.currencySymbol}
            giveback={context}
            isSaving={tiers.isPending}
            memberCounts={memberCounts}
            onCancel={closeSection}
            onEditAverageOrderValue={() => openSection("basics")}
            onSubmit={async (values) => {
              // A removed tier that still has members needs an explicit yes: they move
              // down to the nearest surviving tier and earn at its rate from now on.
              const keptIds = new Set(values.tiers.map((tier) => tier.id).filter(Boolean));
              const removedWithMembers = state.saved.tiers
                .filter((tier) => !keptIds.has(tier.id))
                .map((tier) => ({ ...tier, members: memberCounts.get(tier.id) ?? 0 }))
                .filter((tier) => tier.members > 0);
              let downgradeCustomers = false;
              if (values.tiersEnabled && removedWithMembers.length > 0) {
                const ok = await confirm({
                  title: t("Move members down a tier?"),
                  description: removedWithMembers
                    .map((tier) =>
                      t(
                        "{count} members sit in {name}. They move to the tier below and earn at its rate.",
                        {
                          count: tier.members,
                          name: tier.name,
                        },
                      ),
                    )
                    .join(" "),
                  confirmText: t("Downgrade and remove"),
                });
                if (!ok) return;
                downgradeCustomers = true;
              }
              tiers.mutate({ ...values, deleteMissing: true, downgradeCustomers });
            }}
          />
        </ProgramSectionEditor>
      )}

      {section === "rewards" && (
        <ProgramSectionEditor section="rewards">
          <RewardsStep
            mode="section"
            defaultValues={defaults.rewards}
            pointsName={pointsName}
            giveback={context}
            isSaving={rewards.isPending}
            tierOptions={state.saved.tiers.map((tier) => ({ value: tier.id, label: tier.name }))}
            onCancel={closeSection}
            onEditAverageOrderValue={() => openSection("basics")}
            advancedEditorHref={advancedLink("rewards")}
            onSubmit={(values) => rewards.mutate(values)}
          />
        </ProgramSectionEditor>
      )}

      {section === "messages" && (
        <ProgramSectionEditor section="messages">
          <MessagesStep
            mode="section"
            defaultValues={defaults.messages}
            isSaving={messages.isPending}
            skipped={[]}
            eventResults={[]}
            hasWhatsappChannel={data.hasWhatsappChannel}
            suggestedJoinText={data.suggestedJoinText}
            eventParams={data.eventParams}
            savedTriggers={state.saved.triggers}
            notificationsHref={
              <Link
                to={LOYALTY_PATHS.messages}
                search={{ tab: "automatic" }}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("Edit them in Messages")}
              </Link>
            }
            onCancel={closeSection}
            // Notifications are never re-submitted from here — see MessagesStep.
            onSubmit={(values) =>
              messages.mutate({ commands: values.commands, eventTemplates: [] })
            }
          />
        </ProgramSectionEditor>
      )}
    </div>
  );
}
