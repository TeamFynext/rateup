import { IntegratedApps } from "../../../types/enums";
import prisma from "../../../utils/prisma";

export async function updateGoogleSheetToIntegration() {
  const googleAccessTokens = await prisma.googleAccessToken.findMany();
  if (!googleAccessTokens || !googleAccessTokens.length)
    return { message: "There is no data in googleAccessToken" };
  const integrations = await prisma.integration.findMany({
    where: {
      name: IntegratedApps.googlesheet,
    },
  });
  const isAllTransfrerred = googleAccessTokens.every((app) =>
    integrations.some((g) => g?.orgId === app?.orgId),
  );
  if (isAllTransfrerred)
    return { message: "All datas are already transferred" };
  const data = await Promise.all(
    googleAccessTokens.map(async (g) => {
      const res = await prisma.org.findUnique({
        where: {
          id: g.orgId,
        },
        select: {
          driveFolderId: true,
        },
      });
      return {
        name: IntegratedApps.googlesheet,
        credential: {
          accessToken: g.accessToken,
          refreshToken: g.refreshToken,
          expiryDate: g.expiryDate,
          scopes: g.scopes,
          userEmail: g?.userEmail,
          driveFolderId: res?.driveFolderId,
        },
        orgId: g.orgId,
      };
    }),
  );
  const result = await prisma.integration.createMany({
    data,
    skipDuplicates: true,
  });
  return { message: "All data tranfered successfully" };
}
