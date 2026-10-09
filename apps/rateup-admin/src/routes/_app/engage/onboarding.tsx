import { IconEye, IconSend } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import {
  dripPreviewQueryOptions,
  dripQueryOptions,
  useTestDripStep,
  useToggleDripStep,
  type DripStep,
} from "@/api/engage.api";
import { Notice } from "@/components/ds/action-dialog";
import { PageHeading } from "@/components/ds/page-heading";
import { Pill } from "@/components/ds/pill";
import { ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { ResponsiveTable, type Column } from "@/components/ds/responsive-table";
import { StatCard } from "@/components/ds/stat-card";
import { EmailPreviewDialog, TestSendDialog } from "@/components/engage/engage-dialogs";
import { Switch } from "@/components/ui/switch";
import { getApiErrorMessage } from "@/lib/apiError";
import { formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_app/engage/onboarding")({
  component: OnboardingPage,
});

const percent = (part: number, whole: number) =>
  whole ? `${Math.round((part / whole) * 100)}%` : "—";

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {children}
    </button>
  );
}

function columns(actions: {
  toggle: (step: DripStep, enabled: boolean) => void;
  preview: (step: DripStep) => void;
  test: (step: DripStep) => void;
}): Column<DripStep>[] {
  return [
    {
      key: "step",
      header: "Step",
      primary: true,
      cell: (step) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">
            <span className="text-muted-foreground tabular">Day {step.day} · </span>
            {step.label}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{step.subject}</span>
        </span>
      ),
    },
    {
      key: "channels",
      header: "Channels",
      hideBelow: "lg",
      cell: (step) => (
        <span className="flex gap-1.5">
          <Pill tone="muted">Email</Pill>
          {step.hasWhatsapp && <Pill tone="positive">WhatsApp</Pill>}
        </span>
      ),
    },
    {
      key: "sent",
      header: "Sent",
      align: "right",
      cell: (step) => (
        <span className="tabular">
          {formatNumber(step.email.SENT)}
          {step.hasWhatsapp && (
            <span className="text-muted-foreground"> + {formatNumber(step.whatsapp.SENT)} WA</span>
          )}
        </span>
      ),
    },
    {
      key: "failed",
      header: "Failed",
      align: "right",
      hideBelow: "xl",
      cell: (step) => {
        const failed = step.email.FAILED + step.whatsapp.FAILED;
        return (
          <span className={failed ? "text-negative tabular" : "text-muted-foreground tabular"}>
            {formatNumber(failed)}
          </span>
        );
      },
    },
    {
      key: "conversion",
      header: "Did it after",
      align: "right",
      cell: (step) =>
        step.measurable ? (
          <span
            className="font-medium tabular"
            title={`${step.orgsConverted} of ${step.orgsReached} orgs`}
          >
            {percent(step.orgsConverted, step.orgsReached)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "enabled",
      header: "On",
      align: "right",
      cell: (step) => (
        <Switch
          checked={step.enabled}
          aria-label={`${step.enabled ? "Turn off" : "Turn on"} ${step.label}`}
          onCheckedChange={(checked) => actions.toggle(step, checked)}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (step) => (
        <span className="flex justify-end gap-1">
          <IconAction label={`Preview ${step.label}`} onClick={() => actions.preview(step)}>
            <IconEye className="size-4" />
          </IconAction>
          <IconAction label={`Send a test of ${step.label}`} onClick={() => actions.test(step)}>
            <IconSend className="size-4" />
          </IconAction>
        </span>
      ),
    },
  ];
}

function OnboardingPage() {
  const query = useQuery(dripQueryOptions);
  const toggle = useToggleDripStep();
  const test = useTestDripStep();
  const [previewing, setPreviewing] = useState<DripStep | null>(null);
  const [testing, setTesting] = useState<DripStep | null>(null);
  const preview = useQuery({
    ...dripPreviewQueryOptions(previewing?.key ?? ""),
    enabled: !!previewing,
  });

  const steps = query.data?.data ?? [];
  const totals = steps.reduce(
    (sum, step) => ({
      email: sum.email + step.email.SENT,
      whatsapp: sum.whatsapp + step.whatsapp.SENT,
      reached: sum.reached + (step.measurable ? step.orgsReached : 0),
      converted: sum.converted + (step.measurable ? step.orgsConverted : 0),
    }),
    { email: 0, whatsapp: 0, reached: 0, converted: 0 },
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Onboarding"
        description="Emails and WhatsApp nudges every new organisation gets in its first three weeks. A step is skipped once the org has done what it asks, and each person hears at most once a day."
      />
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {!query.data.whatsappSender && (
            <Notice>
              WhatsApp steps are off: ROOT_ORG is not set on the API, so only email goes out.
            </Notice>
          )}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-5">
            <StatCard
              tone="sky"
              value={formatNumber(totals.email)}
              label="Emails sent"
              sub={`Last ${query.data.windowDays} days`}
            />
            <StatCard
              tone="mint"
              value={formatNumber(totals.whatsapp)}
              label="WhatsApp sent"
              sub={`Last ${query.data.windowDays} days`}
            />
            <StatCard
              tone="brand"
              value={percent(totals.converted, totals.reached)}
              label="Did what the step asked"
              sub="Across steps with a goal"
              className="col-span-2 lg:col-span-1"
            />
          </div>
          <ResponsiveTable
            rows={steps}
            rowKey={(step) => step.key}
            columns={columns({
              toggle: (step, enabled) =>
                toggle.mutate(
                  { key: step.key, enabled },
                  {
                    onSuccess: () =>
                      toast.success(`${step.label} ${enabled ? "turned on" : "turned off"}.`),
                    onError: (error) =>
                      toast.error(getApiErrorMessage(error, "Couldn't change that step.")),
                  },
                ),
              preview: setPreviewing,
              test: (step) => {
                test.reset();
                setTesting(step);
              },
            })}
          />
        </>
      )}
      {previewing && <EmailPreviewDialog query={preview} onClose={() => setPreviewing(null)} />}
      {testing && (
        <TestSendDialog
          title={`Test “${testing.label}”`}
          channels={testing.hasWhatsapp ? ["EMAIL", "WHATSAPP"] : ["EMAIL"]}
          pending={test.isPending}
          error={test.error}
          onSend={(input, onSuccess) => test.mutate({ key: testing.key, ...input }, { onSuccess })}
          onClose={() => setTesting(null)}
        />
      )}
    </div>
  );
}
