import prisma from "../../../utils/prisma.js";
import { deleteFile } from "../../../utils/upload/s3Upload.js";
import {
  CreateMenuCategoryInput,
  SortMenuCategoryInput,
  UpdateMenuCategoryInput,
} from "./category.schema.js";

export async function createMenuCategory(data: CreateMenuCategoryInput) {
  const createData: any = {
    ...data,
    menuId: data.menuId,
    name: data.name,
    image: data.image,
  };
  await prisma.menuCategory.updateMany({
    where: {
      menuId: data.menuId,
    },
    data: {
      itemOrder: {
        increment: 1,
      },
    },
  });
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

export async function updateMenuCategory(categoryId: string, data: UpdateMenuCategoryInput) {
  let { ...newData } = data;

  const category = await prisma.menuCategory.update({
    where: {
      id: categoryId,
    },
    data: newData,
  });
  return category;
}

export async function sortMenuCategory(menuId: string, data: SortMenuCategoryInput) {
  let index = 0;
  let { itemOrder = [] } = data;

  for await (const item of itemOrder) {
    await prisma.menuCategory.updateMany({
      where: {
        AND: [
          { id: item.id },
          {
            menuId,
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

export async function deleteMenuCategory(categoryId: string) {
  const categoryData = await prisma.menuCategory.findFirst({
    where: { id: categoryId },
    select: {
      image: true,
      id: true,
    },
  });
  if (categoryData) {
    const items = await prisma.menuItem.findMany({
      where: {
        categoryId,
      },
      select: {
        images: true,
      },
    });
    let fileKeyArray = items?.flatMap((item) => item?.images?.map((image) => ({ Key: image })));
    if (categoryData?.image) fileKeyArray.push({ Key: categoryData?.image });
    const params = {
      Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
      Delete: {
        Objects: fileKeyArray,
      },
    };
    if (fileKeyArray?.length > 0) await deleteFile(params);
  }
  const category = await prisma.menuCategory.delete({
    where: {
      id: categoryId,
    },
  });
  return category;
}
