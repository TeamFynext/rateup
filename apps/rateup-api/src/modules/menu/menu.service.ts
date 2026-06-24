import dayjs from "dayjs";
import prisma from "../../utils/prisma.js";
import { deleteFile } from "../../utils/upload/s3Upload.js";
import { CreateMenuInput, UpdateMenuInput } from "./menu.schema.js";
import { getShortUrlId } from "../../utils/commonUtils.js";
import { updateMonthlyStat } from "../stats/stats.service.js";
import { createMenuBanner } from "./banner/banner.service.js";
import { createMenuCategory } from "./category/category.service.js";
import { createMenuItem } from "./item/item.service.js";
import { getTeamById } from "../team/team.service.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";

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
      shortUrlId: getShortUrlId(),
    },
  });

  if (menu) {
    let team = await getTeamById(teamId);
    await prisma.usageStats.update({
      where: { orgId: team.orgId },
      data: { menusCount: { increment: 1 } },
    });
  }

  return menu;
}

//Clone menu -  currently used to create initial sample menu for user signup
export async function cloneMenu(menuId: string, newTeamId: string, surveyTeamMapId: string) {
  const menuTemplate = await prisma.menu.findUnique({
    where: {
      id: menuId,
    },
  });

  let { shortUrlId: _shortUrlId, createdAt: _createdAt, ...restMenuData } = menuTemplate;

  const cloneMenuData = {
    ...restMenuData,
    teamId: newTeamId,
  };
  let newMenu = await createMenu(cloneMenuData);

  //clone menu landing - menu id
  const menuLanding = await prisma.menuLanding.findFirst({
    where: {
      menuId: menuId,
    },
  });

  let { createdAt: _landCreatedAt, ...restLandingData } = menuLanding;

  await prisma.menuLanding.create({
    data: {
      ...restLandingData,
      menuId: newMenu.id,
      surveyTeamMapId: surveyTeamMapId,
      visited: 0,
    },
  });

  //clone menu banner - menu id
  const menuBanners = await prisma.menuBanner.findMany({
    where: {
      menuId: menuId,
    },
  });

  for (const banner of menuBanners) {
    let { createdAt: _createdAt, ...rest } = banner;
    await createMenuBanner({ ...rest, menuId: newMenu.id });
  }

  //clone menu categories - menu id
  const menuCategories = await prisma.menuCategory.findMany({
    where: {
      menuId: menuId,
    },
  });

  for (const cat of menuCategories) {
    let { id, menuId: _menuId, ...rest } = cat;
    let newCat = await createMenuCategory({
      ...rest,
      menuId: newMenu.id,
    } as any);

    //clone menu -items, category id
    const menuItems = await prisma.menuItem.findMany({
      where: {
        categoryId: id,
      },
    });

    for (const item of menuItems) {
      let { createdAt: _createdAt, ...rest } = item;
      await createMenuItem({
        ...rest,
        categoryId: newCat.id,
        description: item.description || "",
        images: item.images || [],
        name: item.name || "",
        price: {
          price: (item.price as any)?.price || "0",
          type: (item.price as any)?.type || "FIXED",
        },
      });
    }
  }
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
  let menuSearchCondition =
    menuId?.length === 8
      ? {
          shortUrlId: menuId,
        }
      : {
          id: menuId,
        };
  const menu = await prisma.menu.findUnique({
    where: menuSearchCondition,
    include: {
      categories: {
        include: {
          items: {
            orderBy: {
              itemOrder: "asc",
            },
          },
        },
        orderBy: {
          itemOrder: "asc",
        },
      },
      team: {
        select: {
          orgId: true,
        },
      },
      menuLanding: {
        select: {
          backgroundImage: true,
          mobileBackgroundImage: true,
          logo: true,
          surveyTeamMapId: true,
          unsplashImage: true,
          visited: true,
          menuButtons: true,
          menu: {
            select: {
              currency: true,
              hideUnavailableCategory: true,
            },
          },
          surveyTeamMap: {
            select: {
              shortUrlId: true,
            },
          },
        },
      },
    },
  });
  const subscription = await prisma.subscription.findFirst({
    where: {
      orgId: menu?.team?.orgId,
    },
  });
  let expiry;
  const isExpired = dayjs().isAfter(subscription.expiresAt);
  if (!subscription.basePlanId && menu?.menuLanding?.visited >= 100)
    expiry = "Your free plan quota has been exceeded.";
  else if (isExpired) expiry = "Your subscription plan has expired.";
  if (menu.menuLanding) {
    delete menu.menuLanding.visited;
  }
  return { ...menu, expiry };
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
  const {
    surveyTeamMapId,
    teamId,
    backgroundImage,
    mobileBackgroundImage,
    logo,
    unsplashImage,
    colors,
    menuButtons,
    ...newObject
  } = data;
  const teamData = teamId && { team: { connect: { id: teamId } } };
  const menu = await prisma.menu.update({
    where: {
      id,
    },
    data: { ...newObject, ...teamData },
  });
  const createMenuLandingData = {
    menu: { connect: { id: id } },
  };
  if (surveyTeamMapId) {
    let surveyId = {
      surveyTeamMap: { connect: { id: data.surveyTeamMapId } },
      backgroundImage,
      mobileBackgroundImage,
      logo,
      unsplashImage,
      colors,
      menuButtons,
    };
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
  } else {
    await prisma.menuLanding.upsert({
      where: {
        menuId: id,
      },
      create: {
        ...createMenuLandingData,
      },
      update: {
        surveyTeamMapId: null,
        backgroundImage,
        mobileBackgroundImage,
        logo,
        unsplashImage,
        colors,
        menuButtons,
      },
    });
  }
  return menu;
}

