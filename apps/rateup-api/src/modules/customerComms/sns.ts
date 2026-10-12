import crypto from "node:crypto";
import axios from "axios";

export interface SnsMessage {
  Type: "Notification" | "SubscriptionConfirmation" | "UnsubscribeConfirmation";
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: "1" | "2";
  Signature: string;
  SigningCertURL: string;
  Subject?: string;
  SubscribeURL?: string;
  Token?: string;
}

// Only AWS's own SNS hosts may supply the certificate; anything else could sign anything.
const CERT_HOST = /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/;
const certCache = new Map<string, string>();

function stringToSign(m: SnsMessage): string {
  const keys =
    m.Type === "Notification"
      ? ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"]
      : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];
  return keys
    .filter((k) => m[k as keyof SnsMessage] !== undefined)
    .map((k) => `${k}\n${m[k as keyof SnsMessage]}\n`)
    .join("");
}

async function certificate(url: string): Promise<string> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !CERT_HOST.test(parsed.hostname)) {
    throw new Error(`Untrusted SNS certificate URL: ${url}`);
  }
  const cached = certCache.get(url);
  if (cached) return cached;
  const { data } = await axios.get<string>(url, { responseType: "text", timeout: 5_000 });
  certCache.set(url, data);
  return data;
}

/** Verifies an SNS message's signature, and that it came from the configured topic. */
export async function verifySnsMessage(m: SnsMessage): Promise<boolean> {
  const topic = process.env.SES_EVENTS_TOPIC_ARN;
  if (!topic || m.TopicArn !== topic) return false;
  const verifier = crypto.createVerify(m.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1");
  verifier.update(stringToSign(m));
  return verifier.verify(await certificate(m.SigningCertURL), m.Signature, "base64");
}

export async function confirmSubscription(m: SnsMessage): Promise<void> {
  if (!m.SubscribeURL) return;
  const url = new URL(m.SubscribeURL);
  if (url.protocol !== "https:" || !CERT_HOST.test(url.hostname)) return;
  await axios.get(m.SubscribeURL, { timeout: 5_000 });
}

/** The SES event-publishing payload, as much of it as suppression needs. */
export interface SesEvent {
  eventType?: "Bounce" | "Complaint" | string;
  notificationType?: "Bounce" | "Complaint" | string;
  bounce?: {
    bounceType: string;
    bouncedRecipients: { emailAddress: string; diagnosticCode?: string }[];
  };
  complaint?: { complainedRecipients: { emailAddress: string }[]; complaintFeedbackType?: string };
}

/** Addresses to suppress. Only permanent bounces count: a full mailbox is not a dead one. */
export function suppressionsFrom(
  event: SesEvent,
): { email: string; reason: "BOUNCE" | "COMPLAINT"; detail?: string }[] {
  const type = event.eventType ?? event.notificationType;
  if (type === "Bounce" && event.bounce?.bounceType === "Permanent") {
    return event.bounce.bouncedRecipients.map((r) => ({
      email: r.emailAddress.toLowerCase(),
      reason: "BOUNCE",
      detail: r.diagnosticCode?.slice(0, 500),
    }));
  }
  if (type === "Complaint" && event.complaint) {
    return event.complaint.complainedRecipients.map((r) => ({
      email: r.emailAddress.toLowerCase(),
      reason: "COMPLAINT",
      detail: event.complaint?.complaintFeedbackType,
    }));
  }
  return [];
}
