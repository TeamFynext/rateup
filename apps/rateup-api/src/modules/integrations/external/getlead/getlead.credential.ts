import prisma from "../../../../utils/prisma.js";
import { IntegratedApps } from "../../../../types/enums.js";
import { getGetLeadCredential, type GetLeadCredential } from "./getlead.types.js";

/**
 * Reading and writing the org's GetLead credential. Its own module because the
 * connect, settings and webhook halves all write it, and none of them should
 * have to import another to do so.
 */

/** The org's GetLead integration row, or null when it was never connected. */
export async function getGetLeadIntegration(orgId: string) {
  return prisma.integration.findUnique({
    where: {
      orgid_integration_name_unique: { orgId, name: IntegratedApps.getlead },
    },
  });
}

/**
 * Writes `patch` over the stored credential, keeping every field it does not
 * mention.
 *
 * `updateIntegrationByName` assigns the whole `credential` column, so saving one
 * part of the config through it would drop the rest — a mapping save would wipe
 * the API key. Everything that edits GetLead config goes through here instead.
 */
export async function mergeGetLeadCredential(
  orgId: string,
  patch: Partial<GetLeadCredential>,
): Promise<GetLeadCredential> {
  const existing = await getGetLeadIntegration(orgId);
  const current = existing ? getGetLeadCredential(existing) : ({} as GetLeadCredential);
  const credential: GetLeadCredential = { ...current, ...patch };

  await prisma.integration.upsert({
    where: {
      orgid_integration_name_unique: { orgId, name: IntegratedApps.getlead },
    },
    create: { orgId, name: IntegratedApps.getlead, credential },
    update: { credential },
  });

  return credential;
}
