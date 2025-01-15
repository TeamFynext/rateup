import { FastifyReply } from "fastify";
import { FastifyRequest } from "fastify/types/request";
import { RegisterBusinessBody } from "./wa_auth.schema";
import crypto from "crypto";
import {
  debug_token,
  getAccessTokenFromCode,
  getPhoneNumbersFromWABA,
  registerPhoneNumber,
  subscribeWABAToWebhook,
} from "./wa_auth.service";
import { log } from "../../../utils/logger";
import {
  createWaSettings,
  deleteWaSettings,
} from "../settings/wa_settings.service";
import { WaConfigType } from "../../../types/enums";
import { GraphApiError } from "../wa_axios";
import { handleWhatsappError } from "../wa_error_handler";
import {
  generateKeyPairsForWaEncryption,
  setNewEncryptionKeys,
} from "../encryption/wa_encryption.utils";
import { setBusinessPublicKey } from "../encryption/wa_encryption.service";

export async function registerBusinessClientHandler(
  req: FastifyRequest<{
    Body: RegisterBusinessBody;
  }>,
  rep: FastifyReply,
) {
  try {
    const { code, phone_number_id, waba_id } = req.body;
    const { orgId } = req.user;

    const accessToken = await getAccessTokenFromCode(code);
    console.log("🚀 ~ accessToken:", accessToken);
    // const ourAccessToken = process.env.wa_access_token;

    // Getting business details
    // const { data: businessDetails } = await debug_token(
    //   accessToken,
    //   ourAccessToken
    // );
    // log.trace("Business details: %o", businessDetails);
    // console.log("businessDetails", JSON.stringify(businessDetails));

    // const wabaId = businessDetails.granular_scopes.find(
    //   (scope) => scope.scope === "whatsapp_business_messaging"
    // ).target_ids[0];

    // Getting phone numbers & their ids
    const { data: phoneNumbers } = await getPhoneNumbersFromWABA(
      waba_id,
      accessToken,
    );
    console.log("🚀 ~ phoneNumbers:", phoneNumbers);

    // log.trace("Phone numbers: %o", phoneNumbers);

    const phone = phoneNumbers[0];
    // const wabaId = waba_id;

    // Subscribing to webhook
    const subRes = await subscribeWABAToWebhook(waba_id, accessToken);
    log.trace("App subscription response: %o", subRes);

    // Registering phone number
    const registerRes = await registerPhoneNumber(phone_number_id, accessToken);
    log.trace("Phone registration response: %o", registerRes);

    // Setting up encryption keys
    const keys: WaEncryptionKeys = await generateKeyPairsForWaEncryption(
      crypto.randomBytes(16).toString("hex"),
    );
    await setBusinessPublicKey(keys.publicKey, phone_number_id, accessToken);
    // Saving settings
    await createWaSettings(orgId, {
      wabaId: waba_id,
      phone: phone.display_phone_number.replace(/ /g, ""),
      phoneId: phone_number_id,
      accessToken,
      type: WaConfigType.Automated,
      appId: process.env.wa_app_id,
      encryption: keys,
    });

    log.info("Business client registered successfully");
    rep
      .status(200)
      .send({ message: "Business client registered successfully" });
  } catch (e) {
    log.error(e);
    if (e instanceof GraphApiError) {
      handleWhatsappError(e, req, rep);
    } else {
      rep.status(500).send({ message: "Internal server error" });
    }
  }
}

export async function deRegisterBusinessClientHandler(
  req: FastifyRequest,
  rep: FastifyReply,
) {
  try {
    // TODO
    await deleteWaSettings(req.user.orgId);
  } catch (e) {
    log.error(e);
    rep.status(500).send({ message: "Internal server error" });
  }
}
