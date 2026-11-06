import { Section } from "react-email";
import {
  Band,
  Display,
  EmailLayout,
  Muted,
  Paragraph,
  PrimaryButton,
} from "../utils/email/react/components.js";

export interface VerifyEmailProps {
  verifyLink: string;
  userName?: string;
}

export function VerifyEmail({ verifyLink, userName }: VerifyEmailProps) {
  return (
    <EmailLayout
      preview="Confirm your email to finish setting up RateUp"
      note={
        <Muted>
          The link expires in 24 hours. If you didn&apos;t create a RateUp account, ignore this
          email — nothing is activated until someone confirms this address.
        </Muted>
      }
      band={
        <Band
          heading="What happens next"
          intro="Confirming takes one click. After that your workspace is open and there's no setup to grind through — most teams have their first survey collecting answers the same afternoon."
          lead="Here's what's waiting:"
          items={[
            {
              title: "Your first survey",
              description:
                "Start from a template or write your own questions. Share it as a link, a QR code, or a WhatsApp message.",
            },
            {
              title: "Answers as they land",
              description:
                "Every response arrives in your dashboard the moment it's submitted, with the customer's details attached.",
            },
            {
              title: "Your team alongside you",
              description:
                "Invite the people who'll read the feedback and follow up, and give each of them the access they need.",
            },
          ]}
        />
      }
    >
      <Section className="mb-9">
        <Display>Confirm your email</Display>
        <Paragraph>
          {userName ? `Hi ${userName} — one` : "One"} last step. Confirming this address activates
          your RateUp account and makes sure password resets and response alerts reach you.
        </Paragraph>
      </Section>

      <PrimaryButton href={verifyLink}>Confirm email address</PrimaryButton>
    </EmailLayout>
  );
}

VerifyEmail.PreviewProps = {
  verifyLink: "https://rateup.app/auth/verify?token=example",
  userName: "Ayesha",
} satisfies VerifyEmailProps;

export default VerifyEmail;
