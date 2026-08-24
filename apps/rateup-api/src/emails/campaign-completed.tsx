import { Section } from "react-email";
import {
  Display,
  EmailLayout,
  Paragraph,
  PrimaryButton,
  SummaryRows,
} from "../utils/email/react/components.js";

export interface CampaignCompletedEmailProps {
  campaignName: string;
  campaignLink: string;
}

/** Sent to every member of the campaign's team once the last message has gone out. */
export function CampaignCompletedEmail({
  campaignName,
  campaignLink,
}: CampaignCompletedEmailProps) {
  return (
    <EmailLayout
      preview={`${campaignName} has finished sending`}
      /* No unsubscribe line: this is operational mail to the team that owns the
         campaign, not a digest or a marketing send. */
      footerNote={
        <Paragraph tight>
          You&apos;re getting this because you&apos;re on the team that owns this campaign.
        </Paragraph>
      }
    >
      <Section className="mb-9">
        <Display>Campaign completed</Display>
        <Paragraph>
          {campaignName} has finished running. Its delivery and response numbers are ready in your
          dashboard.
        </Paragraph>
      </Section>

      <Section className="mb-10">
        <SummaryRows
          rows={[
            { label: "Campaign", value: campaignName },
            { label: "Status", value: "Completed" },
          ]}
        />
      </Section>

      <PrimaryButton href={campaignLink}>View campaign</PrimaryButton>
    </EmailLayout>
  );
}

CampaignCompletedEmail.PreviewProps = {
  campaignName: "Diwali offer — repeat customers",
  campaignLink: "https://rateup.app/dashboard/campaign/campaign-1",
} satisfies CampaignCompletedEmailProps;

export default CampaignCompletedEmail;
