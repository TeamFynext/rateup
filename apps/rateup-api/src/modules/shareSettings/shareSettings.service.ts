import prisma from "../../utils/prisma.js";
import type { StoredShareSettings } from "./utils.js";

// Both services are handed the Fastify request but only read the session org —
// typing that structurally keeps route handlers and unit tests assignable.
interface WithUser {
  user?: { orgId?: string };
}

const getShareSettings = async (resourceName: string | undefined, id: string, req: WithUser) => {
  let shareSettings;

  switch (resourceName) {
    case "survey": {
      shareSettings = await prisma.survey.findFirst({
        where: {
          id,
        },
        select: {
          shareSettings: true,
        },
      });
      break;
    }
    case "generateQr": {
      shareSettings = await prisma.generateQr.findFirst({
        where: {
          id,
          ownerOrgId: req.user!.orgId,
        },
      });
    }
  }
  return shareSettings;
};

const saveShareSettings = async (
  resourceName: string | undefined,
  id: string,
  settingsObj: StoredShareSettings,
  req: WithUser,
) => {
  let updatedSettings;

  switch (resourceName) {
    case "survey": {
      updatedSettings = await prisma.survey.update({
        where: {
          id,
        },
        data: {
          shareSettings: settingsObj,
        },
        select: {
          shareSettings: true,
        },
      });
      break;
    }
    case "generateQr": {
      updatedSettings = await prisma.generateQr.update({
        where: {
          id,
          ownerOrgId: req.user!.orgId,
        },
        data: {
          shareSettings: settingsObj,
        },
      });
    }
  }

  return updatedSettings;
};

export { saveShareSettings, getShareSettings };
