import { log } from "../../../utils/logger.js";
import { callMetaApi } from "../wa_axios.js";

/**
 * Get Business Integration System User Access Token from the code recieved from MetaLogin process
 * */
export async function getAccessTokenFromCode(code: string, redirect_uri: string = "") {
  let url = `/oauth/access_token`;
  url = url + `?client_id=${process.env.waclient_id}`;
  url = url + `&client_secret=${process.env.waclient_secret}`;
  url = url + `&code=${code}`;
  url = url + `&redirect_uri=${redirect_uri}`;
  const res = await callMetaApi(url, "GET");

  log.trace("Access token response: %o", res.data);
  return res.data.access_token;
}

/**
 * Returns metadata about a given access token.
 * This includes data such as the user for which the token was issued, whether the token is still valid, when it expires, and what permissions the app has for the given user.
 * */
export async function debug_token(tokenToDebug: string, accessToken: string) {
  let url = `/debug_token`;
  url = url + `?input_token=${tokenToDebug}`;
  const res = await callMetaApi(url, "GET", accessToken);

  log.trace("Business details response: %o", res.data);
  return res.data as DebugTokenResponse;
}

type DebugTokenResponse = {
  data: {
    app_id: string;
    type: string;
    application: string;
    data_access_expires_at: number;
    expires_at: number;
    is_valid: boolean;
    issued_at: number;
    scopes: string[];
    user_id: string;
    granular_scopes: {
      scope: string;
      target_ids?: string[];
    }[];
  };
};

export async function getSharedWABAs(businessId: string, accessToken: string) {
  let url = `/${businessId}/client_whatsapp_business_accounts`;
  const res = await callMetaApi(url, "GET", accessToken);

  log.trace("Shared WhatsApp Business Accounts response: %o", res.data);
  return res.data;
}

export async function getPhoneNumbersFromWABA(
  wabaId: string,
  accessToken: string,
): Promise<WABAPhoneNumbersResponse> {
  let url = `/${wabaId}/phone_numbers?fields=status,display_phone_number,verified_name`;
  const res = await callMetaApi(url, "GET", accessToken);

  log.trace("Phone Numbers response: %o", res.data);
  return res.data;
}

type WABAPhoneNumbersResponse = {
  data: {
    display_phone_number: string;
    verified_name: string;
    id: string;
    status: string;
  }[];
};

export async function subscribeWABAToWebhook(wabaId: string, accessToken: string) {
  let url = `/${wabaId}/subscribed_apps`;
  const res = await callMetaApi(url, "POST", accessToken);
  return res.data;
}
export async function getSubscribedApps(wabaId: string, accessToken: string) {
  let url = `/${wabaId}/subscribed_apps`;
  const res = await callMetaApi(url, "GET", accessToken);
  return res.data;
}

export async function registerPhoneNumber(wa_phone_id: string, accessToken: string) {
  let url = `/${wa_phone_id}/register`;
  const res = await callMetaApi(url, "POST", accessToken, {
    messaging_product: "whatsapp",
    pin: "123456", // TODO
  });
  return res.data;
}

type WaPhoneDetailsRes = {
  verified_name: string;
  code_verification_status: string;
  display_phone_number: string;
  quality_rating: string;
  platform_type: string;
  throughput: {
    level: string;
  };
  id: string;
};
export async function getPhoneDetails(phoneId: string, accessToken: string) {
  const url = `/${phoneId}`;
  const res = await callMetaApi(url, "GET", accessToken);
  return res.data as WaPhoneDetailsRes;
}
