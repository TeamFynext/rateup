/**
 * A contact row as Rateup stores it — the Prisma `Contact`, possibly with
 * relations included. Only the fields adapters read are named; the rest ride
 * along because Zapier forwards the whole row to the org's Zaps, and those Zaps
 * are built against every column.
 *
 * It crosses the queue as JSON, so on the worker side dates are ISO strings.
 */
export type ContactRecord = {
  id: string;
  orgId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  psid?: string | null;
  igsId?: string | null;
  notes?: string | null;
  lifecycleId?: string | null;
  integrationIds?: unknown;
} & Record<string, unknown>;

/**
 * What a `contact.updated` write touched. The call sites differ in what they
 * change, and the CRMs must not hear about a change that did not happen: a bulk
 * inbox close rewriting every contact's name in Zoho would be hundreds of calls
 * against its rate limit for nothing.
 *
 * - `details`: name, email, phone and the like.
 * - `lifecycle`: the contact carries a lifecycle the CRMs should be told about.
 * - `status`: only the inbox assignment status.
 */
export type ContactChange = "details" | "lifecycle" | "status";

/**
 * Who made a change. `integration` means an inbound sync (a Zoho webhook moving
 * a lead) wrote it — the CRMs skip those so the change is not echoed straight
 * back to where it came from. Listeners that only report (Zapier) still fire.
 */
export type IntegrationEventOrigin = "rateup" | "integration";

/** The board lead a stage event is about. */
export interface LeadSnapshot {
  id: string;
  contactId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
}

/** The column the lead now sits in, with enough of its pipeline to filter on. */
export interface StageSnapshot {
  id: string;
  name: string;
  status: string;
  pipelineId: string;
  pipelineName: string;
  pipelineType: string;
}

/** The lead's contact, when it has one — it holds the CRM record ids. */
export interface LeadContactSnapshot {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  notes: string | null;
  integrationIds: unknown;
}

interface LeadStageEventBase {
  lead: LeadSnapshot;
  stage: StageSnapshot;
  /** Only loaded for the Leads board: nothing downstream reads it for any other. */
  contact: LeadContactSnapshot | null;
  origin: IntegrationEventOrigin;
}

/**
 * Something that happened in Rateup that integrations may want to hear about.
 *
 * Carries Rateup ids and a Rateup-shaped snapshot — never a provider's payload.
 * Each adapter translates it into whatever its provider expects, so a call site
 * emits one event and never learns which providers are connected.
 *
 * `loyalty.*` joins this union when its emitters move over (Phase 3).
 */
export type IntegrationEvent =
  | {
      type: "contact.created";
      contact: ContactRecord;
      /**
       * The lifecycle's name, when the create path resolved it. Only the manual
       * create does; Zoho uses it as the new lead's status and falls back to
       * "New" without it.
       */
      lifecycleName?: string;
    }
  | { type: "contact.updated"; contact: ContactRecord; changed: ContactChange[] }
  | {
      type: "contact.deleted";
      /** The row as it was just before it was deleted — it holds the CRM ids to remove. */
      contact: ContactRecord;
    }
  | { type: "conversation.closed"; contact: ContactRecord }
  | { type: "survey.response_submitted"; response: SurveyResponseSnapshot }
  | ({ type: "lead.created" } & LeadStageEventBase)
  | ({
      type: "lead.stage_changed";
      /**
       * The lead was closed onto the column it already sat in. The CRMs re-push
       * it — a deal dropped onto Won must end up won in Bigin — but nothing
       * moved, so listeners that report moves (Zapier) skip it.
       */
      resync?: true;
    } & LeadStageEventBase)
  | {
      type: `order.${OrderEventStatus}`;
      order: OrderSnapshot;
    };

/**
 * A survey response from a known contact. Only ids and when: the answers can be
 * encrypted, and a listener that needs them loads the response and decides what
 * it may send.
 */
export interface SurveyResponseSnapshot {
  id: string;
  contactId: string;
  /** `WEB`, `WHATSAPP`, … — `ResponsePlatform`. */
  platform: string;
  createdAt: string;
}

/** Order statuses, as `commerce.types.ts` defines them; each is its own event. */
export type OrderEventStatus =
  | "draft_created"
  | "created"
  | "paid"
  | "partially_fulfilled"
  | "fulfilled"
  | "cancelled"
  | "refunded"
  | "fulfillment_cancelled"
  /** Payment was attempted and declined (WooCommerce's `failed`). */
  | "failed";

/**
 * An order, as integrations hear about it. The store's raw payload is left out
 * on purpose: it is large, it is full of personal data no listener asked for,
 * and its shape differs per store — which is what this snapshot exists to hide.
 */
export interface OrderSnapshot {
  provider: string;
  storeId: string;
  orderId: string | null;
  status: OrderEventStatus;
  customer: { phone: string | null; email: string | null };
  amount: number | null;
  productIds: string[];
}

export type IntegrationEventType = IntegrationEvent["type"];

/** Picks the member of the union with the given `type`. */
export type IntegrationEventOf<T extends IntegrationEventType> = Extract<
  IntegrationEvent,
  { type: T }
>;

/** The job `emitIntegrationEvent` puts on `integrationTriggerQueue`. */
export interface IntegrationEventJobData {
  orgId: string;
  event: IntegrationEvent;
}
