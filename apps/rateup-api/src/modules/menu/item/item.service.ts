import prisma from "../../../utils/prisma";
import { UpdateMenuInput } from "../menu.schema";
import { CreateMenuItemInput } from "./item.schema";

export async function createMenuItem(data: CreateMenuItemInput) {
  const existingMenuData = await prisma.menuItem.findFirst({
    where: {
      categoryId: data?.categoryId,
    },
    orderBy: {
      itemOrder: "desc",
    },
  });

  const createData: any = {
    categoryId: data.categoryId,
    description: data.description,
    name: data.name,
    price: data.price,
  };

  if (existingMenuData) {
    createData.itemOrder = Number(existingMenuData.itemOrder) + 1;
  }

  const menuItem = await prisma.menuItem.create({
    data: createData,
  });

  return menuItem;
}

export async function getMenuItem(menuId: string) {
  const menuItem = await prisma.menuItem.findUnique({
    where: {
      id: menuId,
    },
  });
  return menuItem;
}

export async function getMenuItemByCategory(categoryId: string) {
  const menuItem = await prisma.menuItem.findMany({
    where: {
      categoryId,
    },
    orderBy: {
      itemOrder: "asc",
    },
  });
  return menuItem;
}

export async function updateMenuItem(id: string, data: UpdateMenuInput) {
  let { itemOrder, ...newData } = data;

  if (itemOrder === "up" || itemOrder === "down") {
    const menuItemDataOne = await prisma.menuItem.findUnique({
      where: { id },
    });

    const categoryId = menuItemDataOne.categoryId;
    const targetOrder: number =
      itemOrder === "up"
        ? Number(menuItemDataOne?.itemOrder) - 1
        : Number(menuItemDataOne?.itemOrder) + 1;

    if (itemOrder === "up" && targetOrder < 0) return;
    const menuItemDataTwo = await prisma.menuItem.findFirst({
      where: {
        itemOrder: targetOrder,
        categoryId,
      },
    });

    if (menuItemDataTwo) {
      const targetOrderTwo: number =
        itemOrder === "up"
          ? Number(menuItemDataTwo?.itemOrder) + 1
          : Number(menuItemDataTwo?.itemOrder) - 1;

      await prisma.menuItem.update({
        where: { id: menuItemDataOne.id },
        data: { itemOrder: targetOrder },
      });

      await prisma.menuItem.update({
        where: { id: menuItemDataTwo.id },
        data: { itemOrder: targetOrderTwo },
      });
    }
    return;
  }
  const menuItem = await prisma.menuItem.update({
    where: { id },
    data: newData,
  });

  return menuItem;
}

export async function deleteMenuItem(id: string) {
  const menuItem = await prisma.menuItem.delete({
    where: {
      id,
    },
  });
  return menuItem;
}
