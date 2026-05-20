import type { Data } from "@/types/global";

import { axiosClient } from "../../apiClient";

const MENU_URL = "/menu";
export const getMenuLandingPageById = async (id: string) =>
  (await axiosClient.get(`${MENU_URL}/getLanding/${id}`)).data as Data;
