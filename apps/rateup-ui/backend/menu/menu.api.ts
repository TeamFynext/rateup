import { axiosClient } from "../apiClient";
const MENU_URL = "/menu";

type CreateMenu = Omit<Menu, "id" | "createdAt">;
export const createMenu = async (menu: CreateMenu) => await axiosClient.post(MENU_URL, menu);
export const getMenusByTeamId = async (teamId: string) => (await axiosClient.get(`${MENU_URL}/all/${teamId}`)).data as Menu[];
export const getMenuById = async (id: string) => (await axiosClient.get(`${MENU_URL}/${id}`)).data as Menu;
export const getFullMenuById = async (menuId: string) => (await axiosClient.get(`${MENU_URL}/full/${menuId}`)).data as FullMenu;
export const updateMenu = async ({ menuId, updatedData }) => await axiosClient.put(`${MENU_URL}/${menuId}`, updatedData);
export const deleteMenu = async (id: string) => await axiosClient.delete(`${MENU_URL}/${id}`);
