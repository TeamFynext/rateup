import { Section } from "react-email";
import {
  Display,
  EmailLayout,
  Paragraph,
  PrimaryButton,
  SummaryRows,
  Title,
} from "../utils/email/react/components.js";

export interface PartnerInquiryEmailProps {
  fullName: string;
  workEmail: string;
  phone: string;
  companyName: string;
  website: string;
  country: string;
  businessType: string;
  companySize: string;
  yearsInBusiness: string;
  whyPartner: string;
  services: string[];
  referralVolume: string;
  managesClients: string;
  apiExperience: string;
  canOnboard: string;
}

/** Internal notification — someone applied through the partner form. */
export function PartnerInquiryEmail({
  fullName,
  workEmail,
  phone,
  companyName,
  website,
  country,
  businessType,
  companySize,
  yearsInBusiness,
  whyPartner,
  services,
  referralVolume,
  managesClients,
  apiExperience,
  canOnboard,
}: PartnerInquiryEmailProps) {
  return (
    <EmailLayout
      preview={`${companyName} applied to partner with RateUp`}
      footerNote={
        <Paragraph tight>
          Sent automatically by the partner form on rateup.app. Replies go to this mailbox, not to
          the applicant.
        </Paragraph>
      }
    >
      <Section className="mb-9">
        <Display>New partner enquiry</Display>
        <Paragraph>
          {fullName} of {companyName} applied to partner with RateUp.
        </Paragraph>
      </Section>

      {/*
        Three blocks rather than one long table: who they are, what the company
        is, and how well they fit — the order the team reads them in.
      */}
      <Section className="mb-10">
        <Title>Contact</Title>
        <SummaryRows
          rows={[
            { label: "Name", value: fullName },
            { label: "Email", value: workEmail },
            { label: "Phone", value: phone },
          ]}
        />
      </Section>

      <Section className="mb-10">
        <Title>Company</Title>
        <SummaryRows
          rows={[
            { label: "Company", value: companyName },
            { label: "Website", value: website },
            { label: "Country", value: country },
            { label: "Business type", value: businessType },
            { label: "Company size", value: companySize },
            { label: "Years in business", value: yearsInBusiness },
          ]}
        />
      </Section>

      <Section className="mb-10">
        <Title>Fit</Title>
        <SummaryRows
          rows={[
            { label: "Services", value: services.join(", ") },
            { label: "Referral volume", value: referralVolume },
            { label: "Manages clients", value: managesClients },
            { label: "API experience", value: apiExperience },
            { label: "Can onboard", value: canOnboard },
          ]}
        />
      </Section>

      <Section className="mb-10">
        <Title>Why they want to partner</Title>
        <Paragraph>{whyPartner}</Paragraph>
      </Section>

      <PrimaryButton href={`mailto:${workEmail}`}>Reply to {fullName}</PrimaryButton>
    </EmailLayout>
  );
}

PartnerInquiryEmail.PreviewProps = {
  fullName: "Priya Menon",
  workEmail: "priya@example.com",
  phone: "+91 98765 43210",
  companyName: "Northlight Digital",
  website: "northlight.example",
  country: "India",
  businessType: "Agency",
  companySize: "11-50",
  yearsInBusiness: "6",
  whyPartner: "Most of our retail clients already ask us for a WhatsApp feedback loop.",
  services: ["Reviews", "Loyalty", "Campaigns"],
  referralVolume: "10-20 per quarter",
  managesClients: "Yes",
  apiExperience: "Yes",
  canOnboard: "Yes",
} satisfies PartnerInquiryEmailProps;

export default PartnerInquiryEmail;
