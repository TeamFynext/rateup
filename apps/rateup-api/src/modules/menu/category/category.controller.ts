import { FastifyRequest, FastifyReply } from "fastify";
import { ByCategoryIdParams, CreateMenuCategoryInput, UpdateMenuCategoryInput } from "./category.schema";
import { createMenuCategory, deleteMenuCategory, getMenuCategories, updateMenuCategory } from "./category.service";
import { ByMenuIdParams } from "../menu.schema";
import Session from "supertokens-node/recipe/session";
import { hasAccessToMenu } from "../menu.auth";
import { authorizeBySessionOrJWT } from "../../../utils/auth";
import { log } from "../../../utils/logger";

export async function createMenuCategoryHandler(
    request: FastifyRequest<{ Body: CreateMenuCategoryInput }>,
    reply: FastifyReply
) {
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();

    if(!hasAccessToMenu(request.body.menuId, userId)) {
        reply.code(403).send({ message: "You don't have access to this menu" });
    }

    const data = request.body;
    const category = await createMenuCategory(data);
    reply.send(category);
}

export async function getAllMenuCategoriesHandler(
    request: FastifyRequest<{Params: ByMenuIdParams}>,
    reply: FastifyReply
) {
    try {
        const userId = await authorizeBySessionOrJWT(request, reply);
        if (!userId) {
            log.error("User Id not found")
            reply.code(401).send({ message: "Unauthorized" });
            return
        }
        const hasAccess = hasAccessToMenu(request.params.menuId, userId);
        if (!hasAccess) {
            reply.code(403).send({ message: "You don't have access to this menu" });
            return
        }
        const categories = await getMenuCategories(request.params.menuId)
        reply.send(categories);
    } catch (err) {
        console.log(err)
        reply.code(500)
    }
}

export async function getMenuCategoryHandler(
    request: FastifyRequest<{Params: ByCategoryIdParams}>,
    reply: FastifyReply
) {
    const category = await getMenuCategories(request.params.categoryId)
    reply.send(category);
}

export async function updateMenuCategoryHandler(
    request: FastifyRequest<{ Body: UpdateMenuCategoryInput, Params: ByCategoryIdParams }>,
    reply: FastifyReply
) {
    const data = request.body;
    const category = await updateMenuCategory(request.params.categoryId, data);
    reply.send(category);
}

export async function deleteMenuCategoryHandler(
    request: FastifyRequest<{Params: ByCategoryIdParams}>,
    reply: FastifyReply
) {
    const category = await deleteMenuCategory(request.params.categoryId);
    reply.send(category);
}