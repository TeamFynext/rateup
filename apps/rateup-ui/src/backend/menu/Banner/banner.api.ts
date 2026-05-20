import { axiosClient } from "../../apiClient";

const MENUBANNER_URL = "/mbanner";
const MENUBANNER_PUBLIC_URL = "/public/mbanner";

type CreateMenuBanner = Omit<MenuBanner, "id" | "createdAt">;
export const createMenuBanner = async (menuBanner: CreateMenuBanner) =>
  await axiosClient.post(MENUBANNER_URL, menuBanner);

export const updateMenuBanner = async ({
  id,
  data,
}: {
  id: string;
  data: CreateMenuBanner;
}) => await axiosClient.put(`${MENUBANNER_URL}/${id}`, data);

export const getMenuBannerByMenuId = async (menuId: string) => {
  try {
    const response = await axiosClient.get(
      `${MENUBANNER_PUBLIC_URL}/${menuId}`,
    );
    return response.data as MenuBanner[];
  } catch (error) {
    return null;
  }
};

export const deleteMenuBanner = async (id: string) =>
  await axiosClient.delete(`${MENUBANNER_URL}/${id}`);
