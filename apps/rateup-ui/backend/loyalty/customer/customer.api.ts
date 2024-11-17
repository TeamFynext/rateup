import { axiosClient } from "../../apiClient";
import { LOYALTY_BASE } from "../base";

const base = `${LOYALTY_BASE}/customer`;

type CreateLoyaltyCustomerInput = Partial<Omit<LoyaltyCustomer, "id">>;
export async function createLoyaltyCustomer(lc: CreateLoyaltyCustomerInput) {
  return await axiosClient.post(`${base}`, lc);
}

export async function getAllCustomers() {
  return (await axiosClient.get(`${base}`)).data;
}
