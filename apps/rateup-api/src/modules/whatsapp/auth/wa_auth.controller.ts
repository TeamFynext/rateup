import { FastifyReply } from "fastify";
import { FastifyRequest } from "fastify/types/request.js";
import { RegisterBusinessBody } from "./wa_auth.schema.js";
import crypto from "node:crypto";
import {
  getAccessTokenFromCode,
  getPhoneNumbersFromWABA,
  registerPhoneNumber,
  subscribeWABAToWebhook,
} from "./wa_auth.service.js";
import { log } from "../../../utils/logger.js";
import {
  createWaSettings,
  deleteWaSettings,
  getMetaAssets,
  syncMetaAssetstoDb,
  updateWaSettings,
} from "../settings/wa_settings.service.js";
import { WaConfigType } from "../../../types/enums.js";
import { callMetaApi, GraphApiError } from "../wa_axios.js";
import { handleWhatsappError } from "../wa_error_handler.js";
import { generateKeyPairsForWaEncryption } from "../encryption/wa_encryption.utils.js";
import { setBusinessPublicKey } from "../encryption/wa_encryption.service.js";
import prisma from "../../../utils/prisma.js";
import { recordAuditEvent } from "../../../utils/auditLog.js";

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

    const phone = phoneNumbers?.[0];

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
  req: FastifyRequest<{ Body: RegisterBusinessBody }>,
  rep: FastifyReply,
) {
  try {
    const { code } = req.body;
    const { waSettingsId } = req.params as { waSettingsId: string };

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
