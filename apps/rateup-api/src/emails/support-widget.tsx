import { Section } from "react-email";
import {
  Display,
  EmailLayout,
  Paragraph,
  PrimaryButton,
  SummaryRows,
  Title,
} from "../utils/email/react/components.js";

export interface SupportWidgetEmailProps {
  name: string;
  email: string;
  message: string;
  /** The org the widget belongs to, so the notification reads as their own, not RateUp's. */
  orgName?: string;
}

/**
 * Internal notification — a visitor wrote in from the Email tab of an org's embedded support
 * widget. Distinct from `contact-form.tsx`, which is RateUp's own marketing form and always
 * goes to RateUp; this one is per-org and lands in the org owner's inbox.
 */
export function SupportWidgetEmail({ name, email, message, orgName }: SupportWidgetEmailProps) {
  return (
    <EmailLayout
      preview={`New support message from ${name}`}
      footerNote={
        <Paragraph tight>
          Sent automatically by the support widget on {orgName ?? "your website"}. Replies go to the
          sender, not to this mailbox.
        </Paragraph>
      }
    >
      <Section className="mb-9">
        <Display>New support message</Display>
        <Paragraph>
          {name} wrote in from the support widget on {orgName ?? "your website"}.
        </Paragraph>
      </Section>

      <Section className="mb-10">
        <SummaryRows
          rows={[
            { label: "Name", value: name },
            { label: "Email", value: email },
          ]}
        />
      </Section>

      {/* Free-form prose, so it gets its own block rather than a right-aligned summary row. */}
      <Section className="mb-10">
        <Title>What they wrote</Title>
        <Paragraph>{message}</Paragraph>
      </Section>

      <PrimaryButton href={`mailto:${email}`}>Reply to {name}</PrimaryButton>
    </EmailLayout>
  );
}

SupportWidgetEmail.PreviewProps = {
  name: "Priya Menon",
  email: "priya@example.com",
  orgName: "Cafe Aroma",
  message:
    "Hi — I ordered a table for six on Friday but never got a confirmation. Could someone check?",
} satisfies SupportWidgetEmailProps;

export default SupportWidgetEmail;
