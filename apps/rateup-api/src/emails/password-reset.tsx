import { Section } from "react-email";
import {
  Display,
  EmailLayout,
  Muted,
  Paragraph,
  PrimaryButton,
} from "../utils/email/react/components.js";

export interface PasswordResetEmailProps {
  resetLink: string;
}

export function PasswordResetEmail({ resetLink }: PasswordResetEmailProps) {
  return (
    <EmailLayout
      preview="Reset your RateUp password"
      note={
        <Muted>
          The link works once and expires in an hour. If you didn&apos;t ask for it, ignore this
          email — your current password stays exactly as it is until someone opens the link and sets
          a new one.
        </Muted>
      }
    >
      <Section className="mb-9">
        <Display>Reset your password</Display>
        <Paragraph>
          Someone asked to reset the password on the RateUp account registered to this address. If
          that was you, pick a new one below.
        </Paragraph>
      </Section>

      <PrimaryButton href={resetLink}>Set a new password</PrimaryButton>
    </EmailLayout>
  );
}

PasswordResetEmail.PreviewProps = {
  resetLink: "https://rateup.app/auth/reset-password?token=example",
} satisfies PasswordResetEmailProps;

export default PasswordResetEmail;
