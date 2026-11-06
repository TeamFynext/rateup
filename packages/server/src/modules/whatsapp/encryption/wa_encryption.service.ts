import { log } from "../../../utils/logger.js";
import { callMetaApi } from "../wa_axios.js";

/**
 * Set Business Public Key
 */
export async function setBusinessPublicKey(
  businessPublicKey: string,
  phoneId: string,
  accessToken: string,
) {
  log.trace("Setting business public key: %s", businessPublicKey);
  const data = new URLSearchParams({
    business_public_key: businessPublicKey,
  }).toString();
  try {
    await callMetaApi(
      `/${phoneId}/whatsapp_business_encryption`,
      "POST",
      accessToken,
      data,
      {},
      {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    );
    log.info("Business public key set successfully");
  } catch (error) {
    throw new Error(`Failed to set business public key: ${error}`);
  }
}

interface WaBusinessPublicKeyResponse {
  business_public_key: string;
  business_public_key_signature_status: "VALID" | "MISMATCH";
}
/**
 * Get Business Public Key
 */
export async function getBusinessPublicKey(phoneId: string, accessToken: string) {
  try {
    const res = await callMetaApi(`/${phoneId}/whatsapp_business_encryption`, "GET", accessToken);
    log.info("Business public key fetched successfully");
    return res.data as WaBusinessPublicKeyResponse;
  } catch (error) {
    throw new Error(`Failed to get business public key: ${error}`);
  }
}
