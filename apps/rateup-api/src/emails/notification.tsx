import { Link, Section } from "react-email";
import { Display, EmailLayout, Paragraph, PrimaryButton } from "../utils/email/react/components.js";

export interface NotificationEmailProps {
  title: string;
  body: string;
  actionLink: string;
  actionLabel: string;
  settingsLink: string;
}

/** Every event in the notification catalogue that a member chose to receive by email. */
export function NotificationEmail({
  title,
  body,
  actionLink,
  actionLabel,
  settingsLink,
}: NotificationEmailProps) {
  return (
    <EmailLayout
      preview={body}
      footerNote={
        <Paragraph tight>
          You&apos;re getting this because of your notification settings.{" "}
          <Link href={settingsLink}>Change them</Link>.
        </Paragraph>
      }
    >
      <Section className="mb-9">
        <Display>{title}</Display>
        <Paragraph>{body}</Paragraph>
      </Section>

      <PrimaryButton href={actionLink}>{actionLabel}</PrimaryButton>
    </EmailLayout>
  );
}

NotificationEmail.PreviewProps = {
  title: "Campaign completed",
  body: "Diwali offer — repeat customers has finished sending. Its delivery numbers are ready.",
  actionLink: "https://rateup.app/dashboard/campaign/campaign-1",
  actionLabel: "View campaign",
  settingsLink: "https://rateup.app/dashboard/settings/notifications",
} satisfies NotificationEmailProps;

export default NotificationEmail;
