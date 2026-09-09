import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

export interface ParticipantAttempt {
  attemptNo: number;
  trigger: string;
  outcome: "DELIVERED" | "READ" | "FAILED" | "SENT";
  at: string | null;
  errorCode: number | null;
}

/** Green landed, red refused, grey still in flight. */
const OUTCOME_STYLE: Record<ParticipantAttempt["outcome"], string> = {
  READ: "bg-green-600/10 text-green-700 ring-green-600/25 dark:text-green-500",
  DELIVERED: "bg-green-600/10 text-green-700 ring-green-600/25 dark:text-green-500",
  FAILED: "bg-destructive/10 text-destructive ring-destructive/25",
  SENT: "bg-secondary text-secondary-foreground ring-border",
};

/**
 * One small numbered chip per attempt this recipient was included in.
 *
 * The whole reason `CampaignSend` exists, at the row level: "#1 red, #2 green"
 * says in two glyphs that the initial send was refused and the retry landed —
 * which a single "SENT" status could never say.
 */
export function ParticipantAttemptChips({
  attempts,
}: Readonly<{ attempts: ParticipantAttempt[] | undefined }>) {
  const { t } = useTranslation("campaign.details");

  if (!attempts?.length) {
    return <span className="text-muted-foreground/70 text-xs">{t("Not attempted")}</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {attempts.map((attempt) => (
        <span
          key={`${attempt.attemptNo}-${attempt.at ?? ""}`}
          title={t("Attempt {n} · {outcome}", {
            n: attempt.attemptNo + 1,
            outcome: attempt.outcome,
          })}
          className={cn(
            "inline-flex size-5.5 items-center justify-center rounded-md font-mono text-[11px] font-semibold ring-1",
            OUTCOME_STYLE[attempt.outcome],
          )}
        >
          {attempt.attemptNo + 1}
        </span>
      ))}
    </div>
  );
}
