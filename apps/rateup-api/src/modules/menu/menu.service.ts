import prisma from "../../utils/prisma";
import {
  CreateMenuInput,
  UpdateMenuInput,
  updateLandingPageOption,
  updateMenuLandingInput,
} from "./menu.schema";

export async function createMenu(data: CreateMenuInput) {
  if (data.teamId === undefined) return;
  const { teamId, ...restOfData } = data;
  const menu = await prisma.menu.create({
    // TODO: find why name & displayName are optional in the schema
    data: {
      ...restOfData,
      name: data.name,
      displayName: data.displayName,
      team: {
        connect: {
          id: teamId,
        },
      },
    },
  });
  return menu;
}

export async function getMenu(menuId: string) {
  const menu = await prisma.menu.findUnique({
    where: {
      id: menuId,
    },
  });
  return menu;
}

export async function getFullMenu(menuId: string) {
  const menu = await prisma.menu.findUnique({
    where: {
      id: menuId,
    },
    include: {
      categories: {
        include: {
          items: true,
        },
      },
      menuLanding: {
        select: {
          backgroundImage: true,
          mobileBackgroundImage: true,
          surveyTeamMapId: true,
        },
      },
    },
  });
  return menu;
}
export async function getAllMenus({ userId, role, orgId }) {
  let condition = {};
  if (role === "SUPER_ADMIN") {
    condition = {
      where: {
        team: {
          orgId,
        },
      },
      include: {
        team: {
          select: {
            code: true,
          },
        },
      },
    };
  } else {
    const member = await prisma.teamMember.findFirst({
      where: {
        userId: userId,
      },
    });
    condition = {
      where: {
        teamId: member?.teamId,
      },
      include: {
        team: {
          select: {
            code: true,
          },
        },
      },
    };
  }
  const menus = await prisma.menu.findMany(condition);
  return menus;
}

export async function getMenus(teamId: string) {
  const menus = await prisma.menu.findMany({
    where: {
      teamId,
    },
  });
  return menus;
}

export async function updateMenu(id: string, data: UpdateMenuInput) {
  const { surveyTeamMapId, ...newObject } = data;

  const menu = await prisma.menu.update({
    where: {
      id,
    },
    data: newObject,
  });

  if (surveyTeamMapId) {
    const createMenuLandingData = {
      menu: { connect: { id: id } },
    };
    let surveyId = { surveyTeamMap: { connect: { id: data.surveyTeamMapId } } };
    await prisma.menuLanding.upsert({
      where: {
        menuId: id,
      },
      create: {
        ...createMenuLandingData,
        ...surveyId,
      },
      update: surveyId,
    });
  }
  return menu;
}

export async function deleteMenu(id: string) {
  const menu = await prisma.menu.delete({
    where: {
      id,
    },
  });
  return menu;
}
export async function getMenuLanding(id: string) {
  let menu;
  menu = await prisma.menuLanding.findFirst({
    where: {
      menu: {
        id: id,
      },
    },
    include: {
      menu: true,
    },
  });
  if (!menu) {
    menu = await prisma.menu.findFirst({
      where: {
        id: id,
      },
    });
    menu = {
      success: true,
      menu,
      landingData: false,
    };
  } else {
    menu.landingData = true;
    menu = {
      success: true,
      ...menu,
    };
  }
  if (menu) {
    return menu;
  } else {
    return {
      success: false,
      message: "Menu data not found",
    };
  }
}

export async function updateMenuLanding(
  id: string,
  body: updateMenuLandingInput
) {
  let updatedMenuData = {
    displayName: body.titleText,
    locationText: body.locationText,
    websiteText: body.websiteText,
    logo: body.logo,
  };
  await prisma.menu.update({
    where: { id: id },
    data: updatedMenuData,
  });
  const updateMenuLandingData = {
    headerText: body.headerText,
    headerStyle: body.headerStyle,
    titleStyle: body.titleStyle,
    otherStyle: body.otherStyle,
    backgroundImage: body.backgroundImage,
    mobileBackgroundImage: body.mobileBackgroundImage,
    menu: { connect: { id: id } },
  };
  const menuLanding = await prisma.menuLanding.findFirst({
    where: {
      menu: {
        id: id,
      },
    },
  });
  let menu: any;

  if (menuLanding?.id) {
    menu = await prisma.menuLanding.update({
      where: { id: menuLanding?.id },
      data: updateMenuLandingData,
    });
  } else {
    menu = await prisma.menuLanding.create({
      data: updateMenuLandingData,
    });
  }
  return menu;
}

export async function updateLandingPage(
  id: string,
  data: updateLandingPageOption
) {
  const createMenuLandingData = {
    menu: { connect: { id: id } },
  };

  const menuLanding = await prisma.menuLanding.upsert({
    where: {
      menuId: id,
    },
    create: {
      ...createMenuLandingData,
      ...data?.option,
    },
    update: data?.option,
  });
  return menuLanding;
}
