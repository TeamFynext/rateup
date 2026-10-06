import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { IntegratedApps } from "../../../types/enums.js";
import { getWaSettings } from "../../whatsapp/settings/wa_settings.service.js";
import { generateMetaPaymentOauthLink, listMetaPaymentConfigurations } from "./wapayment.meta.js";
import {
  readWaPaymentConfigurations,
  WaPaymentError,
  type WaPaymentConfiguration,
} from "./wapayment.types.js";

const WHERE = (orgId: string) => ({
  orgid_integration_name_unique: { orgId, name: IntegratedApps.waPayment },
});

/**
 * Payment configurations belong to a WhatsApp Business account. RateUp reads
 * the org's default number's account, as the order-details send does.
 */
async function defaultAccount(orgId: string) {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) throw new WaPaymentError("Connect WhatsApp first.", 404);
  return waSettings;
}

/**
 * Changes the stored list under a row lock, so a sync and a link regeneration
 * landing together cannot drop each other's write. Creates the row only when
 * there is something to store: an account with no configurations is not
 * connected.
 */
async function updateStoredConfigurations(
  orgId: string,
  change: (stored: WaPaymentConfiguration[]) => WaPaymentConfiguration[],
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Integration" WHERE "orgId" = ${orgId}::uuid AND name = ${IntegratedApps.waPayment} FOR UPDATE`;
    const row = await tx.integration.findUnique({ where: WHERE(orgId) });
    const next = change(readWaPaymentConfigurations(row?.credential));
    if (!row && next.length === 0) return next;
    await tx.integration.upsert({
      where: WHERE(orgId),
      create: { orgId, name: IntegratedApps.waPayment, credential: next },
      update: { credential: next },
    });
    return next;
  });
}

export interface WaPaymentConfigurationsView {
  /** The WhatsApp number whose account was read. */
  phone: string | null;
  configurations: WaPaymentConfiguration[];
  /** Set when Meta could not be read and the list is the last one stored. */
  syncError?: string;
}

/**
 * The account's payment configurations, fresh from Meta, saved for the
 * order-details send. Each keeps the verification link RateUp generated for it
 * earlier, which Meta does not list.
 *
 * When Meta cannot be read the stored list is returned with the reason, so the
 * settings page still shows what the send will use.
 */
export async function syncWaPaymentConfigurations(
  orgId: string,
): Promise<WaPaymentConfigurationsView> {
  const account = await defaultAccount(orgId);
  const phone = account.phone ?? account.phoneDisplayName ?? null;

  let fromMeta: WaPaymentConfiguration[];
  try {
    fromMeta = await listMetaPaymentConfigurations(account);
  } catch (error) {
    if (!(error instanceof WaPaymentError)) throw error;
    const row = await prisma.integration.findUnique({ where: WHERE(orgId) });
    return {
      phone,
      configurations: readWaPaymentConfigurations(row?.credential),
      syncError: error.message,
    };
  }

  const configurations = await updateStoredConfigurations(orgId, (stored) =>
    fromMeta.map((config) => {
      const previous = stored.find((s) => s.configuration_name === config.configuration_name);
      return previous?.oauth_url
        ? { ...config, oauth_url: previous.oauth_url, expiration: previous.expiration }
        : config;
    }),
  );
  return { phone, configurations };
}

/** A new verification link for one configuration, saved beside it. */
export async function regenerateWaPaymentOauthLink(orgId: string, configurationName: string) {
  const row = await prisma.integration.findUnique({ where: WHERE(orgId) });
  const known = readWaPaymentConfigurations(row?.credential).some(
    (config) => config.configuration_name === configurationName,
  );
  if (!known) {
    throw new WaPaymentError(`No payment configuration named "${configurationName}".`, 404);
  }

  const link = await generateMetaPaymentOauthLink(await defaultAccount(orgId), configurationName);
  await updateStoredConfigurations(orgId, (stored) =>
    stored.map((config) =>
      config.configuration_name === configurationName ? { ...config, ...link } : config,
    ),
  );
  log.info({ orgId }, "WhatsApp payment verification link regenerated");
  return link;
}
