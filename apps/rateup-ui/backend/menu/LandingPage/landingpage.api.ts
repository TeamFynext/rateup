import { Data } from "../../../types/global";
import { axiosClient } from "../../apiClient";

const MENU_URL = "/menu";
export const getMenuLandingPageById = async (id: string) =>
  (await axiosClient.get(`${MENU_URL}/getLanding/${id}`)).data as Data;

export const updateMenuLandingPageById = async (id: string, data: any) =>
  await axiosClient.put(`${MENU_URL}/updateLanding/${id}`, data);

export async function updateMenuLandingPageOptionById(
  menuId: string,
  data: any,
) {
  return await axiosClient.put(
    `${MENU_URL}/updateLandingPageOption/${menuId}`,
    data,
  );
}
