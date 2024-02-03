import prisma from "../../../utils/prisma";
import { getOrgIdAndRole } from "../../user/user.service";

async function getBusinessIdAccessToken(req) {
  const { orgId } = await getOrgIdAndRole({ id: req.userId });
  const { businessId, accessToken } = await prisma.whatsappSettings.findFirst({
    where: { orgId },
  });
  return {
    businessId,
    accessToken,
  };
}

export { getBusinessIdAccessToken };
