import axios from "axios";
import dayjs from "dayjs";
import z from "zod";

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { IntegratedApps } from "../../../types/enums.js";
import type { IntegrationProvider } from "../providers/integrationProvider.types.js";
import { markIntegrationHealthy, recordIntegrationFailure } from "../shared/integrationHealth.js";
import { IntegrationConnectError } from "../shared/oauthConnectError.js";
import { assertPublicStore, WooStoreUrlError } from "../woocommerce/woocommerce.url.js";

/**
 * Amelia (WordPress booking plugin): a WhatsApp flow's date question lists a
 * service's free times from it ({@link getAmeliaSlots}, called by the flow
 * service). Connected with a pasted API key through the shared
 * `POST /:name/connect`; it acts on no RateUp event and receives nothing.
 *
 * Amelia's REST API is served through WordPress's AJAX endpoint, with the API
 * path in the `call` parameter and every other parameter appended to the same
 * query: `…/admin-ajax.php?action=wpamelia_api&call=/api/v1/slots&serviceId=3`.
 * Only the Elite licence has it (wpamelia.com/documentation/api/).
 */
const API_QUERY = "action=wpamelia_api&call=/api/v1";

/**
 * Meta waits about ten seconds for a flow's data exchange, and the slot lookup
 * runs inside it.
 */
const TIMEOUT_MS = 5_000;

/** Failed slot searches in a row before the org's admins are told. */
const NOTIFY_AFTER = 3;

const WHERE = (orgId: string) => ({
  orgid_integration_name_unique: { orgId, name: IntegratedApps.amelia },
});

/** Reads the credential; the column is `Json`, so this is asserted once here. */
export function readAmeliaCredential(credential: unknown): Partial<AmeliaCredential> {
  return credential && typeof credential === "object"
    ? (credential as Partial<AmeliaCredential>)
    : {};
}

/** Amelia's answer to `GET /slots`: free start times, keyed by day then by time. */
interface AmeliaSlotsBody {
  message?: string;
  data?: {
    slots?: Record<string, Record<string, unknown>>;
  };
}

// ---------------------------------------------------------------------------
// The site address
// ---------------------------------------------------------------------------

/** A site address that cannot be connected, with a message fit to show the admin. */
export class AmeliaAddressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AmeliaAddressError";
  }
}

/**
 * The address an admin typed — the site itself, a page inside wp-admin, or the
 * full API address an older version of the settings page asked for — as
 * Amelia's API address, which is what the credential stores.
 *
 * HTTPS only: the API key goes in a header on every request.
 */
export function normaliseAmeliaAddress(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new AmeliaAddressError("Enter your WordPress site's address.");

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new AmeliaAddressError("That does not look like a web address.");
  }
  if (url.protocol !== "https:") {
    throw new AmeliaAddressError("The site must be served over HTTPS.");
  }
  if (url.username || url.password) {
    throw new AmeliaAddressError("Leave the username and password out of the address.");
  }

  // WordPress may live in a folder (example.com/blog), so keep whatever sits
  // above the part the admin copied from inside it.
  const root = url.pathname
    .replace(/\/(wp-admin|wp-json|wp-content|wp-login\.php)(\/.*)?$/i, "")
    .replace(/\/+$/, "");

  return `https://${url.host.toLowerCase()}${root}/wp-admin/admin-ajax.php?${API_QUERY}`;
}

// ---------------------------------------------------------------------------
// The slot search
// ---------------------------------------------------------------------------

/** Why a call to Amelia failed, and the status it answered with, if it did. */
export class AmeliaRequestError extends Error {
  constructor(
    message: string,
    readonly reason: "unreachable" | "not_amelia" | "unauthorized" | "rejected",
    readonly status?: number,
  ) {
    super(message);
    this.name = "AmeliaRequestError";
  }
}

/**
 * Free start times for one service on one day (`YYYY-MM-DD`), in the order
 * Amelia lists them. An empty list is a day with nothing free.
 *
 * The address is checked against private networks on every call, not only on
 * connect, because what a hostname resolves to can change after it was saved.
 */
export async function fetchAmeliaSlots(
  credential: Pick<AmeliaCredential, "apiKey" | "baseUrl" | "serviceId">,
  date: string,
): Promise<string[]> {
  try {
    await assertPublicStore(credential.baseUrl);
  } catch (error) {
    if (error instanceof WooStoreUrlError) {
      throw new AmeliaRequestError(error.message, "unreachable");
    }
    throw error;
  }

  // The empty parameters are sent as the slot search always sent them.
  const params: Record<string, string | number> = {
    locationId: "",
    serviceId: credential.serviceId,
    serviceDuration: "",
    providerIds: "",
    persons: 1,
    // Amelia documents `YYYY-MM-DD HH:mm`; the answer covers days from here on.
    startDateTime: `${date} 00:00`,
    extras: "",
  };
  const query = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  const url = `${credential.baseUrl.replace(/\/+$/, "")}/slots&${query}`;

  let status: number;
  let body: unknown;
  try {
    const response = await axios.get(url, {
      headers: { Amelia: credential.apiKey },
      timeout: TIMEOUT_MS,
      maxRedirects: 0,
      validateStatus: () => true,
    });
    status = response.status;
    body = response.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AmeliaRequestError(`Could not reach the site: ${message}`, "unreachable");
  }

  if (status === 401 || status === 403) {
    throw new AmeliaRequestError("Amelia rejected the API key.", "unauthorized", status);
  }
  // WordPress answers "0" or an HTML page when Amelia's API is missing or off.
  if (!body || typeof body !== "object") {
    throw new AmeliaRequestError(
      "The site did not answer as Amelia. Check the address, and that Amelia's API is turned on.",
      "not_amelia",
      status,
    );
  }
  const slotsBody = body as AmeliaSlotsBody;
  if (status < 200 || status >= 300 || !slotsBody.data?.slots) {
    log.debug({ status, message: slotsBody.message }, "Amelia refused a slot search");
    throw new AmeliaRequestError(
      slotsBody.message
        ? `Amelia answered: ${slotsBody.message}`
        : `Amelia answered with status ${status}.`,
      "rejected",
      status,
    );
  }

  return Object.keys(slotsBody.data.slots[date] ?? {});
}

