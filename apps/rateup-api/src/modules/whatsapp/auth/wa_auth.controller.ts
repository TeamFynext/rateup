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
  getMetaAssets,
  syncMetaAssetstoDb,
  updateWaSettings,
} from "../settings/wa_settings.service";
import { WaConfigType } from "../../../types/enums";
import { callWhatsappApi, GraphApiError } from "../wa_axios";
import { handleWhatsappError } from "../wa_error_handler";
import {
  generateKeyPairsForWaEncryption,
  setNewEncryptionKeys,
} from "../encryption/wa_encryption.utils";
import { setBusinessPublicKey } from "../encryption/wa_encryption.service";
import prisma from "../../../utils/prisma";

export async function registerBusinessClientHandler(
  req: FastifyRequest<{
    Body: RegisterBusinessBody;
  }>,
  rep: FastifyReply,
) {
  try {
    const { code, phone_number_id, waba_id } = req.body;
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
        return rep
          .status(400)
          .send({ message: "Phone number already registered" });
      }
    }

    const accessToken = await getAccessTokenFromCode(code);

    // Getting phone numbers & their ids
    const { data: phoneNumbers } = await getPhoneNumbersFromWABA(
      waba_id,
      accessToken,
    );

    log.trace("Phone numbers: %o", phoneNumbers);

    const phone = phoneNumbers?.[0];

    // Subscribing to webhook
    const subRes = await subscribeWABAToWebhook(waba_id, accessToken);
    log.trace("App subscription response: %o", subRes);

    // Registering phone number
    if (phone_number_id) {
      const registerRes = await registerPhoneNumber(
        phone_number_id,
        accessToken,
      );
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
      });
    } else {
      await createWaSettings(orgId, {
        wabaId: waba_id,
        phone: phone?.display_phone_number?.replace(/ /g, ""),
        phoneId: phone?.id,
        accessToken,
        type: WaConfigType.Automated,
        appId: process.env.wa_app_id,
        encryption: keys,
      });
    }

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
  req: FastifyRequest<{ Params: { phoneId: string } }>,
  rep: FastifyReply,
) {
  try {
    // TODO
    await deleteWaSettings(req.user.orgId, req.params.phoneId);
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
      encodeURIComponent(
        `${process.env.FRONTEND_URL}/${process.env.wa_user_redirect_uri}`,
      ),
    );
    const url = `/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`;
    const res = await callWhatsappApi(url, "GET");
    log.info("Pages fetched from meta by user access token:%o", res?.data);
    const metaAssets = await getMetaAssets(waSettingsId);
    const data =
      !metaAssets || !metaAssets?.pages.length
        ? res.data?.data.map((page) => ({ ...page, subscribedFields: [] }))
        : metaAssets.pages.map((page) => {
            const pageData = res.data?.data?.find((p) => p.id === page.id);
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
