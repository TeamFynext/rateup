import { storeBusinessPortfolio } from "../settings/businessPortfolio.js";
import { FastifyReply } from "fastify";
import { FastifyRequest } from "fastify/types/request.js";
import type { RegisterBusinessBody, UserTokenBody } from "./auth.schema.js";
import crypto from "node:crypto";
import {
  getAccessTokenFromCode,
  getPhoneNumbersFromWABA,
  registerPhoneNumber,
  subscribeWABAToWebhook,
} from "./auth.service.js";
import { log } from "../../../../utils/logger.js";
import {
  createWaSettings,
  deleteWaSettings,
  getMetaAssets,
  syncMetaAssetstoDb,
  updateWaSettings,
} from "../settings/settings.service.js";
import { WaConfigType } from "../../../../types/enums.js";
import { callMetaApi, GraphApiError } from "../wa_axios.js";
import { handleWhatsappError } from "../wa_error_handler.js";
import { generateKeyPairsForWaEncryption } from "../encryption/encryption.utils.js";
import { setBusinessPublicKey } from "../encryption/encryption.service.js";
import prisma from "../../../../utils/prisma.js";
import { recordAuditEvent } from "../../../../utils/auditLog.js";

export async function registerBusinessClientHandler(
  req: FastifyRequest<{
    Body: RegisterBusinessBody;
  }>,
  rep: FastifyReply,
) {
  try {
    const { code, phone_number_id, waba_id, assets } = req.body;
    const { orgId } = req.user;

    if (phone_number_id) {
      const existing = await prisma.whatsappSettings.findFirst({
        where: {
          phoneId: phone_number_id,
          NOT: {
            orgId: orgId,
          },
        },
      });
      if (existing) {
        log.error(
          `Phone number ${phone_number_id} is already registered with another organization`,
        );
        return rep.status(400).send({ message: "Phone number already registered" });
      }
    }

    const accessToken = await getAccessTokenFromCode(code);

    // Getting phone numbers & their ids
    const { data: phoneNumbers } = await getPhoneNumbersFromWABA(waba_id, accessToken);

    log.trace("Phone numbers: %o", phoneNumbers);

    // A WABA can hold several numbers, and each is its own channel row. Pick the number this
    // signup was for; taking the first one made a second number from the same business
    // overwrite the first number's channel instead of adding its own.
    const phone = phone_number_id
      ? phoneNumbers?.find((number: { id: string }) => number.id === phone_number_id)
      : phoneNumbers?.length === 1
        ? phoneNumbers[0]
        : undefined;
    if (!phone) {
      log.error(
        { wabaId: waba_id, phoneNumberId: phone_number_id },
        "The signed-up phone number is not on this WhatsApp Business Account",
      );
      return rep
        .status(400)
        .send({ message: "Could not find the phone number from this signup. Try again." });
    }

    // Subscribing to webhook
    const subRes = await subscribeWABAToWebhook(waba_id, accessToken);
    log.trace("App subscription response: %o", subRes);

    // Registering phone number
    log.trace("Phone status: %o", phone?.status);
    if (phone_number_id && phone?.status !== "CONNECTED") {
      const registerRes = await registerPhoneNumber(phone_number_id, accessToken);
      log.trace("Phone registration response: %o", registerRes);
    }

    // Setting up encryption keys
    const keys: WaEncryptionKeys = await generateKeyPairsForWaEncryption(
      crypto.randomBytes(16).toString("hex"),
    );
    await setBusinessPublicKey(keys.publicKey, phone?.id, accessToken);
    // Saving settings
    const waSetting = await prisma.whatsappSettings.findFirst({
      where: {
        orgId,
        phoneId: phone?.id,
      },
    });
    if (waSetting) {
      await updateWaSettings(orgId, phone?.id, {
        accessToken,
        // The public key just registered with Meta above must pair with the private key on
        // file, or every Flow sent from this number fails to decrypt after a reconnect.
        encryption: keys,
        assets,
      });
      await recordAuditEvent(req, "Channel updated", {
        phoneId: phone?.id,
        phone: phone?.display_phone_number,
      });
    } else {
      const appId = process.env.wa_app_id;
      if (!appId) {
        throw new Error("wa_app_id environment variable is not configured");
      }
      await createWaSettings(orgId, {
        wabaId: waba_id,
        phone: phone?.display_phone_number?.replace(/ /g, ""),
        phoneId: phone?.id,
        accessToken,
        type: WaConfigType.Automated,
        appId,
        encryption: keys,
        assets,
      });
      await recordAuditEvent(req, "Channel added", {
        phoneId: phone?.id,
        phone: phone?.display_phone_number,
      });
    }

    // Which Meta business this number belongs to: BSUID customers can only be messaged from
    // numbers of the same business, and an org may connect several businesses.
    await storeBusinessPortfolio(orgId, waba_id, accessToken);

    log.info("Business client registered successfully");
    rep.status(200).send({ message: "Business client registered successfully" });
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
  req: FastifyRequest<{ Params: { phoneId: string } }>,
  rep: FastifyReply,
) {
  try {
    const deleted = await deleteWaSettings(req.user.orgId, req.params.phoneId);
    await recordAuditEvent(req, "Channel removed", {
      phoneId: deleted?.phoneId,
      phone: deleted?.phone,
    });
    rep.status(200).send({ message: "Business client deregistered successfully" });
  } catch (e) {
    log.error(e);
    rep.status(500).send({ message: "Internal server error" });
  }
}

export async function getUserAccessTokenHanlder(
  req: FastifyRequest<{ Body: UserTokenBody; Params: { waSettingsId: string } }>,
  rep: FastifyReply,
) {
  try {
    const { code } = req.body;
    const { waSettingsId } = req.params;

    // The pages synced below are written against this settings row, so it has to be the
    // caller's own. `getMetaAssets` returning null cannot tell "not yours" from "nothing
    // synced yet", so ownership is checked on its own, before anything reaches Meta.
    const owned = await prisma.whatsappSettings.findFirst({
      where: { id: waSettingsId, orgId: req.user.orgId },
      select: { id: true },
    });
    if (!owned) {
      return rep.status(404).send({ message: "WhatsApp settings not found" });
    }

    const userAccessToken = await getAccessTokenFromCode(
      code,
      encodeURIComponent(`${process.env.FRONTEND_URL}/${process.env.wa_user_redirect_uri}`),
    );
    const res = await callMetaApi(
      `/me/accounts?fields=id,name,access_token,instagram_business_account`,
      "GET",
      userAccessToken,
    );
    log.trace(
      { pages: (res?.data?.data as Array<{ id: string }> | undefined)?.map((page) => page.id) },
      "Pages fetched from meta by user access token",
    );
    const metaAssets = await getMetaAssets(waSettingsId, req.user.orgId);
    const metaPages: { id: string; name: string; access_token: string }[] = res.data?.data ?? [];
    const data =
      !metaAssets || !metaAssets?.pages.length
        ? metaPages.map((page) => {
            const subscribedFields: string[] = [];
            return { ...page, subscribedFields };
          })
        : metaAssets.pages.map((page) => {
            const pageData = metaPages.find((p) => p.id === page.id);
            if (pageData) {
              page.pageAccessTokenByUser = pageData.access_token;
            }
            return page;
          });
    const resp = await syncMetaAssetstoDb("pages", data, waSettingsId);
    rep.code(200).send(resp);
  } catch (e) {
    log.error(e);
    if (e instanceof GraphApiError) {
      handleWhatsappError(e, req, rep);
    } else {
      rep.status(500).send({ message: "Internal server error" });
    }
  }
}
