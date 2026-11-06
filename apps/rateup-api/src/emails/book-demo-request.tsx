import { Section } from "react-email";
import {
  Display,
  EmailLayout,
  Paragraph,
  PrimaryButton,
  SummaryRows,
  Title,
} from "../utils/email/react/components.js";

export interface BookDemoRequestEmailProps {
  name: string;
  workEmail: string;
  businessName: string;
  phone: string;
  /** Already rendered for reading — "2026-09-01 at 2:30 PM", or "No preference". */
  preferredSlot: string;
  message?: string;
}

/** Internal notification — a visitor asked for a demo from the marketing site. */
export function BookDemoRequestEmail({
  name,
  workEmail,
  businessName,
  phone,
  preferredSlot,
  message,
}: BookDemoRequestEmailProps) {
  return (
    <EmailLayout
      preview={`${name} from ${businessName} wants a demo`}
      footerNote={
        <Paragraph tight>
          Sent automatically by the demo form on rateup.app. Replies go to this mailbox, not to the
          requester.
        </Paragraph>
      }
    >
      <Section className="mb-9">
        <Display>New demo request</Display>
        <Paragraph>
          {name} from {businessName} asked for a walkthrough.
        </Paragraph>
      </Section>

      <Section className="mb-10">
        <SummaryRows
          rows={[
            { label: "Name", value: name },
            { label: "Business", value: businessName },
            { label: "Email", value: workEmail },
            { label: "Phone", value: phone },
            { label: "Preferred slot", value: preferredSlot },
          ]}
        />
      </Section>

      {/*
        Free-form prose, so it gets its own block rather than a summary row —
        a paragraph does not fit a right-aligned value cell.
      */}
      {message ? (
        <Section className="mb-10">
          <Title>What they wrote</Title>
          <Paragraph>{message}</Paragraph>
        </Section>
      ) : null}

      <PrimaryButton href={`mailto:${workEmail}`}>Reply to {name}</PrimaryButton>
    </EmailLayout>
  );
}

BookDemoRequestEmail.PreviewProps = {
  name: "Priya Menon",
  workEmail: "priya@example.com",
  businessName: "Coffee Bar",
  phone: "+91 98765 43210",
  preferredSlot: "2026-09-01 at 2:30 PM",
  message: "We run four outlets and want WhatsApp feedback after each visit.",
} satisfies BookDemoRequestEmailProps;

export default BookDemoRequestEmail;