// ---------------------------------------------------------------------------
// Connecting
// ---------------------------------------------------------------------------

/** The settings form's fields; the shared connect route hands them over as strings. */
const fieldsSchema = z.object({
  baseUrl: z.string(),
  // Blank keeps the saved key: the page never receives it to send back.
  apiKey: z.string().trim().optional(),
  serviceId: z.coerce
    .number({ error: "Enter the service ID." })
    .int("The service ID is a whole number.")
    .positive("The service ID is a whole number."),
});

/**
 * The provider's `apiKey.connect`, behind the shared `POST /amelia/connect`.
 *
 * Saving is proved with the call flows actually make — a slot search for the
 * service, today — so a wrong address, key or service shows on the settings
 * page rather than as "no slot" in a customer's flow.
 */
export async function connectAmeliaFromForm(
  orgId: string,
  fields: Readonly<Record<string, string>>,
) {
  const parsed = fieldsSchema.safeParse(fields);
  if (!parsed.success) {
    throw new IntegrationConnectError(
      parsed.error.issues[0]?.message ?? "Check the connection details.",
      400,
    );
  }

  let baseUrl: string;
  try {
    baseUrl = normaliseAmeliaAddress(parsed.data.baseUrl);
    await assertPublicStore(baseUrl);
  } catch (error) {
    if (error instanceof AmeliaAddressError || error instanceof WooStoreUrlError) {
      throw new IntegrationConnectError(error.message, 400);
    }
    throw error;
  }

  const existing = await prisma.integration.findUnique({ where: WHERE(orgId) });
  const apiKey = parsed.data.apiKey || readAmeliaCredential(existing?.credential).apiKey;
  if (!apiKey) throw new IntegrationConnectError("Enter your Amelia API key.", 400);

  const credential: AmeliaCredential = { apiKey, baseUrl, serviceId: parsed.data.serviceId };
  try {
    await fetchAmeliaSlots(credential, dayjs().format("YYYY-MM-DD"));
  } catch (error) {
    if (!(error instanceof AmeliaRequestError)) throw error;
    log.warn({ orgId, reason: error.reason, status: error.status }, "Amelia connect check failed");
    throw new IntegrationConnectError(error.message, error.reason === "unreachable" ? 502 : 400);
  }

  await prisma.integration.upsert({
    where: WHERE(orgId),
    create: { orgId, name: IntegratedApps.amelia, credential: { ...credential }, active: true },
    update: {
      credential: { ...credential },
      active: true,
      lastError: null,
      lastErrorAt: null,
      consecutiveFailures: 0,
    },
  });

  log.info("Amelia connected for org %s", orgId);
  return { baseUrl, serviceId: credential.serviceId };
}

// ---------------------------------------------------------------------------
// Slots for a flow
// ---------------------------------------------------------------------------

/**
 * Free start times on `date` (`YYYY-MM-DD`) for the org's Amelia service, for a
 * flow's date question. Empty when Amelia is not connected, has nothing free,
 * or could not be asked — the customer is mid-flow, so a failure becomes "no
 * slot" for them and a mark on the integration card for the business.
 */
export async function getAmeliaSlots(orgId: string, date: string): Promise<string[]> {
  const integration = await prisma.integration.findUnique({ where: WHERE(orgId) });
  if (!integration?.active) return [];

  const credential = readAmeliaCredential(integration.credential);
  if (!credential.apiKey || !credential.baseUrl || !credential.serviceId) return [];

  try {
    const slots = await fetchAmeliaSlots(
      { apiKey: credential.apiKey, baseUrl: credential.baseUrl, serviceId: credential.serviceId },
      date,
    );
    await markIntegrationHealthy(integration);
    return slots;
  } catch (error) {
    log.warn({ err: error, orgId }, "Amelia slot search failed");
    await recordIntegrationFailure(integration, "Amelia", error, { notifyAfter: NOTIFY_AFTER });
    return [];
  }
}

// ---------------------------------------------------------------------------
// The provider
// ---------------------------------------------------------------------------

export const ameliaProvider: IntegrationProvider = {
  name: IntegratedApps.amelia,
  label: "Amelia",
  auth: "apiKey",
  connection: "integration",
  events: [],
  subscribedEvents: () => [],
  async handleEvent() {},

  apiKey: { connect: connectAmeliaFromForm },
};
