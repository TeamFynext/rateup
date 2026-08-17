import { Section } from "react-email";
import {
  Display,
  EmailLayout,
  Paragraph,
  PrimaryButton,
  SummaryRows,
} from "../utils/email/react/components.js";

export interface PricingPlanSelectedEmailProps {
  name: string;
  email: string;
  planName: string;
  orgName?: string;
}

/** Internal notification — someone started a trial from the pricing page. */
export function PricingPlanSelectedEmail({
  name,
  email,
  planName,
  orgName,
}: PricingPlanSelectedEmailProps) {
  return (
    <EmailLayout
      preview={`${name} started a trial of the ${planName} plan`}
      footerNote={
        <Paragraph tight>
          Sent automatically from the rateup.app pricing page. Replies go to the prospect, not to
          this mailbox.
        </Paragraph>
      }
    >
      <Section className="mb-9">
        <Display>New trial signup</Display>
        <Paragraph>
          {name} started a trial of the {planName} plan from the pricing page. Worth a note while
          they&apos;re still evaluating.
        </Paragraph>
      </Section>

      <Section className="mb-10">
        <SummaryRows
          rows={[
            { label: "Full name", value: name },
            { label: "Email", value: email },
            { label: "Organisation", value: orgName ?? "—" },
            { label: "Plan selected", value: planName },
          ]}
        />
      </Section>

      <Section>
        <PrimaryButton href={`mailto:${email}`}>Reach out to {name}</PrimaryButton>
      </Section>
    </EmailLayout>
  );
}

PricingPlanSelectedEmail.PreviewProps = {
  name: "Priya Menon",
  email: "priya@example.com",
  orgName: "Northside Coffee",
  planName: "Growth",
} satisfies PricingPlanSelectedEmailProps;

export default PricingPlanSelectedEmail;
