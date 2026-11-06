import { Fragment, type ReactNode } from "react";
import { Link, Section, Text } from "react-email";
import {
  Display,
  EmailLayout,
  HighlightList,
  type HighlightItem,
  Paragraph,
  PrimaryButton,
  Title,
} from "../utils/email/react/components.js";

export interface CustomerUpdateEmailProps {
  preview: string;
  title: string;
  /**
   * A small markdown subset: blank-line paragraphs, `## ` headings, `- ` bullets, and inline
   * `**bold**` and `[label](https://…)`. Rendered as elements, never as HTML, so staff copy
   * cannot inject markup.
   */
  body: string;
  highlights?: HighlightItem[];
  cta?: { label: string; href: string };
  unsubscribeUrl: string;
}

type Block =
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

export function parseBlocks(body: string): Block[] {
  return body
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): Block => {
      if (chunk.startsWith("## ")) return { kind: "heading", text: chunk.slice(3).trim() };
      const lines = chunk.split("\n").map((l) => l.trim());
      if (lines.every((l) => l.startsWith("- "))) {
        return { kind: "list", items: lines.map((l) => l.slice(2).trim()) };
      }
      return { kind: "paragraph", text: lines.join(" ") };
    });
}

const INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

export function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    if (match[1]) out.push(<strong key={index}>{match[1]}</strong>);
    else
      out.push(
        <Link key={index} href={match[3]} className="text-brand underline">
          {match[2]}
        </Link>,
      );
    last = index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Onboarding steps and staff broadcasts: product mail a person can unsubscribe from. */
export function CustomerUpdateEmail({
  preview,
  title,
  body,
  highlights,
  cta,
  unsubscribeUrl,
}: CustomerUpdateEmailProps) {
  return (
    <EmailLayout preview={preview} unsubscribeUrl={unsubscribeUrl}>
      <Section className={highlights?.length || cta ? "mb-9" : ""}>
        <Display>{title}</Display>
        {parseBlocks(body).map((block, i) => (
          <Fragment key={i}>
            {block.kind === "heading" ? (
              <Section className="mt-8">
                <Title>{renderInline(block.text)}</Title>
              </Section>
            ) : block.kind === "list" ? (
              block.items.map((item, j) => (
                <Text key={j} className="font-14 font-body text-fg-2 m-0 mt-2">
                  &bull;&nbsp;{renderInline(item)}
                </Text>
              ))
            ) : (
              <Paragraph>{renderInline(block.text)}</Paragraph>
            )}
          </Fragment>
        ))}
      </Section>

      {highlights?.length ? (
        <Section className={cta ? "mb-9" : ""}>
          <HighlightList items={highlights} />
        </Section>
      ) : null}

      {cta ? <PrimaryButton href={cta.href}>{cta.label}</PrimaryButton> : null}
    </EmailLayout>
  );
}

CustomerUpdateEmail.PreviewProps = {
  preview: "One five-minute step gets Northside Coffee live on WhatsApp.",
  title: "Welcome to RateUp",
  body: "Hi Priya,\n\nThanks for signing up **Northside Coffee**. Everything in RateUp runs on your WhatsApp Business number, so that is the one thing to do first.\n\n- Shared inbox\n- Broadcasts\n- Loyalty",
  cta: { label: "Connect WhatsApp", href: "https://rateup.app/dashboard/setup" },
  unsubscribeUrl: "https://api.rateup.app/api/public/customer-comms/unsubscribe/x",
} satisfies CustomerUpdateEmailProps;

export default CustomerUpdateEmail;
