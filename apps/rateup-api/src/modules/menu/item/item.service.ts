import prisma from "../../../utils/prisma";
import { UpdateMenuInput } from "../menu.schema";
import { CreateMenuItemInput } from "./item.schema";

export async function createMenuItem(data: CreateMenuItemInput) {
    const menuItem = await prisma.menuItem.create({
        data
    });
    return menuItem;
}

export async function getMenuItem(menuId: string) {
    const menuItem = await prisma.menuItem.findUnique({
        where: {
            id: menuId
        }
    });
    return menuItem;
}

export async function getMenuItemByCategory(categoryId: string) {
    const menuItem = await prisma.menuItem.findMany({
        where: {
            categoryId
        }
    });
    return menuItem;
}

export async function updateMenuItem(id: string, data: UpdateMenuInput) {
    const menuItem = await prisma.menuItem.update({
        where: {
            id
        },
        data
    });
    return menuItem;
}

export async function deleteMenuItem(id: string) {
    const menuItem = await prisma.menuItem.delete({
        where: {
            id
        }
    });
    return menuItem;
}