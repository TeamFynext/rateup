import crypto from "node:crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  getWaSettings,
  getWaSettingsById,
  updateWaSettings,
} from "../settings/settings.service.js";
import { setBusinessPublicKey } from "./encryption.service.js";
import { openFlowKeys } from "./flowKeysAtRest.js";
import { log } from "../../../../utils/logger.js";
import { isNonProductionRuntime } from "../../../../utils/meta.js";
import { getFlowFromDb, handleDecryptedFlowRequest } from "../flows/flow.service.js";
import { FlowEndpointException, undecryptableRequest } from "../flows/flow.errors.js";
import { WhatsappSettings } from "../../../../generated/prisma/client.js";
import { envFlag } from "../../../../utils/envFlag.js";

// The raw (still-encrypted) request body WhatsApp Flow's endpoint sends us.
interface EncryptedFlowRequestBody {
  encrypted_flow_data: string;
  encrypted_aes_key: string;
  initial_vector: string;
}

export function generateKeyPairsForWaEncryption(passphrase: string): WaEncryptionKeys {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs1",
      format: "pem",
      cipher: "des-ede3-cbc",
      passphrase,
    },
  });
  return { publicKey, privateKey, passphrase };
}

export const decryptRequest = (
  body: EncryptedFlowRequestBody,
  privatePem: string,
  passphrase: string,
) => {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

  const privateKey = crypto.createPrivateKey({ key: privatePem, passphrase });
  let decryptedAesKey = null;
  try {
    // decrypt AES key created by client
    decryptedAesKey = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(encrypted_aes_key, "base64"),
    );
  } catch (error) {
    // A 421 tells the client to re-fetch our public key and retry, which is how
    // a key rotation heals itself rather than bricking every open flow.
    log.error({ err: error }, "Failed to decrypt the flow request's AES key");
    throw undecryptableRequest("Failed to decrypt the request. Please verify your private key.");
  }

  // decrypt flow data
  const flowDataBuffer = Buffer.from(encrypted_flow_data, "base64");
  const initialVectorBuffer = Buffer.from(initial_vector, "base64");

  const TAG_LENGTH = 16;
  const encrypted_flow_data_body = flowDataBuffer.subarray(0, -TAG_LENGTH);
  const encrypted_flow_data_tag = flowDataBuffer.subarray(-TAG_LENGTH);

  const decipher = crypto.createDecipheriv("aes-128-gcm", decryptedAesKey, initialVectorBuffer);
  decipher.setAuthTag(encrypted_flow_data_tag);

  const decryptedJSONString = Buffer.concat([
    decipher.update(encrypted_flow_data_body),
    decipher.final(),
  ]).toString("utf-8");

  return {
    decryptedBody: JSON.parse(decryptedJSONString),
    aesKeyBuffer: decryptedAesKey,
    initialVectorBuffer,
  };
};

