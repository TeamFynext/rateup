import { useTranslation } from "react-i18next";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
 * One chip per recipient: how many times we tried, tinted by how the latest
 * try ended. "2, green" says the initial send was refused and the retry landed;
 * the per-attempt history stays in the tooltip.
 */
export function ParticipantAttemptChips({
  attempts,
}: Readonly<{ attempts: ParticipantAttempt[] | undefined }>) {
  const { t } = useTranslation("campaign.details");

  if (!attempts?.length) {
    return <span className="text-muted-foreground/70 text-xs">{t("Not attempted")}</span>;
  }

  // The latest attempt decides the colour, whatever order the API listed them in.
  const latest = attempts.reduce((a, b) => (b.attemptNo > a.attemptNo ? b : a));
  // `attemptNo` is the campaign-wide send number, not this recipient's count:
  // someone skipped by send #2 would read "Attempt 1 / Attempt 3" and look
  // like three tries. Number by position in their own history instead.
  const history = [...attempts]
    .sort((a, b) => a.attemptNo - b.attemptNo)
    .map((attempt, index) =>
      t("Attempt {n} · {outcome}", { n: index + 1, outcome: attempt.outcome }),
    );

  return (
    <Tooltip>
      <TooltipTrigger
        render={<span />}
        className={cn(
          "inline-flex size-5.5 items-center justify-center rounded-md font-mono text-[11px] font-semibold ring-1",
          OUTCOME_STYLE[latest.outcome],
        )}
      >
        {attempts.length}
      </TooltipTrigger>
      <TooltipContent>
        <ul>
          {history.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
