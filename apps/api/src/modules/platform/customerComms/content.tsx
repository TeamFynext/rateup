import CustomerUpdateEmail from "../../../emails/customer-update.js";
import type { EmailParams } from "../../../utils/email/sendAWSEmail.js";
import { renderEmail, renderEmailText } from "../../../utils/email/react/render.js";
import { absoluteUrl, fill, type DripEmail } from "./drip.catalogue.js";
import { listUnsubscribeHeaders, unsubscribeUrl } from "./unsubscribe.js";

export interface PersonVars {
  userId: string;
  email: string;
  name: string;
  org: string;
}

/** What a broadcast says by email; the same shape the composer edits. */
export interface BroadcastEmail {
  subject: string;
  body: string;
  cta?: { label: string; url: string };
}

export async function buildDripEmail(step: DripEmail, person: PersonVars): Promise<EmailParams> {
  const vars = { name: person.name, org: person.org };
  const subject = fill(step.subject, vars);
  const body = fill(step.body, vars);
  const headers = listUnsubscribeHeaders(person.userId);
  const replyTo = process.env.ROOT_ORG_MAIL_ID || undefined;

  if (step.plain) {
    const text = `${body}\n\n--\nUnsubscribe: ${unsubscribeUrl(person.userId)}`;
    return { to: person.email, subject, text, html: undefined, headers, replyTo };
  }

  const element = (
    <CustomerUpdateEmail
      preview={fill(step.preview, vars)}
      title={fill(step.title, vars)}
      body={body}
      highlights={step.highlights?.map((h) => ({
        title: fill(h.title, vars),
        description: fill(h.description, vars),
        href: h.path ? absoluteUrl(h.path) : undefined,
      }))}
      cta={step.cta ? { label: step.cta.label, href: absoluteUrl(step.cta.path) } : undefined}
      unsubscribeUrl={unsubscribeUrl(person.userId)}
    />
  );
  const [html, text] = await Promise.all([renderEmail(element), renderEmailText(element)]);
  return { to: person.email, subject, text, html, headers, replyTo };
}

export async function buildBroadcastEmail(
  broadcast: BroadcastEmail,
  person: PersonVars,
): Promise<EmailParams> {
  const vars = { name: person.name, org: person.org };
  const subject = fill(broadcast.subject, vars);
  const body = fill(broadcast.body, vars);
  const firstLine =
    body
      .split("\n")
      .find((l) => l.trim() && !l.startsWith("#"))
      ?.trim() ?? subject;
  const element = (
    <CustomerUpdateEmail
      preview={firstLine.replace(/[*[\]]/g, "").slice(0, 90)}
      title={subject}
      body={body}
      cta={broadcast.cta ? { label: broadcast.cta.label, href: broadcast.cta.url } : undefined}
      unsubscribeUrl={unsubscribeUrl(person.userId)}
    />
  );
  const [html, text] = await Promise.all([renderEmail(element), renderEmailText(element)]);
  return {
    to: person.email,
    subject,
    text,
    html,
    headers: listUnsubscribeHeaders(person.userId),
    replyTo: process.env.ROOT_ORG_MAIL_ID || undefined,
  };
}
