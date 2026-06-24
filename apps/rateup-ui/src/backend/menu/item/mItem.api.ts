import { axiosClient } from "../../apiClient";

const MENUITEM_URL = "/mitem";
type CreateMenuItem = Omit<MenuItem, "id" | "createdAt">;
export const createMenuItem = async (menuItem: CreateMenuItem) =>
  await axiosClient.post(MENUITEM_URL, menuItem);
export const getItemsByCategoryId = async (categoryId: string) =>
  (await axiosClient.get(`${MENUITEM_URL}/all/${categoryId}`)).data as MenuItem[];
export const deleteMenuItem = async (itemId: string) =>
  await axiosClient.delete(`${MENUITEM_URL}/${itemId}`);
export const updateMenuItem = async (menuId: string, menuItem) =>
  await axiosClient.put(`${MENUITEM_URL}/${menuId}`, menuItem);
export const updateSortOrderMenuItem = async (categoryId: string, menuItem) =>
  await axiosClient.put(`${MENUITEM_URL}/sort/${categoryId}`, menuItem);
export const createMenuItemUsingCsv = async (formData) =>
  await axiosClient.post(`${MENUITEM_URL}/create-using-csv`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
