import { Section } from "react-email";
import { Display, EmailLayout, Paragraph, PrimaryButton } from "../utils/email/react/components.js";

export interface GeneralEmailProps {
  /** Plain text. Blank lines start a new paragraph; HTML is not interpreted. */
  body: string;
  title?: string;
  buttonLink?: string;
  buttonLabel?: string;
}

/**
 * The catch-all template for one-off notifications, driven entirely by the
 * caller's copy. No band — there is no way to write a sensible checklist for
 * copy this template has never seen.
 */
export function GeneralEmail({
  body,
  title,
  buttonLink,
  buttonLabel = "Open RateUp",
}: GeneralEmailProps) {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <EmailLayout preview={title ?? paragraphs[0] ?? "A message from RateUp"}>
      <Section className={buttonLink ? "mb-9" : ""}>
        {title ? <Display>{title}</Display> : null}
        {paragraphs.map((paragraph, index) => (
          <Paragraph key={index}>{paragraph}</Paragraph>
        ))}
      </Section>

      {buttonLink ? <PrimaryButton href={buttonLink}>{buttonLabel}</PrimaryButton> : null}
    </EmailLayout>
  );
}

GeneralEmail.PreviewProps = {
  title: "You've been added to a team",
  body: "Northside Coffee has added you to the Front of House team on RateUp.\n\nYou can now read the team's responses and follow up with customers. If you belong to more than one team, switch between them from the picker at the top of your dashboard.",
  buttonLink: "https://rateup.app/dashboard",
} satisfies GeneralEmailProps;

export default GeneralEmail;
