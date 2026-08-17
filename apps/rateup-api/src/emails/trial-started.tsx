import { Section, Text } from "react-email";
import {
  Band,
  Callout,
  Display,
  EmailLayout,
  Paragraph,
  PrimaryButton,
  SummaryRows,
  type HighlightItem,
} from "../utils/email/react/components.js";

export interface TrialStartedEmailProps {
  userName: string;
  planName: string;
  trialDays: number;
  /** Pre-formatted for the recipient by the caller. */
  expiresAt: string;
  dashboardLink: string;
  /** Omitted when the trial has no card on file to charge afterwards. */
  renewalPrice?: string;
  nextSteps?: HighlightItem[];
  /** Marketing mail, so the footer carries Collage's unsubscribe line. */
  unsubscribeUrl?: string;
}

export function TrialStartedEmail({
  userName,
  planName,
  trialDays,
  expiresAt,
  dashboardLink,
  renewalPrice,
  nextSteps,
  unsubscribeUrl,
}: TrialStartedEmailProps) {
  return (
    <EmailLayout
      preview={`Your ${trialDays}-day RateUp trial is live until ${expiresAt}`}
      unsubscribeUrl={unsubscribeUrl}
      band={
        nextSteps?.length ? (
          <Band
            heading="Make the trial count"
            intro={`${trialDays} days is plenty, but only if real feedback starts arriving early. Teams that get a survey out in the first few days are the ones who know whether RateUp fits by the end.`}
            lead="Start here:"
            items={nextSteps}
          />
        ) : undefined
      }
    >
      <Section className="mb-9">
        <Display>Your trial has started</Display>
        <Paragraph>
          Hi {userName} — your {trialDays}-day trial of RateUp {planName} is live. Every feature on
          the plan is unlocked, with no limits held back for paying accounts.
        </Paragraph>
      </Section>

      {/*
        No `total` row: a future charge is not a sum of what is above it, and the
        renewal terms need the cancellation deadline alongside them — which is
        what the callout below carries.
      */}
      <Section className="mb-10">
        <SummaryRows
          rows={[
            { label: "Plan", value: planName },
            { label: "Trial length", value: `${trialDays} days` },
            { label: "Trial ends", value: expiresAt },
          ]}
        />
      </Section>

      <PrimaryButton href={dashboardLink}>Open your workspace</PrimaryButton>

      {renewalPrice ? (
        <Section className="pt-9">
          <Callout tone="info">
            <Text className="font-14 font-inter text-fg-2 m-0">
              When the trial ends on {expiresAt}, your subscription renews automatically at{" "}
              {renewalPrice}. Cancel any time before then and you won&apos;t be charged.
            </Text>
          </Callout>
        </Section>
      ) : null}
    </EmailLayout>
  );
}

TrialStartedEmail.PreviewProps = {
  userName: "Priya",
  planName: "Growth",
  trialDays: 14,
  expiresAt: "31 Aug 2026",
  dashboardLink: "https://rateup.app/dashboard",
  renewalPrice: "₹2,499 / month",
  unsubscribeUrl: "https://rateup.app/dashboard/settings/account",
  nextSteps: [
    {
      title: "Create your first survey",
      description:
        "Start from a template or write your own questions, then share it over the web or WhatsApp.",
      href: "https://rateup.app/dashboard/surveys",
    },
    {
      title: "Invite your team",
      description: "Bring in the people who'll read responses and follow up with customers.",
      href: "https://rateup.app/dashboard/settings/team",
    },
  ],
} satisfies TrialStartedEmailProps;

export default TrialStartedEmail;
