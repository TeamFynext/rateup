import crypto from "node:crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { getWaSettings, updateWaSettings } from "../settings/wa_settings.service.js";
import { setBusinessPublicKey } from "./wa_encryption.service.js";
import { log } from "../../../utils/logger.js";
import { getFlowFromDb, handleDecryptedFlowRequest } from "../flows/flow.service.js";
import { WhatsappSettings } from "../../../../generated/prisma/client.js";

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
    console.error(error);
    /*
        Failed to decrypt. Please verify your private key.
        If you change your public key. You need to return HTTP status code 421 to refresh the public key on the client
        */
    throw new FlowEndpointException(
      421,
      "Failed to decrypt the request. Please verify your private key.",
    );
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

export const FlowEndpointException = class FlowEndpointException extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
};

export async function setNewEncryptionKeys(waSettings: WhatsappSettings) {
  const { phoneId, accessToken, orgId } = waSettings;
  if (!phoneId) {
    throw new Error(`WhatsApp settings for orgId ${orgId} has no phoneId`);
  }
  const passphrase = crypto.randomBytes(16).toString("hex");
  log.trace("Passphrase generated");

  log.trace("Generating new key pairs for encryption");
  const encryption = generateKeyPairsForWaEncryption(passphrase);
  log.trace("Generated key pairs: %o", encryption);

  await setBusinessPublicKey(encryption.publicKey, phoneId, accessToken);

  log.trace("Updating encryption keys in database");
  await updateWaSettings(orgId, phoneId, { encryption });
  log.trace("Encryption keys updated successfully");
}

export async function handleFlowResponse(
  req: FastifyRequest<{
    Params: { orgId: string; dbFlowId: string };
    Body: EncryptedFlowRequestBody;
  }>,
  res: FastifyReply,
) {
  log.trace("Received request to handle flow response \n%o\n%o", req.url, req.body);
  const { orgId } = req.params;

  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error("No WhatsApp settings found for orgId " + orgId);
  }
  const { encryption: storedEncryption, phoneId, accessToken } = waSettings;
  let encryption = storedEncryption;
  if (!encryption) {
    log.warn("Encryption keys not found for org: %s", orgId);

    if (!process.env.wa_flow_encryption) {
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
    const freshEncryption: WaEncryptionKeys = JSON.parse(process.env.wa_flow_encryption);
    encryption = freshEncryption;

    await setBusinessPublicKey(freshEncryption.publicKey, phoneId, accessToken);
    await updateWaSettings(orgId, phoneId, { encryption: freshEncryption });
  }
  if (!encryption) {
    throw new Error(`Failed to resolve encryption keys for orgId ${orgId}`);
  }
  const { privateKey, passphrase } = encryption;

  if (!isRequestSignatureValid(req)) {
    // Return status code 432 if request signature does not match.
    // To learn more about return error codes visit: https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes#endpoint_error_codes
    log.error("Request signature is not valid");
    return res.status(432).send();
  }

  let decryptedRequest = null;
  try {
    decryptedRequest = decryptRequest(req.body, privateKey, passphrase);
  } catch (err) {
    console.error(err);
    if (err instanceof FlowEndpointException) {
      return res.status(err.statusCode).send();
    }
    return res.status(500).send();
  }

  const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest;
  log.trace("💬 Decrypted Request:%o", decryptedBody);

  // TODO: Uncomment this block and add your flow token validation logic.
  // If the flow token becomes invalid, return HTTP code 427 to disable the flow and show the message in `error_msg` to the user
  // Refer to the docs for details https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes#endpoint_error_codes

  /*
    if (!isValidFlowToken(decryptedBody.flow_token)) {
      const error_response = {
        error_msg: `The message is no longer available`,
      };
      return res
        .status(427)
        .send(
          encryptResponse(error_response, aesKeyBuffer, initialVectorBuffer)
        );
    }
    */

  try {
    log.trace(req.params.dbFlowId);
    const dbFlow = await getFlowFromDb(req.params.dbFlowId);
    if (!dbFlow) {
      throw new Error(`Flow not found in db for dbFlowId: ${req.params.dbFlowId}`);
    }
    log.trace("👉 DB Flow:%o", { name: dbFlow.name, status: dbFlow.status });

    const screenResponse = await handleDecryptedFlowRequest(decryptedBody, dbFlow);

    log.trace({ screenResponse }, "👉 Response to Encrypt");

    res.send(encryptResponse(screenResponse, aesKeyBuffer, initialVectorBuffer));
  } catch (error) {
    log.error({ err: error }, "Error getting next screen");
    return res.status(500).send();
  }
}
// const passphrase = process.env.WA_ENCRYPTION_PASSPHRASE;

// const APP_SECRET = passphrase;

export function isRequestSignatureValid(_req: FastifyRequest) {
  // AFAIK you can't access rawBody natively in Fastify. So skipping signature validation for now.
  // TODO: implement this after adding rawBody support in Fastify (maybe use fastify-raw-body?)
  return true;
  /*
  try {
    log.trace("Checking if request signature is valid");
    log.trace("Request headers: %o", req.headers);
    log.trace("APP_SECRET: %s", APP_SECRET);
    if (!APP_SECRET) {
      console.warn(
        "App Secret is not set up. Please Add your app secret in /.env file to check for request validation",
      );
      return true;
    }

    const signatureHeader = req.headers["x-hub-signature-256"] as string;
    const signatureBuffer = Buffer.from(signatureHeader.replace("sha256=", ""), "utf-8");

    const hmac = crypto.createHmac("sha256", APP_SECRET);
    const digestString = hmac.update("").digest("hex");
    const digestBuffer = Buffer.from(digestString, "utf-8");

    if (!crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
      console.error("Error: Request Signature did not match");
      return false;
    }
    log.trace("Request signature is valid");
    return true;
  } catch (error) {
    log.error("Error checking request signature: %o", error);
    console.log("erorrrr", error);
  }
  */
}
