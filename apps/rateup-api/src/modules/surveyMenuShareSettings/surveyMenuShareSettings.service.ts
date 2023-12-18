import prisma from "../../utils/prisma";

const getShareSettings = async (resourceName, id) => {
  let shareSettings;

  switch(resourceName) {
    case "survey": {
      shareSettings = await prisma.survey.findFirst({
        where: {
          id
        },
        select: {
          shareSettings: true
        }
      })
      break;
    }
    case "menu": {
      shareSettings = await prisma.menu.findFirst({
        where: {
          id
        },
        select: {
          shareSettings: true
        }
      })
      break;
    }
  }
  return shareSettings;
}

const saveShareSettings = async (resourceName, id, settingsObj) => {
  let updatedSettings;

  switch(resourceName) {
    case "survey": {
      updatedSettings = await prisma.survey.update({
        where: {
          id
        },
        data: {
          shareSettings: settingsObj
        },
        select: {
          shareSettings: true
        }
      })
      break;
    }
    case "menu": {
      updatedSettings = await prisma.menu.update({
        where: {
          id
        },
        data: {
          shareSettings: settingsObj
        },
        select: {
          shareSettings: true
        }
      })
    }
  }

  return updatedSettings;
}

export { saveShareSettings, getShareSettings };