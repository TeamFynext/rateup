import { waFailureLabel } from "../../../utils/waRetryableErrors.js";

/**
 * Template and message rows → wire shapes. Allowlisted field by field, like
 * loyalty/presenters.ts: the template list used to return the stored Meta payload whole
 * (`data: z.any()`), so whatever Meta or RateUp added to that JSON became public contract.
 */

interface StoredButton {
  type?: unknown;
  text?: unknown;
  url?: unknown;
  phone_number?: unknown;
}

interface StoredComponent {
  type?: unknown;
  format?: unknown;
  text?: unknown;
  buttons?: StoredButton[];
}

interface StoredTemplate {
  name?: unknown;
  language?: unknown;
  status?: unknown;
  category?: unknown;
  components?: StoredComponent[];
}

const str = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export function presentTemplate(row: {
  id: string;
  createdAt: Date;
  templateType: string;
  data: unknown;
}) {
  const data = (row.data ?? {}) as StoredTemplate;
  const components = Array.isArray(data.components) ? data.components : [];
  return {
    id: row.id,
    name: str(data.name) ?? "",
    language: str(data.language) ?? "",
    status: str(data.status) ?? "UNKNOWN",
    category: str(data.category),
    templateType: row.templateType,
    createdAt: row.createdAt.toISOString(),
    components: components.map((c) => ({
      type: (str(c.type) ?? "").toUpperCase(),
      format: str(c.format),
      text: str(c.text),
      buttons: Array.isArray(c.buttons)
        ? c.buttons.map((b) => ({
            type: str(b.type) ?? "",
            text: str(b.text),
            url: str(b.url),
            phoneNumber: str(b.phone_number),
          }))
        : null,
    })),
  };
}

/**
 * `WaMessage.stats` holds, per status, the timestamp of the first receipt: Meta's unix
 * seconds as a string, or an ISO string when the receipt carried none. Empty means "not yet".
 */
function receiptTime(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const date = /^\d+$/.test(value) ? new Date(Number(value) * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";

export function presentMessageStatus(row: {
  messageId: string | null;
  stats: unknown;
  errorCode: number | null;
  createdAt: Date;
}) {
  const stats = (row.stats ?? {}) as Record<string, unknown>;
  const sentAt = receiptTime(stats.sent);
  const deliveredAt = receiptTime(stats.delivered);
  const readAt = receiptTime(stats.read);
  const failedAt = receiptTime(stats.failed);
  // Status from presence, not from whether the timestamp parses.
  const has = (key: string) => typeof stats[key] === "string" && stats[key] !== "";
  const status: MessageStatus = has("failed")
    ? "failed"
    : has("read")
      ? "read"
      : has("delivered")
        ? "delivered"
        : has("sent")
          ? "sent"
          : "pending";
  return {
    messageId: row.messageId ?? "",
    status,
    createdAt: row.createdAt.toISOString(),
    sentAt,
    deliveredAt,
    readAt,
    failedAt,
    // The stored errorMessage can carry internal text; the code plus our own wording for
    // it is what a partner can act on.
    error:
      status === "failed" ? { code: row.errorCode, message: waFailureLabel(row.errorCode) } : null,
  };
}
