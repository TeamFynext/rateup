import crypto, { randomUUID } from "node:crypto";
import { getOrgById } from "../modules/org/org.services";
import axios from "axios";
import { log } from "./logger";
import { wait } from "../modules/whatsapp/whatsappSurvey/wasurvey.controller";

export async function sendWebhook(endpoint: string, payload, orgId: string) {
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
      if (res.status >= 200 && res.status <= 300)
        log.info("Webhook delivered successfully");
      else log.trace("something went wrong in sending webhook");
      break;
    } catch (e) {
      log.error(e);
      if (e.response && e.response.status >= 500)
        log.trace("error sending webhook");
      else break;
      attempt++;
      await wait(Math.pow(2, attempt) * 1000);
    }
  }
}

export async function getWebhookSecret(orgId) {
  const { ownerId } = await getOrgById(orgId);
  const derivedKey = (await pbkdf2Async(orgId, ownerId)) as Buffer;
  return derivedKey.toString("base64");
}

function pbkdf2Async(
  input,
  salt,
  iterations = 100000,
  keylen = 32,
  digest = "sha256",
) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      input,
      salt,
      iterations,
      keylen,
      digest,
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      },
    );
  });
}
