import { Section, Text } from "react-email";
import {
  Band,
  Display,
  EmailLayout,
  Paragraph,
  PrimaryButton,
} from "../utils/email/react/components.js";

export interface WeeklyStatsRow {
  title: string;
  totalResponses: number;
  weeklyResponses: number;
}

export interface WeeklyStatsEmailProps {
  /** Both pre-formatted for the recipient by the caller. */
  periodStart: string;
  periodEnd: string;
  rows: WeeklyStatsRow[];
  dashboardLink: string;
  /** Digest mail, so the footer carries Collage's unsubscribe line. */
  unsubscribeUrl?: string;
}

/** "96 this week · 1,284 all time" — the counts read as one line under the survey name. */
function describeCounts({ weeklyResponses, totalResponses }: WeeklyStatsRow) {
  const weekly = weeklyResponses.toLocaleString("en-IN");
  const total = totalResponses.toLocaleString("en-IN");
  return weeklyResponses === 0
    ? `Nothing new this week · ${total} all time`
    : `${weekly} this week · ${total} all time`;
}

export function WeeklyStatsEmail({
  periodStart,
  periodEnd,
  rows,
  dashboardLink,
  unsubscribeUrl,
}: WeeklyStatsEmailProps) {
  const weekTotal = rows.reduce((sum, row) => sum + row.weeklyResponses, 0);
  const active = rows.filter((row) => row.weeklyResponses > 0).length;

  /**
   * The opening line carries the number, so a reader who never scrolls past the
   * preview pane still gets the week's headline.
   */
  const summary =
    weekTotal === 0
      ? `No responses came in between ${periodStart} and ${periodEnd}. A quiet week is worth a look — check that your links and QR codes are still where customers can reach them.`
      : `You collected ${weekTotal.toLocaleString("en-IN")} ${
          weekTotal === 1 ? "response" : "responses"
        } between ${periodStart} and ${periodEnd}, across ${active} ${
          active === 1 ? "survey" : "surveys"
        }.`;

  return (
    <EmailLayout
      preview={
        weekTotal === 0
          ? `A quiet week on RateUp: ${periodStart} – ${periodEnd}`
          : `${weekTotal.toLocaleString("en-IN")} responses this week on RateUp`
      }
      unsubscribeUrl={unsubscribeUrl}
      footerNote={
        <Paragraph tight>
          An automated weekly report. Replies to this address aren&apos;t monitored.
        </Paragraph>
      }
      band={
        rows.length ? (
          <Band
            heading="Survey by survey"
            intro="How each of your web and WhatsApp surveys did this week, with its running total alongside."
            lead="This week's breakdown:"
            items={rows.map((row) => ({
              title: row.title,
              description: describeCounts(row),
            }))}
          />
        ) : undefined
      }
    >
      <Section className="mb-9">
        <Display>Your week in review</Display>
        <Paragraph>{summary}</Paragraph>
      </Section>

      {rows.length ? null : (
        <Section className="mb-9">
          <Text className="font-14 font-inter text-fg-3 m-0">
            No surveys collected responses in this period.
          </Text>
        </Section>
      )}

      <PrimaryButton href={dashboardLink}>Open dashboard</PrimaryButton>
    </EmailLayout>
  );
}

WeeklyStatsEmail.PreviewProps = {
  periodStart: "Mon 10 Aug 2026",
  periodEnd: "Sun 16 Aug 2026",
  dashboardLink: "https://rateup.app/dashboard",
  unsubscribeUrl: "https://rateup.app/dashboard/settings/account",
  rows: [
    { title: "Coffee Bar — Customer Satisfaction", totalResponses: 1284, weeklyResponses: 96 },
    { title: "Post-visit NPS (WhatsApp)", totalResponses: 842, weeklyResponses: 61 },
    { title: "Staff feedback", totalResponses: 118, weeklyResponses: 4 },
  ],
} satisfies WeeklyStatsEmailProps;

export default WeeklyStatsEmail;
