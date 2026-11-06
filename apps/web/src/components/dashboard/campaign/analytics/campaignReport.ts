import type { QueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import { getCampaignAnalytics, getCampaignSends } from "@/backend/campaign/campaign.api";
import { campaignKeys } from "@/backend/campaign/campaign.keys";
import { downloadReport, fileSlug } from "@/components/dashboard/analytics/report/exportReport.ts";
import type {
  ReportBlock,
  Translate,
} from "@/components/dashboard/analytics/report/reportModel.ts";
import { CampaignSendStatus, CampaignSendTrigger, WaFailureReasonGroup } from "@/types/enums.ts";
import type { CampaignAnalytics, CampaignSend } from "@/types/global";

const percent = (value: number | null) =>
  value === null ? "—" : `${(value * 100).toFixed(value >= 0.995 || value === 0 ? 0 : 1)}%`;

/** The Analytics tab's "Outcome" column, for a code the retry engine will not pick up. */
const OUTCOME: Record<WaFailureReasonGroup, string> = {
  [WaFailureReasonGroup.LIMITED_BY_META]: "Limited",
  [WaFailureReasonGroup.INVALID_NUMBER]: "Permanent",
  [WaFailureReasonGroup.TEMPLATE_ISSUE]: "Needs a fix",
  [WaFailureReasonGroup.OTHER]: "Unclassified",
};

const TRIGGER: Record<CampaignSendTrigger, string> = {
  [CampaignSendTrigger.MANUAL]: "Manual",
  [CampaignSendTrigger.SCHEDULED]: "Scheduled",
  [CampaignSendTrigger.AUTO_RETRY]: "Automatic",
  [CampaignSendTrigger.DRIP]: "Drip",
};

/**
 * The Analytics tab as a report: the same funnel, failure breakdown and send
 * attempts, in the same order, so the PDF and the screen can be read side by side.
 */
export function buildCampaignReport(
  t: Translate,
  analytics: CampaignAnalytics,
  sends: CampaignSend[],
): ReportBlock[] {
  const blocks: ReportBlock[] = [];
  const funnel = analytics.funnel;
  const attempted = funnel[0]?.count ?? 0;
  const stage = (key: string) => funnel.find((row) => row.key === key);

  blocks.push({
    kind: "stats",
    items: [
      { label: t("Attempted"), value: attempted.toLocaleString() },
      ...(["delivered", "read", "replied"] as const).map((key) => {
        const row = stage(key);
        return {
          label: row?.label ?? key,
          value: (row?.count ?? 0).toLocaleString(),
          note: t("{percent} of attempted", { percent: percent(row?.rateOfAttempted ?? null) }),
        };
      }),
    ],
  });

  blocks.push({
    kind: "section",
    title: t("Delivery funnel"),
    note: t("All attempts combined · rates against {count} attempted", {
      count: attempted.toLocaleString(),
    }),
  });
  if (attempted === 0) {
    blocks.push({ kind: "empty", title: t("Stages"), text: t("Nothing has been sent yet.") });
  } else {
    blocks.push({
      kind: "table",
      title: t("Stages"),
      columns: [
        { label: t("Stage") },
        { label: t("Count"), align: "right" },
        { label: t("Of attempted"), align: "right" },
        { label: t("Of previous stage"), align: "right" },
        { label: t("Dropped off"), align: "right" },
      ],
      // Attempted is the base, not a stage — as on screen, it is the subtitle.
      rows: funnel
        .slice(1)
        .map((row, index) => [
          row.label,
          row.count.toLocaleString(),
          percent(row.rateOfAttempted),
          percent(row.rateOfPrevious),
          Math.max((funnel[index]?.count ?? 0) - row.count, 0).toLocaleString(),
        ]),
    });
  }

  const retryable = analytics.failures.reduce((total, row) => total + row.retryableCount, 0);
  blocks.push({
    kind: "section",
    title: t("Why messages failed"),
    note: t("{total} failed · {retryable} still retryable", {
      total: analytics.activeFailed.toLocaleString(),
      retryable: retryable.toLocaleString(),
    }),
  });
  const failureRows = analytics.failures.flatMap((row) =>
    row.codes.map((code) => [
      row.label,
      code.label,
      code.code === null ? "—" : String(code.code),
      code.retryable ? t("Retryable") : t(OUTCOME[row.group]),
      code.count.toLocaleString(),
      `${((code.count / Math.max(analytics.activeFailed, 1)) * 100).toFixed(0)}%`,
    ]),
  );
  if (failureRows.length === 0) {
    blocks.push({
      kind: "empty",
      title: t("Failure reasons"),
      text: t("No failures — Meta accepted every message."),
    });
  } else {
    blocks.push({
      kind: "table",
      title: t("Failure reasons"),
      columns: [
        { label: t("Reason") },
        { label: t("Detail") },
        { label: t("Code") },
        { label: t("Outcome") },
        { label: t("Count"), align: "right" },
        { label: t("Share"), align: "right" },
      ],
      rows: failureRows,
    });
  }

  blocks.push({
    kind: "section",
    title: t("Send attempts"),
    note: t("Every send is numbered. Retries only re-attempt failures worth another try."),
  });
  if (sends.length === 0) {
    blocks.push({
      kind: "empty",
      title: t("Attempts"),
      text: t("This campaign has not been sent yet."),
    });
  } else {
    blocks.push({
      kind: "table",
      title: t("Attempts"),
      columns: [
        { label: t("Attempt") },
        { label: t("Type") },
        { label: t("Trigger") },
        { label: t("Started") },
        { label: t("Re-attempted"), align: "right" },
        { label: t("Delivered"), align: "right" },
        { label: t("Recovered"), align: "right" },
        { label: t("Failed"), align: "right" },
        { label: t("Recovery rate"), align: "right" },
      ],
      rows: sends.map((send) => {
        const pending = send.status === CampaignSendStatus.SCHEDULED;
        const isRetry = send.trigger === CampaignSendTrigger.AUTO_RETRY;
        const when = send.startedAt ?? send.scheduledFor;
        return [
          `#${send.attemptNo + 1}`,
          send.label,
          t(TRIGGER[send.trigger]),
          when
            ? `${pending ? `${t("Scheduled")} ` : ""}${dayjs(when).format("D MMM, h:mm A")}`
            : "—",
          pending
            ? t("{count} eligible", { count: send.totalTargeted.toLocaleString() })
            : send.totalTargeted.toLocaleString(),
          pending ? "—" : send.totalDelivered.toLocaleString(),
          pending || !isRetry || send.recovered === 0 ? "—" : send.recovered.toLocaleString(),
          pending ? "—" : send.totalFailed.toLocaleString(),
          pending || !isRetry || send.recoveryRate === null
            ? "—"
            : `${(send.recoveryRate * 100).toFixed(1)}%`,
        ];
      }),
    });
  }

  return blocks;
}

/** Downloads the campaign's Analytics tab as a PDF, fetched fresh so it is current. */
export async function exportCampaignReport(
  queryClient: QueryClient,
  campaign: Readonly<{ id: string; name: string; template?: string | null; team?: string }>,
) {
  const [analytics, sends] = await Promise.all([
    queryClient.fetchQuery({
      queryKey: campaignKeys.analytics(campaign.id),
      queryFn: () => getCampaignAnalytics(campaign.id),
      staleTime: 0,
    }),
    queryClient.fetchQuery({
      queryKey: campaignKeys.sends(campaign.id),
      queryFn: () => getCampaignSends(campaign.id),
      staleTime: 0,
    }),
  ]);

  await downloadReport(
    queryClient,
    (t) => ({
      title: campaign.name,
      scope: [
        campaign.template ? t("Template: {name}", { name: campaign.template }) : "",
        campaign.team ? t("Team: {name}", { name: campaign.team }) : "",
      ],
      blocks: buildCampaignReport(t, analytics, sends),
    }),
    `rateup-campaign-${fileSlug(campaign.name)}-${dayjs().format("YYYY-MM-DD")}.pdf`,
  );
}
