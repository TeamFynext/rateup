import prisma from "../../../utils/prisma";
import { deleteFile } from "../../../utils/upload/s3Upload";
import { SortMenuCategoryInput } from "../category/category.schema";
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
    categoryId: data?.categoryId,
    description: data?.description,
    name: data?.name,
    price: data?.price,
    images: data?.images,
    videoUrl: data?.videoUrl,
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

  const menuItem = await prisma.menuItem.update({
    where: { id },
    data: newData,
  });

  return menuItem;
}

export async function sortMenuItem(
  categoryId: string,
  data: SortMenuCategoryInput
) {
  let index = 0;
  let { itemOrder = [] } = data;

  for await (const item of itemOrder) {
    await prisma.menuItem.updateMany({
      where: {
        AND: [
          { id: item.id },
          {
            categoryId,
          },
        ],
      },
      data: {
        itemOrder: index,
      },
    });
    index++;
  }
  return "updated";
}
export async function deleteMenuItem(id: string) {
  const item = await prisma.menuItem.findFirst({
    where: {
      id,
    },
    select: {
      images: true,
    },
  });
  const fileKeyArray = item?.images?.map((item) => ({ Key: item }));
  const params = {
    Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
    Delete: {
      Objects: fileKeyArray,
    },
  };
  if (item?.images?.length > 0) await deleteFile(params);
  const menuItem = await prisma.menuItem.delete({
    where: {
      id,
    },
  });
  return menuItem;
}
