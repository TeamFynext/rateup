import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { callMetaApi } from "../wa_axios.js";
import { getWaSettingsById } from "./wa_settings.service.js";

/**
 * The Meta business portfolio (Business Manager) behind a WhatsApp number.
 *
 * A WABA is not the portfolio: one portfolio owns any number of WABAs, and it is the
 * portfolio that scopes business-scoped user IDs (BSUIDs) — a BSUID-only customer can be
 * messaged from any number of the same portfolio and from no other. An org may connect
 * numbers from several portfolios, so it is stored per number.
 */
export interface BusinessPortfolio {
  id: string;
  name: string | null;
}

/** The client's business for a partner-owned WABA, its owner otherwise. Null if Meta says neither. */
export async function fetchBusinessPortfolio(
  wabaId: string,
  accessToken: string,
): Promise<BusinessPortfolio | null> {
  const res = await callMetaApi(
    `/${wabaId}?fields=on_behalf_of_business_info,owner_business_info`,
    "GET",
    accessToken,
  );
  const business: { id?: string; name?: string } | undefined =
    res.data?.on_behalf_of_business_info ?? res.data?.owner_business_info;
  return business?.id ? { id: business.id, name: business.name ?? null } : null;
}

/**
 * Looks the portfolio up and stores it on every number of the WABA. Called on connect and by
 * the backfill. Never throws: a number without a portfolio still works, it is only treated
 * as unknown when picking who can message a BSUID-only customer.
 */
export async function storeBusinessPortfolio(
  orgId: string,
  wabaId: string | null | undefined,
  accessToken: string,
): Promise<BusinessPortfolio | null> {
  if (!wabaId) return null;
  try {
    const portfolio = await fetchBusinessPortfolio(wabaId, accessToken);
    if (!portfolio) return null;
    await prisma.whatsappSettings.updateMany({
      where: { orgId, wabaId },
      data: { businessPortfolioId: portfolio.id, businessPortfolioName: portfolio.name },
    });
    return portfolio;
  } catch (err) {
    log.warn({ err, orgId, wabaId }, "Could not look up the WhatsApp number's business portfolio");
    return null;
  }
}

/** The stored portfolio, looking it up (and storing it) the first time it is needed. */
export async function ensureBusinessPortfolio(
  whatsappSettingsId: string,
  orgId: string,
): Promise<BusinessPortfolio | null> {
  const row = await prisma.whatsappSettings.findFirst({
    where: { id: whatsappSettingsId, orgId },
    select: { businessPortfolioId: true, businessPortfolioName: true, wabaId: true },
  });
  if (!row) return null;
  if (row.businessPortfolioId)
    return { id: row.businessPortfolioId, name: row.businessPortfolioName };
  const settings = await getWaSettingsById(whatsappSettingsId, orgId);
  if (!settings?.accessToken) return null;
  return storeBusinessPortfolio(orgId, row.wabaId, settings.accessToken);
}
