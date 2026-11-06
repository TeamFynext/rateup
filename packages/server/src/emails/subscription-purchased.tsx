import { Section } from "react-email";
import {
  Display,
  EmailLayout,
  Paragraph,
  PrimaryButton,
  SummaryRows,
} from "../utils/email/react/components.js";

export interface SubscriptionPurchasedEmailProps {
  orgName: string;
  /** The address the payment provider charged. */
  customerEmail: string;
  planName: string;
  /** Already formatted for display; absent when the provider reported no amount. */
  amountPaid?: string;
  /** "Razorpay" or "Stripe" — which provider took the money. */
  gateway: string;
  billingCycleEndsOn: string;
}

/** Internal notification — a subscription payment went through. */
export function SubscriptionPurchasedEmail({
  orgName,
  customerEmail,
  planName,
  amountPaid,
  gateway,
  billingCycleEndsOn,
}: SubscriptionPurchasedEmailProps) {
  return (
    <EmailLayout
      preview={`${orgName} subscribed to the ${planName} plan`}
      footerNote={
        <Paragraph tight>
          Sent automatically when a subscription&apos;s first payment succeeds. Renewals do not send
          this. Replies go to the customer, not to this mailbox.
        </Paragraph>
      }
    >
      <Section className="mb-9">
        <Display>New paid subscription</Display>
        <Paragraph>
          {orgName} is now on the {planName} plan. The payment has cleared and the plan&apos;s
          features are live on the account.
        </Paragraph>
      </Section>

      <Section className="mb-10">
        <SummaryRows
          rows={[
            { label: "Organisation", value: orgName },
            { label: "Billing email", value: customerEmail },
            { label: "Plan", value: planName },
            { label: "Amount paid", value: amountPaid ?? "—" },
            { label: "Paid via", value: gateway },
            { label: "Cycle ends", value: billingCycleEndsOn },
          ]}
        />
      </Section>

      <Section>
        <PrimaryButton href={`mailto:${customerEmail}`}>Reach out to {orgName}</PrimaryButton>
      </Section>
    </EmailLayout>
  );
}

SubscriptionPurchasedEmail.PreviewProps = {
  orgName: "Northside Coffee",
  customerEmail: "priya@example.com",
  planName: "Pro",
  amountPaid: "₹4,000.00",
  gateway: "Razorpay",
  billingCycleEndsOn: "12 Oct 2026",
} satisfies SubscriptionPurchasedEmailProps;

export default SubscriptionPurchasedEmail;
