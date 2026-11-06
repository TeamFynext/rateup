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
  goals: string[];
  industry?: string;
  integrations: string[];
  location?: string;
  website?: string;
  teamSize?: string;
  adminLink: string;
}

/** Internal notification — a new organisation signed up. */
export function OrgSignupEmail({
  orgName,
  userName,
  userEmail,
  phone,
  goals,
  industry,
  integrations,
  location,
  website,
  teamSize,
  adminLink,
}: OrgSignupEmailProps) {
  return (
    <EmailLayout
      preview={`${orgName} just signed up for RateUp`}
      footerNote={
        <Paragraph tight>
          Sent automatically when an organisation signs up. Replies to this address aren&apos;t
          monitored.
        </Paragraph>
      }
    >
      <Section className="mb-9">
        <Display>New sign-up</Display>
        <Paragraph>{orgName} just created a RateUp account.</Paragraph>
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
        <Title>Signup answers</Title>
        <SummaryRows
          rows={[
            { label: "Goals", value: goals.length ? goals.join(", ") : "Not answered" },
            { label: "Industry", value: industry || "Not answered" },
            {
              label: "Integrations",
              value: integrations.length ? integrations.join(", ") : "None selected",
            },
            { label: "Team size", value: teamSize || "Not answered" },
            { label: "Location", value: location || "Not answered" },
            { label: "Website", value: website || "Not given" },
          ]}
        />
      </Section>

      <PrimaryButton href={adminLink}>Open in admin</PrimaryButton>
    </EmailLayout>
  );
}

OrgSignupEmail.PreviewProps = {
  orgName: "Coffee Bar",
  userName: "Alex Morgan",
  userEmail: "alex@example.com",
  phone: "+1 555 0100",
  goals: ["Reviews", "Loyalty"],
  industry: "Food & Beverage",
  integrations: ["Shopify"],
  location: "Springfield",
  website: "https://example.com",
  teamSize: "2-10",
  adminLink: "https://rateup.app/admin/orgs/org-1",
} satisfies OrgSignupEmailProps;

export default OrgSignupEmail;
