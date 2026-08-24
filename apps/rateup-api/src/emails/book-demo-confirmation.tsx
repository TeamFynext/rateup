import { Section } from "react-email";
import {
  Display,
  EmailLayout,
  Muted,
  Paragraph,
  PrimaryButton,
  SummaryRows,
} from "../utils/email/react/components.js";

export interface BookDemoConfirmationEmailProps {
  name: string;
  businessName: string;
  phone: string;
  /** Already rendered for reading — "2026-09-01 at 2:30 PM", or "No preference". */
  preferredSlot: string;
  message?: string;
  websiteLink: string;
}

/** The requester's own receipt, repeating the booking back to them — minus their email address. */
export function BookDemoConfirmationEmail({
  name,
  businessName,
  phone,
  preferredSlot,
  message,
  websiteLink,
}: BookDemoConfirmationEmailProps) {
  return (
    <EmailLayout
      preview="Your RateUp demo request is in — we'll be in touch shortly"
      note={
        <Muted>
          Booked this by mistake, or need a different time? Reply to this email and we&apos;ll sort
          it out.
        </Muted>
      }
    >
      <Section className="mb-9">
        <Display>Demo booked</Display>
        <Paragraph>
          Thanks for your interest, {name}. We have your request and someone will reach out to
          confirm a time with you.
        </Paragraph>
      </Section>

      <Section className="mb-10">
        <SummaryRows
          rows={[
            { label: "Business", value: businessName },
            { label: "Phone", value: phone },
            { label: "Preferred slot", value: preferredSlot },
            ...(message ? [{ label: "Your note", value: message }] : []),
          ]}
        />
      </Section>

      <PrimaryButton href={websiteLink}>Visit RateUp</PrimaryButton>
    </EmailLayout>
  );
}

BookDemoConfirmationEmail.PreviewProps = {
  name: "Priya Menon",
  businessName: "Coffee Bar",
  phone: "+91 98765 43210",
  preferredSlot: "2026-09-01 at 2:30 PM",
  message: "We run four outlets and want WhatsApp feedback after each visit.",
  websiteLink: "https://rateup.app",
} satisfies BookDemoConfirmationEmailProps;

export default BookDemoConfirmationEmail;
