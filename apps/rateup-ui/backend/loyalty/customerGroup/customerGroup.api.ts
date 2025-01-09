import { axiosClient } from "@/backend/apiClient";

import { LOYALTY_BASE } from "../base";

const BASE = `${LOYALTY_BASE}/customer`;
export const addNewCustomersFromCSV = ({ data, groupId }) => {
  let res = axiosClient.post(
    `${BASE}/group/${groupId}/contacts/new/importcsv`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000,
    },
  );
  return res;
};

export const getCustomerGroupById = async (
  groupId: string,
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
) => {
  let filter = columnFilters
    .map((data) => `&${data.id}=${data.value}`)
    .join("&");
  let desc = sort.desc ? "desc" : "asc";
  let groupDataById = await axiosClient.get(
    `/contact/group?contactGroupId=${groupId}`,
  );
  let paginationParams = `page=${pagination.pageIndex}&limit=${pagination.pageSize}&search=${search}&sort=${sort.id}&desc=${desc}${filter}`;
  let contacts = await getContactsByGroupId(groupId, paginationParams);
  groupDataById.data.contacts = contacts?.group;
  groupDataById.data.totalCount = contacts?.totalCount;
  groupDataById.data.loyaltyCustomers = contacts?.loyaltyCustomers;
  return groupDataById?.data as ContactGroupwithContacts;
};

export const getContactsByGroupId = async (
  groupId: string,
  paginationParams: string,
) => {
  let contacts = await axiosClient.get(
    `${BASE}/group/${groupId}/contacts?${paginationParams}`,
  );
  return contacts?.data;
};
