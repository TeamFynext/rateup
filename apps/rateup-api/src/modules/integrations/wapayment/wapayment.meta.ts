import type { AxiosRequestConfig } from "axios";

import { log } from "../../../utils/logger.js";
import { callMetaApi, GraphApiError } from "../../whatsapp/wa_axios.js";
import { WaPaymentError, type WaPaymentConfiguration } from "./wapayment.types.js";

/** The WhatsApp account the calls are made for: its WABA and token. */
export interface WaPaymentAccount {
  wabaId: string | null;
  accessToken: string;
}

function wabaOf(account: WaPaymentAccount) {
  if (!account.wabaId) {
    throw new WaPaymentError("This WhatsApp number has no business account ID.", 404);
  }
  return account.wabaId;
}

/**
 * One Graph call. `callMetaApi` throws on anything but a 2xx (a `GraphApiError`
 * carrying Meta's error, or a plain one), so a refusal is caught here and
 * rethrown with Meta's own reason, which the settings page shows.
 */
async function callMeta(
  what: string,
  url: string,
  method: AxiosRequestConfig["method"],
  account: WaPaymentAccount,
  data?: unknown,
) {
  try {
    return await callMetaApi(url, method, account.accessToken, data);
  } catch (error) {
    const graph = error instanceof GraphApiError ? error.error : undefined;
    const reason =
      graph?.error_user_msg ?? graph?.message ?? (error instanceof Error ? error.message : "");
    log.warn({ code: graph?.code, subcode: graph?.error_subcode }, "Meta refused: %s", what);
    throw new WaPaymentError(`Could not ${what}: ${reason || "Meta did not say why"}`, 502);
  }
}

/** Every payment configuration on the account; Meta groups them, this flattens them. */
export async function listMetaPaymentConfigurations(
  account: WaPaymentAccount,
): Promise<WaPaymentConfiguration[]> {
  const res = await callMeta(
    "read payment configurations",
    `/${wabaOf(account)}/payment_configurations`,
    "GET",
    account,
  );
  const groups = (res.data?.data ?? []) as { payment_configurations?: WaPaymentConfiguration[] }[];
  return groups.flatMap((group) => group?.payment_configurations ?? []);
}

/** A fresh verification link for one configuration, and when it expires. */
export async function generateMetaPaymentOauthLink(
  account: WaPaymentAccount,
  configurationName: string,
): Promise<{ oauth_url?: string; expiration?: number }> {
  const res = await callMeta(
    "create a verification link",
    `/${wabaOf(account)}/generate_payment_configuration_oauth_link`,
    "POST",
    account,
    { configuration_name: configurationName },
  );
  return { oauth_url: res.data?.oauth_url, expiration: res.data?.expiration };
}
