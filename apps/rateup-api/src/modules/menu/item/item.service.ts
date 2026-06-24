import { MultipartFile } from "@fastify/multipart";
import prisma from "../../../utils/prisma.js";
import { deleteFile } from "../../../utils/upload/s3Upload.js";
import { SortMenuCategoryInput } from "../category/category.schema.js";
import { CreateMenuItemInput, UpdateMenuItemInput } from "./item.schema.js";
import Papa from "papaparse";

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
    foodLabels: data?.foodLabels,
    unsplashImage: data?.unsplashImage,
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

export async function updateMenuItem(id: string, data: UpdateMenuItemInput) {
  let { ...newData } = data;

  const menuItem = await prisma.menuItem.update({
    where: { id },
    data: newData,
  });

  return menuItem;
}

export async function sortMenuItem(categoryId: string, data: SortMenuCategoryInput) {
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
export async function createMenuItemUsingCsv(data: MultipartFile, menuId: string) {
  const requiredHeaders = ["categoryname", "name", "description", "price"];
  const content = await data.toBuffer();
  const results = Papa.parse(content.toString(), {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header?.toLowerCase(),
    transform: (data: string | number, header: string) =>
      requiredHeaders.includes(header?.toLowerCase()) && data ? data : undefined,
  });

  const filteredDatas = results.data.filter((row) =>
    requiredHeaders.every((header) => header in row && row[header] !== undefined),
  );
  for await (const filteredData of filteredDatas) {
    let category = await prisma.menuCategory.findFirst({
      where: {
        name: filteredData.categoryname,
        menuId,
      },
    });
    let itemOrder = 0;
    if (!category) {
      await prisma.menuCategory.updateMany({
        where: {
          menuId,
        },
        data: {
          itemOrder: {
            increment: 1,
          },
        },
      });
      category = await prisma.menuCategory.create({
        data: {
          name: filteredData?.categoryname,
          menuId,
        },
      });
    } else {
      const existingMenuData = await prisma.menuItem.findFirst({
        where: {
          categoryId: category?.id,
        },
        orderBy: {
          itemOrder: "desc",
        },
      });
      if (existingMenuData) {
        itemOrder = Number(existingMenuData.itemOrder) + 1;
      }
    }
    await prisma.menuItem.create({
      data: {
        name: filteredData?.name,
        description: filteredData?.description,
        price: {
          price: filteredData?.price,
          type: "FIXED",
        },
        categoryId: category?.id,
        itemOrder,
      },
    });
  }
  return "sucess";
}
