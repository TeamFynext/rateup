import { Section } from "react-email";
import {
  Display,
  EmailLayout,
  Muted,
  OtpCode,
  Paragraph,
} from "../utils/email/react/components.js";

export interface OtpEmailProps {
  otp: string;
  /** Named in the copy when the OTP guards a specific survey. */
  surveyName?: string;
}

export function OtpEmail({ otp, surveyName }: OtpEmailProps) {
  return (
    <EmailLayout
      preview={`${otp} is your RateUp verification code`}
      note={
        <Muted>
          The code expires in 10 minutes and works once. If you didn&apos;t ask for it, ignore this
          email — nobody can get in with the code alone.
        </Muted>
      }
    >
      <Section className="mb-8">
        <Display>Your verification code</Display>
        <Paragraph>
          {surveyName
            ? `Enter this code to continue with ${surveyName}.`
            : "Enter this code on the screen you left open to continue."}
        </Paragraph>
      </Section>

      <OtpCode code={otp} />
    </EmailLayout>
  );
}

OtpEmail.PreviewProps = {
  otp: "482915",
  surveyName: "Coffee Bar — Customer Satisfaction",
} satisfies OtpEmailProps;

export default OtpEmail;