export async function deleteMenu(id: string) {
  const categoryData = await prisma.menuCategory.findMany({
    where: { menuId: id },
    select: {
      image: true,
      id: true,
    },
  });
  let fileKeyArray = [];
  if (categoryData?.length > 0) {
    for await (const category of categoryData) {
      const items = await prisma.menuItem.findMany({
        where: {
          categoryId: category.id,
        },
        select: {
          images: true,
          id: true,
        },
      });

      items?.flatMap((item) =>
        item.images?.map((image) => {
          fileKeyArray.push({ Key: image });
        }),
      );
    }

    categoryData?.map(({ image }) => {
      if (image) fileKeyArray.push({ Key: image });
    });
    const params = {
      Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
      Delete: {
        Objects: fileKeyArray,
      },
    };
    if (fileKeyArray?.length > 0) await deleteFile(params);
  }

  const menu = await prisma.menu.delete({
    where: {
      id,
    },
  });

  if (menu) {
    let team = await getTeamById(menu.teamId);
    await prisma.usageStats.update({
      where: { orgId: team.orgId },
      data: { menusCount: { decrement: 1 } },
    });
  }

  return menu;
}
export async function getMenuLanding(id: string) {
  let menu;
  let menuSearchCondition =
    id?.length === 8
      ? {
          shortUrlId: id,
        }
      : {
          id: id,
        };
  menu = await prisma.menuLanding.findFirst({
    where: {
      menu: menuSearchCondition,
    },
    include: {
      menu: {
        include: {
          team: {
            select: {
              orgId: true,
            },
          },
        },
      },
      surveyTeamMap: {
        select: {
          surveyId: true,
          shortUrlId: true,
        },
      },
    },
  });

  if (!menu) {
    menu = await prisma.menu.findFirst({
      where: {
        id: id,
      },
      include: {
        team: {
          select: {
            orgId: true,
          },
        },
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

  let orgId = menu?.team?.orgId || menu?.menu?.team?.orgId;

  const subscription = await prisma.subscription.findUnique({
    where: {
      orgId,
    },
  });

  const isExpired = dayjs().isAfter(subscription.expiresAt);

  const usage = await prisma.usageStats.findUnique({
    where: {
      orgId,
    },
  });

  if (!subscription.basePlanId && menu.visited >= 100)
    menu.expiry = "Your free plan quota has been exceeded.";
  else if (isExpired) menu.expiry = "Your subscription plan has expired.";
  else if (
    usage.monthlyMenuViews >=
    subscription.features[SubscriptionFeaturePathName.Menu].count.monthlyViewLimit
  )
    menu.expiry = "Your menu view quota has been exceeded.";

  if (menu) {
    menu.subscription = subscription?.basePlanId;
    return menu;
  } else {
    return {
      success: false,
      message: "Menu data not found",
    };
  }
}

export async function updateVisitedMenuLanding(id: string) {
  const createMenuLandingData = {
    menu: { connect: { id: id } },
  };
  const menuLandingVisited = await prisma.menuLanding.upsert({
    where: {
      menuId: id,
    },
    create: {
      ...createMenuLandingData,
      visited: 1,
    },
    update: { visited: { increment: 1 } },
  });

  const menu = await prisma.menu.findUnique({
    where: {
      id: menuLandingVisited.menuId,
    },
    include: {
      team: {
        select: {
          orgId: true,
        },
      },
    },
  });

  if (menuLandingVisited && menu) {
    updateMonthlyStat("menu", menu.team.orgId);
  }

  return menuLandingVisited;
}
