import prisma from "../../../../../../../utils/prisma";

export async function getLoyaltyActionByActionId(action_id, orgId) {
  return await prisma.loyaltyAction.findUnique({
    where: {
      action_id_org_id_unique: {
        action_id,
        orgId,
      },
    },
  });
}
