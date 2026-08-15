import axios from "axios";

import { log } from "./logger.js";

/**
 * The mock's control plane, when one is configured. Null against real Graph,
 * where callers must no-op rather than fail.
 */
const META_MOCK_URL = process.env.META_API_BASE_URL ?? null;

/**
 * Ask @rateup/meta-mock to replay an inbound message.
 *
 * Development only: there is no Graph equivalent, so against the real API this
 * is a no-op and the caller synthesizes the webhook body itself.
 */
export async function simulateIncomingMessage(options: {
  from: string;
  text: string;
  profileName?: string;
}): Promise<boolean> {
  const mockUrl = META_MOCK_URL;
  if (!mockUrl) {
    log.warn(
      "simulateIncomingMessage called with no META_API_BASE_URL — ignoring. " +
        "Inbound simulation only works against @rateup/meta-mock.",
    );
    return false;
  }

  const res = await axios({
    url: `${mockUrl}/__stub/webhook`,
    method: "POST",
    data: {
      name: "Received Text Message",
      from: options.from,
      text: options.text,
      profileName: options.profileName,
      wabaId: process.env.META_MOCK_WABA_ID,
      phoneNumberId: process.env.META_MOCK_PHONE_NUMBER_ID,
    },
    validateStatus: () => true,
  });

  if (!res.status.toString().startsWith("2")) {
    log.error("Could not replay an inbound message: %o", res.data);
    return false;
  }
  return true;
}
