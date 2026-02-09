import { FastifyReply } from "fastify";
import { FastifyRequest } from "fastify/types/request.js";
import { RegisterBusinessBody } from "./wa_auth.schema.js";
import {
  debug_token,
  getAccessTokenFromCode,
  getPhoneNumbersFromWABA,
  registerPhoneNumber,
  subscribeWABAToWebhook,
} from "./wa_auth.service.js";
import {
  createWaSettings,
  deleteWaSettings,
} from "../settings/wa_settings.service.js";
import { WaConfigType } from "../../../../../../../types/enums.js";
import { log } from "../../../../../../../utils/logger.js";

export async function registerBusinessClientHandler(
  req: FastifyRequest<{
    Body: RegisterBusinessBody;
  }>,
  rep: FastifyReply,
) {
  try {
    const { code } = req.body;
    const { orgId } = req.user;

    const accessToken = await getAccessTokenFromCode(code);
    const ourAccessToken = process.env.wa_access_token;

    // Getting business details
    const { data: businessDetails } = await debug_token(
      accessToken,
      ourAccessToken,
    );
    log.trace("Business details: %o", businessDetails);

    const wabaId = businessDetails.granular_scopes.find(
      (scope) => scope.scope === "whatsapp_business_messaging",
    ).target_ids[0];

    // Getting phone numbers & their ids
    const { data: phoneNumbers } = await getPhoneNumbersFromWABA(
      wabaId,
      accessToken,
    );
    log.trace("Phone numbers: %o", phoneNumbers);

    const phone = phoneNumbers[0];

    // Subscribing to webhook
    const subRes = await subscribeWABAToWebhook(wabaId, accessToken);
    log.trace("App subscription response: %o", subRes);

    // Registering phone number
    const registerRes = await registerPhoneNumber(phone.id, accessToken);
    log.trace("Phone registration response: %o", registerRes);

    // Saving settings
    await createWaSettings(orgId, {
      wabaId,
      phone: phone.display_phone_number.replace(/ /g, ""),
      phoneId: phone.id,
      accessToken,
      type: WaConfigType.Automated,
      appId: process.env.wa_app_id,
      paymentMethod: "NATIVE",
    });

    log.info("Business client registered successfully");
    rep
      .status(200)
      .send({ message: "Business client registered successfully" });
  } catch (e) {
    log.error(e);
    rep.status(500).send({ message: "Internal server error" });
  }
}

export async function deRegisterBusinessClientHandler(
  req: FastifyRequest<{ Params: { phoneId: string } }>,
  rep: FastifyReply,
) {
  try {
    // TODO
    await deleteWaSettings(req.user.orgId, req.params?.phoneId);
  } catch (e) {
    log.error(e);
    rep.status(500).send({ message: "Internal server error" });
  }
}
