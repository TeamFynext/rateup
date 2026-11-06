import { Section } from "react-email";
import {
  Display,
  EmailLayout,
  Paragraph,
  PrimaryButton,
  SummaryRows,
  Title,
} from "../utils/email/react/components.js";

export interface ContactFormEmailProps {
  name: string;
  email: string;
  message: string;
}

/** Internal notification — a visitor submitted the marketing site's contact form. */
export function ContactFormEmail({ name, email, message }: ContactFormEmailProps) {
  return (
    <EmailLayout
      preview={`New contact form message from ${name}`}
      footerNote={
        <Paragraph tight>
          Sent automatically by the contact form on rateup.app. Replies go to the sender, not to
          this mailbox.
        </Paragraph>
      }
    >
      <Section className="mb-9">
        <Display>New contact enquiry</Display>
        <Paragraph>{name} filled in the contact form on rateup.app.</Paragraph>
      </Section>

      <Section className="mb-10">
        <SummaryRows
          rows={[
            { label: "Name", value: name },
            { label: "Email", value: email },
          ]}
        />
      </Section>

      {/*
        The message is free-form prose, so it gets its own block rather than a
        summary row — a paragraph does not fit a right-aligned value cell.
      */}
      <Section className="mb-10">
        <Title>What they wrote</Title>
        <Paragraph>{message}</Paragraph>
      </Section>

      <PrimaryButton href={`mailto:${email}`}>Reply to {name}</PrimaryButton>
    </EmailLayout>
  );
}

ContactFormEmail.PreviewProps = {
  name: "Priya Menon",
  email: "priya@example.com",
  message:
    "Hi — we run four restaurants and want to collect WhatsApp feedback after each visit. Could someone walk us through pricing?",
} satisfies ContactFormEmailProps;

export default ContactFormEmail;
