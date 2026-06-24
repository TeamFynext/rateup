import { axiosClient } from "../../apiClient";

const MENUCATEGORY_URL = "/mcategory";

type CreateMenuCategory = Omit<MenuCategory, "id" | "createdAt">;
export const createMenuCategory = async (menuCategory: CreateMenuCategory) =>
  await axiosClient.post(MENUCATEGORY_URL, menuCategory);
export const getMenuCategoriesByMenuId = async (menuId: string) =>
  (await axiosClient.get(`${MENUCATEGORY_URL}/all/${menuId}`)).data;
const _getMenuCategoryById = async (id: string) =>
  (await axiosClient.get(`${MENUCATEGORY_URL}/${id}`)).data;
export const updateMenuCategory = async ({ categoryId, menuCategory }) =>
  await axiosClient.put(`${MENUCATEGORY_URL}/${categoryId}`, menuCategory);
export const deleteMenuCategory = async (categoryId: string) =>
  await axiosClient.delete(`${MENUCATEGORY_URL}/${categoryId}`);
export const updateSortOrderMenuCategory = async (menuId: string, menuCategory) =>
  await axiosClient.put(`${MENUCATEGORY_URL}/sort/${menuId}`, menuCategory);
