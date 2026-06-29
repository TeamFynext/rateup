import prisma from "../../utils/prisma.js";

const getShareSettings = async (resourceName, id, req) => {
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
          ownerOrgId: req.user.orgId,
        },
      });
    }
  }
  return shareSettings;
};

const saveShareSettings = async (resourceName, id, settingsObj, req) => {
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
          ownerOrgId: req.user.orgId,
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