export const encryptResponse = (
  response: unknown,
  aesKeyBuffer: Buffer,
  initialVectorBuffer: Buffer,
) => {
  // flip initial vector
  const flipped_iv = [];
  for (const pair of initialVectorBuffer.entries()) {
    flipped_iv.push(~pair[1]);
  }

  // encrypt response data
  const cipher = crypto.createCipheriv("aes-128-gcm", aesKeyBuffer, Buffer.from(flipped_iv));
  return Buffer.concat([
    cipher.update(JSON.stringify(response), "utf-8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64");
};

export async function setNewEncryptionKeys(waSettings: WhatsappSettings) {
  const { phoneId, accessToken, orgId } = waSettings;
  if (!phoneId) {
    throw new Error(`WhatsApp settings for orgId ${orgId} has no phoneId`);
  }
  const passphrase = crypto.randomBytes(16).toString("hex");
  // Never log `encryption` itself — it carries the private key and passphrase.
  const encryption = generateKeyPairsForWaEncryption(passphrase);

  await setBusinessPublicKey(encryption.publicKey, phoneId, accessToken);
  await updateWaSettings(orgId, phoneId, { encryption });
  log.info({ orgId, phoneId }, "Rotated the WhatsApp Flow encryption keys");
}

export async function handleFlowResponse(
  req: FastifyRequest<{
    Params: { orgId: string; dbFlowId: string };
    Body: EncryptedFlowRequestBody;
  }>,
  res: FastifyReply,
) {
  const { orgId, dbFlowId } = req.params;
  log.trace({ orgId, dbFlowId }, "Flow endpoint request");

  // 427 is the documented code for a request we understand but must not serve.
  // First thing checked: an unsigned request should not cost us a key lookup,
  // let alone a decryption.
  const signature = isRequestSignatureValid(req);
  if (!signature.valid) {
    log.warn(
      { ip: req.ip, reason: signature.reason, rawBodyLength: signature.rawBodyLength },
      "Rejected a WhatsApp Flow endpoint request that failed signature verification",
    );
    return res.status(427).send();
  }

  // Each number has its own key pair, so decrypt with the keys of the number the flow
  // lives on. The org's oldest number (getWaSettings' default) only holds for flows
  // that never recorded one; for any other it fails every request with an OAEP error.
  const dbFlow = await getFlowFromDb(dbFlowId, orgId);
  const waSettings = dbFlow?.whatsappSettingsId
    ? await getWaSettingsById(dbFlow.whatsappSettingsId, orgId)
    : await getWaSettings(orgId);
  if (!waSettings) {
    // The org disconnected WhatsApp but a published flow still points here. A 500 only
    // makes Meta retry; 427 closes the flow for the respondent.
    log.warn({ orgId, dbFlowId }, "Flow endpoint called for an org with no WhatsApp channel");
    return res.status(427).send();
  }
  const { encryption: storedEncryption, phoneId, accessToken } = waSettings;
  // Sealed rows and legacy plain rows both read here (WEBH-8). A sealed value that does not
  // decrypt throws: the request fails rather than silently re-keying the number.
  let encryption = openFlowKeys(storedEncryption);
  if (!encryption) {
    log.warn("Encryption keys not found for org: %s", orgId);

    if (!process.env.WA_FLOW_ENCRYPTION_KEYS) {
      throw new Error("WA_FLOW_ENCRYPTION is not set in .env file");
    }
    if (!phoneId) {
      throw new Error(`WhatsApp settings for orgId ${orgId} has no phoneId`);
    }

    // NOTE: this used to declare a shadowing `const encryption` here instead of
    // reassigning the outer `let encryption` - the freshly-generated fallback
    // keys were saved to the db but never actually used for this request, so
    // the destructure below would have been reached with the original
    // (still-null) value and crashed. Reassigning fixes that.
    const freshEncryption: WaEncryptionKeys = JSON.parse(process.env.WA_FLOW_ENCRYPTION_KEYS);
    encryption = freshEncryption;

    await setBusinessPublicKey(freshEncryption.publicKey, phoneId, accessToken);
    await updateWaSettings(orgId, phoneId, { encryption: freshEncryption });
  }
  if (!encryption) {
    throw new Error(`Failed to resolve encryption keys for orgId ${orgId}`);
  }
  const { privateKey, passphrase } = encryption;

  let decryptedRequest = null;
  try {
    decryptedRequest = decryptRequest(req.body, privateKey, passphrase);
  } catch (err) {
    if (err instanceof FlowEndpointException) {
      return res.status(err.statusCode).send();
    }
    log.error({ err }, "Failed to decrypt the flow request");
    return res.status(500).send();
  }

  const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest;

  try {
    if (!dbFlow) {
      throw new Error(`Flow not found in db for dbFlowId: ${dbFlowId}`);
    }

    const screenResponse = await handleDecryptedFlowRequest(decryptedBody, dbFlow);

    res.send(encryptResponse(screenResponse, aesKeyBuffer, initialVectorBuffer));
  } catch (error) {
    // A run we cannot serve (unknown or tampered token) closes the flow with a
    // message for the respondent, rather than a 500 Meta would keep retrying.
    if (error instanceof FlowEndpointException) {
      log.warn({ err: error }, "Refusing the flow request");
      return res
        .status(error.statusCode)
        .send(
          encryptResponse(
            { error_msg: error.errorMessage ?? "This message is no longer available" },
            aesKeyBuffer,
            initialVectorBuffer,
          ),
        );
    }
    log.error({ err: error }, "Error getting next screen");
    return res.status(500).send();
  }
}
/**
 * Why a delivery failed verification. Distinguished so the logs say which of the
 * several very different causes it was — a missing header (Meta is not signing
 * at all) is a different problem from a mismatch (wrong secret, or a body that
 * was re-serialized before hashing).
 */
export type SignatureCheck =
  | { valid: true }
  | {
      valid: false;
      reason:
        | "no-app-secret"
        | "no-signature-header"
        | "malformed-signature-header"
        | "no-raw-body"
        | "unparsable-signature"
        | "signature-mismatch";
      rawBodyLength?: number;
    };

/**
 * Meta signs every endpoint delivery with the app secret over the raw body.
 * Verifying it is what stops anyone who knows the URL from driving the endpoint;
 * the payload encryption alone does not authenticate the caller.
 *
 * Needs `config: { rawBody: true }` on the route — a re-serialized body would
 * not hash identically. See flow.endpoint-routes.ts.
 */
export function isRequestSignatureValid(req: FastifyRequest): SignatureCheck {
  // Trimmed: a trailing newline picked up from an env file or a dashboard paste
  // changes the digest and is invisible in logs.
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appSecret) {
    return { valid: false, reason: "no-app-secret" };
  }

  const header = req.headers["x-hub-signature-256"];
  if (typeof header !== "string") {
    return { valid: false, reason: "no-signature-header" };
  }
  if (!header.startsWith("sha256=")) {
    return { valid: false, reason: "malformed-signature-header" };
  }

  const rawBody = (req as FastifyRequest & { rawBody?: string | Buffer }).rawBody;
  if (rawBody === undefined) {
    return { valid: false, reason: "no-raw-body" };
  }

  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest();
  let received: Buffer;
  try {
    received = Buffer.from(header.slice("sha256=".length), "hex");
  } catch {
    return { valid: false, reason: "unparsable-signature" };
  }

  // timingSafeEqual throws on a length mismatch, so check that first.
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    // Development only: it logs the expected signature, which is an HMAC oracle for
    // the raw body, so the flag does nothing in production.
    if (envFlag("FLOW_SIGNATURE_DEBUG") && isNonProductionRuntime()) {
      // Everything needed to reproduce the digest offline and find which secret
      // Meta actually signed with. The body is the encrypted envelope, so this
      // leaks no answer data — but it is verbose, hence the explicit opt-in.
      log.warn(
        {
          receivedSignature: header,
          expectedSignature: `sha256=${expected.toString("hex")}`,
          rawBody: typeof rawBody === "string" ? rawBody : rawBody.toString("utf8"),
        },
        "Flow endpoint signature debug",
      );
    }
    return { valid: false, reason: "signature-mismatch", rawBodyLength: rawBody.length };
  }
  return { valid: true };
}
