import prisma from "../../utils/prisma.js";
import type { StoredShareSettings } from "./utils.js";
import type { ShareSettingsResource } from "./shareSettings.schema.js";

// Both services are handed the Fastify request but only read the session org —
// typing that structurally keeps route handlers and unit tests assignable.
interface WithUser {
  user?: { orgId?: string };
}

const surveyOfOrg = (id: string, orgId: string | undefined) => ({
  id,
  OR: [{ orgId }, { teams: { some: { team: { orgId } } } }],
});

const getShareSettings = async (resourceName: ShareSettingsResource, id: string, req: WithUser) => {
  const orgId = req.user?.orgId;
  let shareSettings;

  switch (resourceName) {
    case "survey": {
      shareSettings = await prisma.survey.findFirst({
        where: surveyOfOrg(id, orgId),
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
          ownerOrgId: orgId,
        },
      });
      break;
    }
  }
  return shareSettings;
};

const saveShareSettings = async (
  resourceName: ShareSettingsResource,
  id: string,
  settingsObj: StoredShareSettings,
  req: WithUser,
) => {
  const orgId = req.user?.orgId;
  let updatedSettings;

  switch (resourceName) {
    case "survey": {
      updatedSettings = await prisma.survey.update({
        where: surveyOfOrg(id, orgId),
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
          ownerOrgId: orgId,
        },
        data: {
          shareSettings: settingsObj,
        },
      });
      break;
    }
  }

  return updatedSettings;
};

export { saveShareSettings, getShareSettings };
