import prisma from "../../../../utils/prisma.js";
import { LEADS_PIPELINE_TYPE } from "../../../pipeline/pipelineTypes.js";
import { IntegrationConnectError } from "../../shared/oauthConnectError.js";
import { getGetLeadIntegration, mergeGetLeadCredential } from "./getlead.credential.js";
import { getGetLeadCredential, type GetLeadCredential } from "./getlead.types.js";

/** The configurable half of the credential — everything but the key itself. */
export async function getGetLeadSettings(orgId: string) {
  const integration = await getGetLeadIntegration(orgId);
  if (!integration) {
    throw new IntegrationConnectError("GetLead is not connected for this organisation.", 404);
  }

  const credential = getGetLeadCredential(integration);
  return {
    stageMappings: credential.stageMappings ?? [],
    defaults: credential.defaults ?? {},
    triggerSubscriptions: credential.triggerSubscriptions ?? [],
  };
}

/**
 * Saves mappings, defaults and trigger toggles.
 *
 * Goes through `mergeGetLeadCredential` rather than the generic integration
 * update, which assigns the whole `credential` column and would drop the API key
 * along with everything else this does not mention (§5.2).
 */
export async function saveGetLeadSettings(
  orgId: string,
  patch: Pick<GetLeadCredential, "stageMappings" | "defaults" | "triggerSubscriptions">,
) {
  const integration = await getGetLeadIntegration(orgId);
  if (!integration) {
    throw new IntegrationConnectError("GetLead is not connected for this organisation.", 404);
  }

  // Every mapped column must be one of this org's own.
  //
  // The ids arrive from the client and are only shape-checked by the schema, so
  // without this an org could map a column belonging to someone else — and an
  // inbound status change would then move its lead onto a board it has no part
  // in. Rejected rather than filtered out, because a mapping that silently did
  // not save would be worse than an error.
  if (patch.stageMappings?.length) {
    const owned = await prisma.pipelineStage.count({
      where: {
        id: { in: patch.stageMappings.map((m) => m.stageId) },
        pipeline: { orgId, type: LEADS_PIPELINE_TYPE },
      },
    });
    const distinct = new Set(patch.stageMappings.map((m) => m.stageId)).size;
    if (owned !== distinct) {
      throw new IntegrationConnectError(
        "A mapped column does not belong to this organisation.",
        400,
      );
    }
  }

  const credential = await mergeGetLeadCredential(orgId, patch);
  return {
    stageMappings: credential.stageMappings ?? [],
    defaults: credential.defaults ?? {},
    triggerSubscriptions: credential.triggerSubscriptions ?? [],
  };
}
