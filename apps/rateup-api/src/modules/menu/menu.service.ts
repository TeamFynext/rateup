import prisma from "../../utils/prisma";
import { CreateMenuInput, UpdateMenuInput } from "./menu.schema";

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
                    id: teamId
                }
            }
        }
    })
    return menu;
}

export async function getMenu(menuId: string) {
    const menu = await prisma.menu.findUnique({
        where: {
            id: menuId
        }
    })
    return menu;
}

export async function getFullMenu(menuId: string) {
    const menu = await prisma.menu.findUnique({
        where: {
            id: menuId
        },
        include: {
            categories: {
                include: {
                    items: true
                }
            }
        }
    })
    return menu;
}

export async function getMenus(teamId: string) {
    const menus = await prisma.menu.findMany({
        where: {
            teamId
        }
    })
    return menus;
}

export async function updateMenu(id: string, data: UpdateMenuInput) {
    const menu = await prisma.menu.update({
        where: {
            id
        },
        data
    })
    return menu;
}

export async function deleteMenu(id: string) {
    const menu = await prisma.menu.delete({
        where: {
            id
        }
    })
    return menu;
}