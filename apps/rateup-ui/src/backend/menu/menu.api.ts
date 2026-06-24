import { axiosClient } from "../apiClient";

const MENU_URL = "/menu";
const PUBLIC_MENU_URL = "/public/menu";

type CreateMenu = Omit<Menu, "id" | "createdAt">;
export const createMenu = async (menu: CreateMenu) => await axiosClient.post(MENU_URL, menu);
export const getAllMenus = async () => (await axiosClient.get(`${MENU_URL}/all`)).data as Menu[];
export const getMenusByTeamId = async (teamId: string) =>
  (await axiosClient.get(`${MENU_URL}/all/${teamId}`)).data as Menu[];
export const getMenuById = async (id: string) =>
  (await axiosClient.get(`${MENU_URL}/${id}`)).data as Menu;
export const getFullMenuById = async (menuId: string) =>
  (await axiosClient.get(`${PUBLIC_MENU_URL}/full/${menuId}`)).data as FullMenu;
export const updateMenu = async ({ menuId, updatedData }) =>
  await axiosClient.put(`${MENU_URL}/${menuId}`, updatedData);
export const deleteMenu = async (id: string) => await axiosClient.delete(`${MENU_URL}/${id}`);

// PUBLIC
export const getMenuPublicById = async (id: string) => {
  try {
    const res = await axiosClient.get(`${PUBLIC_MENU_URL}/${id}`);
    return res.data as Menu;
  } catch {
    return null;
  }
};

export const getFullMenuPublicById = async (menuId: string) => {
  try {
    const res = await axiosClient.get(`${PUBLIC_MENU_URL}/full/${menuId}`);
    return res.data as FullMenu;
  } catch {
    return null;
  }
};

export async function updateMenuVisitedMutation(menuId: string) {
  try {
    return await axiosClient.post(`${PUBLIC_MENU_URL}/${menuId}/visited`, {});
  } catch {
    return null;
  }
}
