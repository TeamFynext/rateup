import { axiosClient } from "../../apiClient";
import { LOYALTY_BASE, PUBLIC_LOYALTY_BASE } from "../base";

const base = `${LOYALTY_BASE}/customer`;
const publicbase = `${PUBLIC_LOYALTY_BASE}/customer`;

type CreateLoyaltyCustomerInput = Partial<Omit<LoyaltyCustomer, "id">>;
export async function createLoyaltyCustomer(lc: CreateLoyaltyCustomerInput) {
  return await axiosClient.post(`${publicbase}`, lc);
}

export async function getAllCustomers() {
  return (await axiosClient.get(`${base}`)).data;
}

export async function deleteLoyaltyCustomer(id) {
  return (await axiosClient.delete(`${base}/${id}`)).data;
}

export async function createLCAction({ customerId, actionId, amount }) {
  await axiosClient.post(`${base}/${customerId}/${actionId}`, { amount });
}
