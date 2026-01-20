import { axiosClient } from "../../apiClient";
import { LOYALTY_BASE, PUBLIC_LOYALTY_BASE } from "../base";

const base = `${LOYALTY_BASE}/accounts`;
const publicbase = `${PUBLIC_LOYALTY_BASE}/accounts`;

type CreateLoyaltyCustomerInput = Partial<Omit<LoyaltyCustomer, "id">>;
export async function createLoyaltyCustomer(
  lc: CreateLoyaltyCustomerInput & { isPublic?: boolean },
) {
  const url = lc.isPublic ? publicbase : base;
  return await axiosClient.post(`${url}`, lc);
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

export const exportCustomers = async (format: "csv" | "excel" = "excel") => {
  return (
    await axiosClient.get(`${base}/export?format=${format}`, {
      responseType: "blob",
    })
  ).data;
};

export async function getLoyaltyCustomerById(customerId) {
  return (await axiosClient.get(`${base}/${customerId}`)).data;
}

export async function getLoyaltyCustomerByContactId(contactId: string) {
  return (await axiosClient.get(`${base}/contact/${contactId}`)).data;
}

export async function updateLoyaltyCustomer(
  customerId: string,
  data: { status?: "active" | "suspended" | "closed" },
) {
  return (await axiosClient.put(`${base}/${customerId}`, data)).data;
}

export async function awardPoints(data: {
  contactId: string;
  purchaseAmount: number;
  locationId?: string;
  productCategories?: string[];
  productSkus?: string[];
  paymentMethod?: string;
  channel?: string;
  orderId?: string;
  notes?: string;
}) {
  return (await axiosClient.post(`${base}/award-points`, data)).data;
}
