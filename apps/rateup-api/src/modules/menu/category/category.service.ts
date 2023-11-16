import prisma from "../../../utils/prisma";
import {
  CreateMenuCategoryInput,
  UpdateMenuCategoryInput,
} from "./category.schema";

export async function createMenuCategory(data: CreateMenuCategoryInput) {
  const existingCategoryData = await prisma.menuCategory.findFirst({
    where: {
      menuId: data.menuId,
    },
    orderBy: {
      itemOrder: "desc",
    },
  });
  const createData: any = {
    ...data,
    menuId: data.menuId,
    name: data.name,
    image: data.image,
  };
  if (existingCategoryData) {
    createData.itemOrder = Number(existingCategoryData.itemOrder) + 1;
  }
  const category = await prisma.menuCategory.create({
    data: createData,
  });
  return category;
}

export async function getMenuCategories(menuId) {
  const categories = await prisma.menuCategory.findMany({
    where: {
      menuId,
    },
    orderBy: {
      itemOrder: "asc",
    },
  });
  return categories;
}

export async function getMenuCategory(categoryId: string) {
  const category = await prisma.menuCategory.findUnique({
    where: {
      id: categoryId,
    },
  });
  return category;
}

export async function updateMenuCategory(
  categoryId: string,
  data: UpdateMenuCategoryInput
) {
  let { itemOrder, ...newData } = data;

  if (itemOrder === "up" || itemOrder === "down") {
    const menuCategoryDataOne = await prisma.menuCategory.findUnique({
      where: { id: categoryId },
    });

    const menuId = menuCategoryDataOne.menuId;

    const targetOrder: number =
      itemOrder === "up"
        ? Number(menuCategoryDataOne?.itemOrder) - 1
        : Number(menuCategoryDataOne?.itemOrder) + 1;

    if (itemOrder === "up" && targetOrder < 0) return;
    const menuCategoryDataTwo = await prisma.menuCategory.findFirst({
      where: {
        itemOrder: targetOrder,
        menuId,
      },
    });

    if (menuCategoryDataTwo) {
      const targetOrderTwo: number =
        itemOrder === "up"
          ? Number(menuCategoryDataTwo?.itemOrder) + 1
          : Number(menuCategoryDataTwo?.itemOrder) - 1;

      await prisma.menuCategory.update({
        where: { id: menuCategoryDataOne.id },
        data: { itemOrder: targetOrder },
      });

      await prisma.menuCategory.update({
        where: { id: menuCategoryDataTwo.id },
        data: { itemOrder: targetOrderTwo },
      });
    }
    return;
  }
  const category = await prisma.menuCategory.update({
    where: {
      id: categoryId,
    },
    data: newData,
  });
  return category;
}

export async function deleteMenuCategory(categoryId: string) {
  const category = await prisma.menuCategory.delete({
    where: {
      id: categoryId,
    },
  });
  return category;
}
