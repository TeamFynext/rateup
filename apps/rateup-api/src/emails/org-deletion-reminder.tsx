import { Section, Text } from "react-email";
import {
  Callout,
  Display,
  EmailLayout,
  Paragraph,
  PrimaryButton,
  SummaryRows,
} from "../utils/email/react/components.js";

export interface OrgDeletionReminderEmailProps {
  orgName: string;
  ownerName: string;
  /** Pre-formatted for the recipient by the caller. */
  flaggedOn: string;
  reviewLink: string;
}

/** Internal reminder — an org flagged inactive never came back. */
export function OrgDeletionReminderEmail({
  orgName,
  ownerName,
  flaggedOn,
  reviewLink,
}: OrgDeletionReminderEmailProps) {
  return (
    <EmailLayout
      preview={`${orgName} is eligible for deletion`}
      footerNote={
        <Paragraph tight>
          An internal reminder from the RateUp system. Not sent to the organisation.
        </Paragraph>
      }
    >
      <Section className="mb-8">
        <Display>Org ready for deletion</Display>
        <Paragraph>
          {orgName} was warned about inactivity on {flaggedOn} and has done nothing since, so it now
          meets the bar for deletion.
        </Paragraph>
      </Section>

      <SummaryRows
        rows={[
          { label: "Organisation", value: orgName },
          { label: "Owner", value: ownerName },
          { label: "Flagged on", value: flaggedOn },
        ]}
      />

      <Section className="pt-8">
        <Callout tone="warning">
          <Text className="font-14 text-warning m-0">
            Check the account before you delete it. Surveys, responses, and contacts go with it, and
            none of it can be recovered.
          </Text>
        </Callout>
      </Section>

      <Section className="pt-8">
        <PrimaryButton href={reviewLink}>Review organisation</PrimaryButton>
      </Section>
    </EmailLayout>
  );
}

OrgDeletionReminderEmail.PreviewProps = {
  orgName: "Northside Coffee",
  ownerName: "Priya Menon",
  flaggedOn: "16 Feb 2026",
  reviewLink: "https://rateup.app/admin/orgs/abc123",
} satisfies OrgDeletionReminderEmailProps;

export default OrgDeletionReminderEmail;
