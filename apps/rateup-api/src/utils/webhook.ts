import crypto, { randomUUID } from "node:crypto";
import { getOrgById } from "../modules/org/org.services.js";
import axios from "axios";
import { log } from "./logger.js";
import { wait } from "../modules/whatsapp/whatsappSurvey/wasurvey.controller.js";

export async function sendWebhook(endpoint: string, payload: unknown, orgId: string) {
  if (!endpoint.startsWith("https://")) return;
  let attempt = 0;
  let webhookId = randomUUID();
  while (attempt < 3) {
    try {
      const secret = await getWebhookSecret(orgId);
      const signature = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(payload))
        .digest("base64");
      const res = await axios.post(endpoint, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Rateup-Signature": signature,
          "X-Rateup-Triggered-At": new Date().toISOString(),
          "X-Webhook-Id": webhookId,
        },
      });
      if (res.status >= 200 && res.status <= 300) log.info("Webhook delivered successfully");
      else log.trace("something went wrong in sending webhook");
      break;
    } catch (e) {
      log.error(e);
      if (axios.isAxiosError(e) && e.response && e.response.status >= 500)
        log.trace("error sending webhook");
      else break;
      attempt++;
      await wait(Math.pow(2, attempt) * 1000);
    }
  }
}

export async function getWebhookSecret(orgId: string) {
  const org = await getOrgById(orgId);
  if (!org) {
    throw new Error(`Org not found for id ${orgId}`);
  }
  const derivedKey = await pbkdf2Async(orgId, org.ownerId);
  return derivedKey.toString("base64");
}

function pbkdf2Async(
  input: string,
  salt: string,
  iterations = 100000,
  keylen = 32,
  digest = "sha256",
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(input, salt, iterations, keylen, digest, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}
