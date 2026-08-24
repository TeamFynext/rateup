import { Section } from "react-email";
import {
  Band,
  Display,
  EmailLayout,
  Paragraph,
  PrimaryButton,
  SummaryRows,
  Title,
} from "../utils/email/react/components.js";

export interface TopPerformer {
  userId: string;
  name: string;
  email: string;
  totalMessages: number;
  resolvedChats: number;
  /** Pre-formatted by the caller — "2 min", or "—" when there is nothing to average. */
  averageResponseTime: string;
  averageResponseTimeSeconds: number;
}

export interface WeeklyReportTeam {
  teamId: string;
  name: string;
  color: string;
  assignedConversations: number;
  messagesSent: number;
  teamMembers: number;
  teamMembersOnline: number;
  averageResponseTime: string;
  averageResponseTimeSeconds: number;
}

export interface UsageStat {
  totalMessages: number;
  deliveredMessages: number;
  deliveredPercentage: number;
  failedMessages: number;
  failedPercentage: number;
  avgDeliveryTimeSeconds: number | null;
}

export interface WeeklyReportUsage {
  external: UsageStat;
  campaign: UsageStat;
}

export interface WeeklyReportEmailProps {
  orgName: string;
  /** Pre-formatted by the caller — "Last 7 Days". */
  dateRange: string;
  totalConversations: number;
  resolvedChats: number;
  pendingChats: number;
  averageResponseTime: string;
  topPerformers: TopPerformer[];
  teams: WeeklyReportTeam[];
  usage: WeeklyReportUsage;
  inboxLink: string;
  unsubscribeUrl?: string;
}

/** A share of a total, or "0%" when there is no total to divide by. */
function rate(part: number, total: number): string {
  if (!total) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

const count = (n: number) => n.toLocaleString("en-IN");

/** "142 messages · 38 resolved · 2 min average reply" — one performer's week on one line. */
function describePerformer(p: TopPerformer): string {
  return `${count(p.totalMessages)} messages · ${count(p.resolvedChats)} resolved · ${
    p.averageResponseTime
  } average reply`;
}

function describeTeam(team: WeeklyReportTeam): string {
  return `${count(team.messagesSent)} sent · ${count(team.assignedConversations)} assigned · ${
    team.averageResponseTime
  } average reply · ${count(team.teamMembers)} ${team.teamMembers === 1 ? "member" : "members"}`;
}

function usageRows(stat: UsageStat) {
  return [
    { label: "Sent", value: count(stat.totalMessages) },
    {
      label: "Delivered",
      value: `${count(stat.deliveredMessages)} (${stat.deliveredPercentage}%)`,
    },
    { label: "Failed", value: `${count(stat.failedMessages)} (${stat.failedPercentage}%)` },
  ];
}

/** The org's weekly inbox digest: volume, who handled it, and how WhatsApp delivery went. */
export function WeeklyReportEmail({
  orgName,
  dateRange,
  totalConversations,
  resolvedChats,
  pendingChats,
  averageResponseTime,
  topPerformers,
  teams,
  usage,
  inboxLink,
  unsubscribeUrl,
}: WeeklyReportEmailProps) {
  const summary =
    totalConversations === 0
      ? `No new conversations reached ${orgName} in the last week. Worth checking that your WhatsApp number and QR codes are still reachable.`
      : `${orgName} handled ${count(totalConversations)} ${
          totalConversations === 1 ? "conversation" : "conversations"
        } over ${dateRange.toLowerCase()}, answering in ${averageResponseTime} on average.`;

  return (
    <EmailLayout
      preview={
        totalConversations === 0
          ? `A quiet week for ${orgName}`
          : `${count(totalConversations)} conversations, ${rate(
              resolvedChats,
              totalConversations,
            )} resolved — ${dateRange}`
      }
      unsubscribeUrl={unsubscribeUrl}
      footerNote={
        <Paragraph tight>
          An automated weekly report. Replies to this address aren&apos;t monitored.
        </Paragraph>
      }
      /*
        Teams go in the tinted band rather than the main column: it is the one
        block a reader can skip, and the band is where the layout puts what
        follows the point of the email.
      */
      band={
        teams.length ? (
          <Band
            heading="Team by team"
            intro="How each team handled its share of the week's conversations."
            lead="This week's breakdown:"
            items={teams.map((team) => ({
              title: team.name,
              description: describeTeam(team),
            }))}
          />
        ) : undefined
      }
    >
      <Section className="mb-9">
        <Display>Your week in review</Display>
        <Paragraph>{summary}</Paragraph>
      </Section>

      <Section className="mb-10">
        <Title>Inbox</Title>
        <SummaryRows
          rows={[
            { label: "Conversations", value: count(totalConversations) },
            {
              label: "Resolved",
              value: `${count(resolvedChats)} (${rate(resolvedChats, totalConversations)})`,
            },
            {
              label: "Pending",
              value: `${count(pendingChats)} (${rate(pendingChats, totalConversations)})`,
            },
          ]}
          total={{ label: "Average response time", value: averageResponseTime }}
        />
      </Section>

      {topPerformers.length ? (
        <Section className="mb-10">
          <Title>Top performers</Title>
          <SummaryRows
            rows={topPerformers.map((performer, index) => ({
              label: `#${index + 1} ${performer.name}`,
              value: describePerformer(performer),
            }))}
          />
        </Section>
      ) : null}

      <Section className="mb-10">
        <Title>WhatsApp usage — conversations</Title>
        <SummaryRows rows={usageRows(usage.external)} />
      </Section>

      <Section className="mb-10">
        <Title>WhatsApp usage — campaigns</Title>
        <SummaryRows rows={usageRows(usage.campaign)} />
      </Section>

      <PrimaryButton href={inboxLink}>Open inbox</PrimaryButton>
    </EmailLayout>
  );
}

WeeklyReportEmail.PreviewProps = {
  orgName: "Coffee Bar",
  dateRange: "Last 7 Days",
  totalConversations: 412,
  resolvedChats: 366,
  pendingChats: 46,
  averageResponseTime: "4 min",
  inboxLink: "https://rateup.app/dashboard/inbox",
  unsubscribeUrl: "https://rateup.app/dashboard/settings/account",
  topPerformers: [
    {
      userId: "u1",
      name: "Ann Smith",
      email: "ann@example.com",
      totalMessages: 618,
      resolvedChats: 142,
      averageResponseTime: "2 min",
      averageResponseTimeSeconds: 120,
    },
    {
      userId: "u2",
      name: "Rahul Nair",
      email: "rahul@example.com",
      totalMessages: 402,
      resolvedChats: 96,
      averageResponseTime: "5 min",
      averageResponseTimeSeconds: 300,
    },
  ],
  teams: [
    {
      teamId: "t1",
      name: "Front desk",
      color: "#1873E8",
      assignedConversations: 240,
      messagesSent: 1020,
      teamMembers: 6,
      teamMembersOnline: 4,
      averageResponseTime: "3 min",
      averageResponseTimeSeconds: 180,
    },
  ],
  usage: {
    external: {
      totalMessages: 1840,
      deliveredMessages: 1802,
      deliveredPercentage: 97.9,
      failedMessages: 38,
      failedPercentage: 2.1,
      avgDeliveryTimeSeconds: 3,
    },
    campaign: {
      totalMessages: 5200,
      deliveredMessages: 5024,
      deliveredPercentage: 96.6,
      failedMessages: 176,
      failedPercentage: 3.4,
      avgDeliveryTimeSeconds: 5,
    },
  },
} satisfies WeeklyReportEmailProps;

export default WeeklyReportEmail;
