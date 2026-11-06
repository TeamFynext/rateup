import { IconRocket } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useLoyaltyDashboardData } from "@/backend/loyalty/dashboard/dashboard.api";
import {
  isTierDowngradeRefusal,
  useApplyProfileStepMutation,
  useApplyTiersStepMutation,
} from "@/backend/loyalty/onboarding.query";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Loader } from "@/components/ui/loader.tsx";
import { useConfirm } from "@/context/confirm-provider";
import { getApiErrorMessage } from "@/utils/apiError.ts";
import { formatIsoDateString } from "@/utils/dateTime.ts";

import { EarningRulesPage } from "../earning-rules/EarningRulesPage.tsx";
import { useGivebackResult } from "../giveback/useGivebackResult.ts";
import { toProfilePayload } from "../onboarding/profile.ts";
import { ProfileStep } from "../onboarding/steps/ProfileStep.tsx";
import { VipTierStep } from "../onboarding/steps/VipTierStep.tsx";
import { useProgramEditorData } from "../onboarding/useProgramEditorData.ts";
import { removedTiers, toTiersPayload } from "../onboarding/vipTier.ts";
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
 * The three cards are what the programme promises: its profile, how points are earned and
 * its tiers, each opening its editor under a Back button. What customers can redeem is
 * Loyalty → Rewards; what the programme *says* is Loyalty → Messages, and when it says it
 * is Loyalty → Reminders.
 */
export function ProgramPage({ section }: Readonly<{ section?: SectionKey }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { data, isLoading } = useProgramEditorData();
  const { data: dashboard } = useLoyaltyDashboardData();
  const { result: giveback } = useGivebackResult();

  const closeSection = () => navigate({ to: LOYALTY_PATHS.program, search: {} });
  const saved = () => {
    toast.success(t("Saved"));
    closeSection();
  };

  const profile = useApplyProfileStepMutation(saved);
  const tiers = useApplyTiersStepMutation((result) => {
    // Every member was re-checked against the new ladder as part of the save; say who moved.
    const { promoted, demoted } = result.moves;
    if (promoted === 0 && demoted === 0) {
      saved();
      return;
    }
    toast.success(
      t("Saved · {up} members moved up, {down} moved down", { up: promoted, down: demoted }),
    );
    closeSection();
  });
  const templatesPending = data?.state.counts.templatesPending ?? 0;

  const summaries = useMemo(
    () => (data ? buildSectionSummaries({ t, state: data.state, dashboard, giveback }) : []),
    [t, data, dashboard, giveback],
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

  const memberCounts = new Map(
    (dashboard?.tierDistribution ?? [])
      .filter((tier) => tier.id !== null)
      .map((tier) => [tier.id as string, tier.value]),
  );

  return (
    <div className="flex flex-col gap-6">
      {!section && (
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
      )}

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

      {section === "profile" && (
        <ProgramSectionEditor>
          <ProfileStep
            mode="section"
            defaultValues={defaults.profile}
            isSaving={profile.isPending}
            pointsName={pointsName}
            onCancel={closeSection}
            onSubmit={(values) => profile.mutate(toProfilePayload(values))}
          />
        </ProgramSectionEditor>
      )}

      {section === "earning" && (
        <ProgramSectionEditor>
          <EarningRulesPage />
        </ProgramSectionEditor>
      )}

      {section === "tiers" && (
        <ProgramSectionEditor>
          <VipTierStep
            mode="section"
            defaultValues={defaults.tiers}
            currencySymbol={context.currencySymbol}
            currencyCode={context.currencyCode}
            isSaving={tiers.isPending}
            memberCounts={memberCounts}
            savedTiers={state.saved.tiers}
            advancedEditorHref={
              <Link
                to={LOYALTY_PATHS.program}
                search={{ section: "earning" }}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("Need more than three tiers? Edit the ladder in Earning.")}
              </Link>
            }
            onCancel={closeSection}
            onSubmit={async (values) => {
              // A removed tier that still has members needs an explicit yes: they move
              // down to the nearest surviving tier and earn at its rate from now on.
              const payload = toTiersPayload(values);
              const removedWithMembers = removedTiers(state.saved.tiers, values)
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
                        { count: tier.members, name: tier.name },
                      ),
                    )
                    .join(" "),
                  confirmText: t("Downgrade and remove"),
                });
                if (!ok) return;
                downgradeCustomers = true;
              }
              try {
                await tiers.mutateAsync({ ...payload, downgradeCustomers });
              } catch (error) {
                // The dashboard's counts can lag; the API is the last word on who sits where.
                if (!isTierDowngradeRefusal(error)) return;
                const ok = await confirm({
                  title: t("Move members down a tier?"),
                  description: getApiErrorMessage(error, ""),
                  confirmText: t("Downgrade and remove"),
                });
                if (ok) {
                  await tiers
                    .mutateAsync({ ...payload, downgradeCustomers: true })
                    .catch(() => undefined);
                }
              }
            }}
          />
        </ProgramSectionEditor>
      )}
    </div>
  );
}
