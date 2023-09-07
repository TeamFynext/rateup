import prisma from "../../../utils/prisma";
import { CreateMenuCategoryInput, UpdateMenuCategoryInput } from "./category.schema";

export async function createMenuCategory(data: CreateMenuCategoryInput) {
    const category = await prisma.menuCategory.create({
        data
    })
    return category;
}

export async function getMenuCategories(menuId) {
    const categories = await prisma.menuCategory.findMany({
        where: {
            menuId
        }
    })
    return categories;
}

export async function getMenuCategory(categoryId: string) {
    const category = await prisma.menuCategory.findUnique({
        where: {
            id: categoryId
        }
    })
    return category
}

export async function updateMenuCategory(categoryId: string, data: UpdateMenuCategoryInput) {
    const category = await prisma.menuCategory.update({
        where: {
            id: categoryId
        },
        data
    })
    return category;
}

export async function deleteMenuCategory(categoryId: string) {
    const category = await prisma.menuCategory.delete({
        where: {
            id: categoryId
        }
    })
    return category;
}