import { Section } from "react-email";
import {
  Display,
  EmailLayout,
  Paragraph,
  PrimaryButton,
  SummaryRows,
  Title,
} from "../utils/email/react/components.js";

export interface OrgSignupEmailProps {
  orgName: string;
  userName: string;
  userEmail: string;
  phone: string;
  /** The onboarding questionnaire, all optional — it is a free-form Json column. */
  services: string[];
  industry?: string;
  integration?: string;
  adminLink: string;
}

/** Internal notification — a new organisation finished onboarding. */
export function OrgSignupEmail({
  orgName,
  userName,
  userEmail,
  phone,
  services,
  industry,
  integration,
  adminLink,
}: OrgSignupEmailProps) {
  return (
    <EmailLayout
      preview={`${orgName} just signed up for RateUp`}
      footerNote={
        <Paragraph tight>
          Sent automatically when an organisation completes onboarding. Replies to this address
          aren&apos;t monitored.
        </Paragraph>
      }
    >
      <Section className="mb-9">
        <Display>New sign-up</Display>
        <Paragraph>{orgName} finished onboarding.</Paragraph>
      </Section>

      <Section className="mb-10">
        <Title>Owner</Title>
        <SummaryRows
          rows={[
            { label: "Organisation", value: orgName },
            { label: "Name", value: userName },
            { label: "Email", value: userEmail },
            { label: "Phone", value: phone },
          ]}
        />
      </Section>

      <Section className="mb-10">
        <Title>Onboarding questionnaire</Title>
        <SummaryRows
          rows={[
            { label: "Services", value: services.length ? services.join(", ") : "Not answered" },
            { label: "Industry", value: industry || "Not answered" },
            { label: "Integration", value: integration || "No integration selected" },
          ]}
        />
      </Section>

      <PrimaryButton href={adminLink}>Open in admin</PrimaryButton>
    </EmailLayout>
  );
}

OrgSignupEmail.PreviewProps = {
  orgName: "Coffee Bar",
  userName: "Priya Menon",
  userEmail: "priya@example.com",
  phone: "+91 98765 43210",
  services: ["Reviews", "Loyalty"],
  industry: "Food & Beverage",
  integration: "Shopify",
  adminLink: "https://rateup.app/admin/orgs/org-1",
} satisfies OrgSignupEmailProps;

export default OrgSignupEmail;
