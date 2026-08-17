import { Section } from "react-email";
import {
  Band,
  Display,
  EmailLayout,
  Muted,
  Paragraph,
  PrimaryButton,
  SummaryRows,
  type HighlightItem,
} from "../utils/email/react/components.js";

export interface SubscriptionActivatedEmailProps {
  planName: string;
  /** Pre-formatted for the recipient's locale by the caller. */
  validUntil: string;
  isRenewed?: boolean;
  billingLink: string;
  /** Pre-formatted with its currency. Absent when the channel reports no amount. */
  amountPaid?: string;
  /** Shown to new subscribers only — a renewal does not need onboarding. */
  nextSteps?: HighlightItem[];
}

export function SubscriptionActivatedEmail({
  planName,
  validUntil,
  isRenewed = false,
  billingLink,
  amountPaid,
  nextSteps,
}: SubscriptionActivatedEmailProps) {
  const isFreePlan = planName.trim().toUpperCase() === "FREE PLAN";
  const showOnboarding = !isRenewed && Boolean(nextSteps?.length);

  return (
    <EmailLayout
      preview={
        isRenewed
          ? `Your RateUp ${planName} plan is renewed through ${validUntil}`
          : `Your RateUp ${planName} plan is active`
      }
      note={
        <Muted>
          Keep this email for your records. Invoices and past payments are always available under
          billing.
        </Muted>
      }
      band={
        showOnboarding ? (
          <Band
            heading="Where to start"
            intro="Your plan is live, so the only thing left is to put it to work. These two take about ten minutes between them and cover most of what a new workspace needs."
            lead="Start here:"
            items={nextSteps ?? []}
          />
        ) : undefined
      }
    >
      <Section className="mb-9">
        <Display>{isRenewed ? "Subscription renewed" : "You’re all set"}</Display>
        <Paragraph>
          {isRenewed
            ? `Your payment went through and your ${planName} plan continues without a break.`
            : `Your payment went through and your ${planName} plan is active.`}
          {isFreePlan ? "" : " Every premium feature is unlocked right now."}
        </Paragraph>
      </Section>

      <Section className="mb-10">
        <SummaryRows
          rows={[
            { label: "Plan", value: planName },
            { label: "Valid until", value: validUntil },
          ]}
          total={amountPaid ? { label: "Paid", value: amountPaid } : undefined}
        />
      </Section>

      <PrimaryButton href={billingLink}>View billing</PrimaryButton>
    </EmailLayout>
  );
}

SubscriptionActivatedEmail.PreviewProps = {
  planName: "Growth",
  validUntil: "18 Sep 2026",
  isRenewed: false,
  billingLink: "https://rateup.app/dashboard/settings/billing",
  amountPaid: "₹2,499.00",
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
} satisfies SubscriptionActivatedEmailProps;

export default SubscriptionActivatedEmail;
