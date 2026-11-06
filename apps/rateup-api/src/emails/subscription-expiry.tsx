import { Section, Text } from "react-email";
import {
  ButtonPair,
  Callout,
  Display,
  EmailLayout,
  Paragraph,
} from "../utils/email/react/components.js";

/** Which point in the expiry sequence this reminder is. */
export type ExpiryStage = "30-days" | "15-days" | "7-days" | "3-days" | "tomorrow" | "expired";

export interface SubscriptionExpiryEmailProps {
  stage: ExpiryStage;
  ownerName: string;
  planName: string;
  /** Pre-formatted for the recipient by the caller. */
  expiresAt: string;
  statsLink: string;
  billingLink: string;
}

const stageHeadline: Record<ExpiryStage, string> = {
  "30-days": "Your plan renews in a month",
  "15-days": "Your plan renews in 15 days",
  "7-days": "Your plan renews in a week",
  "3-days": "Your plan renews in 3 days",
  tomorrow: "Your plan expires tomorrow",
  expired: "Your plan has expired",
};

export function SubscriptionExpiryEmail({
  stage,
  ownerName,
  planName,
  expiresAt,
  statsLink,
  billingLink,
}: SubscriptionExpiryEmailProps) {
  const expired = stage === "expired";
  const urgent = expired || stage === "tomorrow";

  const detail = expired
    ? `your subscription to RateUp ${planName} ran out on ${expiresAt}.`
    : stage === "tomorrow"
      ? `your subscription to RateUp ${planName} expires tomorrow, ${expiresAt}.`
      : `your subscription to RateUp ${planName} is up for renewal on ${expiresAt}.`;

  return (
    <EmailLayout preview={`${stageHeadline[stage]} — RateUp ${planName}`}>
      <Section className="mb-8">
        <Display>{stageHeadline[stage]}</Display>
        <Paragraph>
          Hi {ownerName}, {detail}
        </Paragraph>
      </Section>

      {urgent ? (
        <Callout tone={expired ? "danger" : "warning"}>
          <Text className={`font-14 m-0 ${expired ? "text-danger" : "text-warning"}`}>
            {expired
              ? "Premium features are paused. Nothing has been deleted — your surveys, responses, and contacts are all still here and come back the moment you renew."
              : "Renew before it lapses and nothing changes. Let it lapse and premium features pause until you come back."}
          </Text>
        </Callout>
      ) : (
        <Paragraph>
          There&apos;s nothing to do if your billing details are current — we&apos;ll handle the
          renewal for you. If you&apos;re weighing up a different plan, your usage is the best place
          to start.
        </Paragraph>
      )}

      <Section className="pt-9">
        <ButtonPair
          primary={{ href: billingLink, label: expired ? "Renew plan" : "View current plan" }}
          secondary={{ href: statsLink, label: "View usage" }}
        />
      </Section>
    </EmailLayout>
  );
}

SubscriptionExpiryEmail.PreviewProps = {
  stage: "tomorrow",
  ownerName: "Priya",
  planName: "Growth",
  expiresAt: "18 Aug 2026",
  statsLink: "https://rateup.app/dashboard/settings/billing",
  billingLink: "https://rateup.app/dashboard/settings/billing",
} satisfies SubscriptionExpiryEmailProps;

export default SubscriptionExpiryEmail;
