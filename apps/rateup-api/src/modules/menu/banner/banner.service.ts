import prisma from "../../../utils/prisma.js";
import { deleteFile } from "../../../utils/upload/s3Upload.js";
import { CreateMenuCategoryInput } from "../category/category.schema.js";
import { CreateMenuBannerInput } from "./banner.schema.js";

export async function createMenuBanner(data: CreateMenuBannerInput) {
  const menuBanner = await prisma.menuBanner.create({
    data: {
      menuId: data?.menuId,
      description: data?.description,
      name: data?.name,
      price: data?.price,
      image: data?.image,
      videoUrl: data?.videoUrl,
      foodLabels: data?.foodLabels,
    },
  });

  return menuBanner;
}

export async function getMenuBanner(menuId: string) {
  let menuSearchCondition =
    menuId?.length === 8
      ? {
          menu: {
            shortUrlId: menuId,
          },
        }
      : {
          menuId: menuId,
        };
  const menuBanner = await prisma.menuBanner.findMany({
    where: menuSearchCondition,
    orderBy: {
      createdAt: "asc",
    },
  });
  return menuBanner;
}

export async function updateMenuBanner(id: string, data: CreateMenuCategoryInput) {
  const menuBanner = await prisma.menuBanner.update({
    where: { id },
    data,
  });

  return menuBanner;
}

export async function deletemenuBanner(id: string) {
  const item = await prisma.menuBanner.findFirst({
    where: {
      id,
    },
    select: {
      image: true,
    },
  });
  const fileKeyArray = [{ Key: item?.image }];
  const params = {
    Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
    Delete: {
      Objects: fileKeyArray,
    },
  };
  if (item?.image) await deleteFile(params);
  const menuBanner = await prisma.menuBanner.delete({
    where: {
      id,
    },
  });
  return menuBanner;
}
