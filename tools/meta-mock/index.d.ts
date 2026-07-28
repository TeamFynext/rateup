/** A request the mock answered. */
export interface MockCall {
  at: string;
  method: string;
  /** Path with the `/v25.0` prefix stripped, e.g. `/238205772710930/flows`. */
  path: string;
  rawPath: string;
  query: Record<string, string>;
  body?: unknown;
  /** False when nothing matched and the generic Graph-shaped answer was used. */
  matched: boolean;
  source: "handler" | "fixture" | "fallback";
  /** Which collection request answered this, when a fixture did. */
  fixture: string | null;
  /** Which API answered — the two share four endpoints. */
  api: "whatsapp" | "instagram" | null;
  status: number;
}

export interface CallFilter {
  /** A call count taken earlier, to narrow to "what happened since". */
  since?: number;
  path?: string;
  method?: string;
}

export interface WebhookRequest {
  /** One of the payload names from `listWebhooks()`. */
  name: string;
  /** The customer's number — `wa_id`, `from` and `recipient_id`. */
  from?: string;
  wabaId?: string;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  /** Free-form placeholder substitutions for anything else in the payload. */
  vars?: Record<string, string>;
}

export interface WebhookResult {
  ok: boolean;
  status?: number;
  target?: string;
  body?: string;
  error?: string;
  available?: string[];
  payload?: unknown;
}

export interface MetaMockOptions {
  /** Defaults to 3099. Pass 0 for any free port. */
  port?: number;
  host?: string;
  /**
   * Which API wins on the four endpoints WhatsApp and Instagram share, when
   * the request body gives nothing away. Defaults to "whatsapp".
   */
  defaultApi?: "whatsapp" | "instagram";
  /** Where replayed webhooks are delivered. */
  webhookUrl?: string;
  verbose?: boolean;
}

export interface MetaMock {
  listen(): Promise<MetaMock>;
  close(): Promise<void>;
  readonly url: string;
  readonly port: number;
  calls(filter?: CallFilter): MockCall[];
  reset(): void;
  replayWebhook(request: WebhookRequest): Promise<WebhookResult>;
  webhooks(): Array<{ name: string; folder: string }>;
  fixtures: {
    collections: Array<{
      api: "whatsapp" | "instagram";
      name: string;
      page: string;
      updatedAt: string | null;
      routes: number;
      webhooks: number;
    }>;
    routes: Array<{
      api: "whatsapp" | "instagram";
      method: string;
      path: string;
      select: string;
      name: string;
    }>;
    webhooks: Array<{
      api: "whatsapp" | "instagram";
      name: string;
      qualifiedName: string;
      folder: string;
      payload: unknown;
    }>;
  };
}

export function createMetaMock(options?: MetaMockOptions): MetaMock;

/** Create and start in one step. */
export function startMetaMock(options?: MetaMockOptions): Promise<MetaMock>;

export function listWebhooks(): Array<{
  name: string;
  api: "whatsapp" | "instagram";
  folder: string;
}>;
/** Which API a request body belongs to, or null when it does not say. */
export function apiOf(body: unknown): "whatsapp" | "instagram" | null;
export function buildWebhook(request: WebhookRequest): unknown | null;
export function replayWebhook(
  request: WebhookRequest & { target: string },
): Promise<WebhookResult>;
export function retarget(payload: unknown, ids: Omit<WebhookRequest, "name" | "vars">): unknown;
export function matchFixture(
  method: string,
  pathname: string,
  query: Record<string, string>,
  options?: { body?: unknown; defaultApi?: "whatsapp" | "instagram"; routes?: unknown[] },
): unknown | null;
export function fieldSelector(query: Record<string, string>): string;
export const fixtures: MetaMock["fixtures"];
