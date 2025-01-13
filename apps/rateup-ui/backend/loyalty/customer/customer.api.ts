import { axiosClient } from "../../apiClient";
import { LOYALTY_BASE, PUBLIC_LOYALTY_BASE } from "../base";

const base = `${LOYALTY_BASE}/customer`;
const publicbase = `${PUBLIC_LOYALTY_BASE}/customer`;

type CreateLoyaltyCustomerInput = Partial<Omit<LoyaltyCustomer, "id">>;
export async function createLoyaltyCustomer(lc: CreateLoyaltyCustomerInput) {
  return await axiosClient.post(`${publicbase}`, lc);
}

export async function getAllCustomers(
  pagination: {
    pageIndex: number;
    pageSize: number;
  },
  search: string,
  sort: {
    id: string;
    desc: boolean;
  },
  columnFilters: { id: string; value: string }[],
) {
  let filter = columnFilters
    .map((data) => `&${data.id}=${data.value}`)
    .join("&");
  let desc = sort.desc ? "desc" : "asc";
  let customerUrl = `${base}?page=${pagination.pageIndex}&limit=${pagination.pageSize}&search=${search}&sort=${sort.id}&desc=${desc}${filter}`;

  const response = await axiosClient.get(customerUrl);
  return response.data;
}

export async function deleteLoyaltyCustomer(id) {
  return (await axiosClient.delete(`${base}/${id}`)).data;
}

export async function createLCAction({ phone, actionId, amount }) {
  await axiosClient.post(`${base}/${phone}/${actionId}`, { amount });
}

export const importCustomers = async (data) => {
  let res = await axiosClient.post(`${base}/importcsv`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 60000,
  });
  return res;
};
