import { Section, Text } from "react-email";
import {
  Callout,
  Display,
  EmailLayout,
  Muted,
  Paragraph,
  PrimaryButton,
} from "../utils/email/react/components.js";

export interface PaymentFailedEmailProps {
  isRenewal?: boolean;
  billingLink: string;
}

export function PaymentFailedEmail({ isRenewal = false, billingLink }: PaymentFailedEmailProps) {
  return (
    <EmailLayout
      preview={
        isRenewal
          ? "Your RateUp renewal didn't go through"
          : "Your RateUp payment didn't go through"
      }
      note={
        <Muted>
          Cards usually fail for something small — an expiry date that has rolled over, or a bank
          declining an online charge. Updating the card is normally all it takes.
        </Muted>
      }
    >
      <Section className="mb-8">
        <Display>Payment didn&apos;t go through</Display>
        <Paragraph>
          {isRenewal
            ? "Your bank declined the charge for this month's RateUp renewal, so the subscription hasn't renewed."
            : "Your bank declined the charge for your RateUp subscription, so it hasn't started."}
        </Paragraph>
      </Section>

      <Callout tone="danger">
        <Text className="font-14 text-danger m-0">
          Premium features are paused until a payment clears. Your surveys, responses, and contacts
          are untouched and come straight back.
        </Text>
      </Callout>

      <Section className="pt-9">
        <PrimaryButton href={billingLink}>Update payment method</PrimaryButton>
      </Section>
    </EmailLayout>
  );
}

PaymentFailedEmail.PreviewProps = {
  isRenewal: true,
  billingLink: "https://rateup.app/dashboard/settings/billing",
} satisfies PaymentFailedEmailProps;

export default PaymentFailedEmail;
