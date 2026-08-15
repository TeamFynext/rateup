import { log } from "../../logger.js";
import prisma from "../../../../utils/prisma.js";

/** The org's credentials for one integration, or undefined if it is not connected. */
export async function getIntegrationByName(name: string, orgId: string) {
  try {
    const integration = await prisma.integration.findUnique({
      where: { orgid_integration_name_unique: { orgId, name } },
    });
    if (!integration) {
      log.trace("no %s integration found for orgId => %s", name, orgId);
      return;
    }
    return integration;
  } catch (e) {
    log.error({ err: e }, "error in getIntegrationByName");
    throw e;
  }
}
