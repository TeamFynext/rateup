import type { RequestPayload } from "@/types/api.ts";

import { axiosClient } from "../apiClient";

const url = "/linktrees";

async function getLinktrees() {
  const res = await axiosClient.get(url);
  return res.data;
}

function getLinktreeWithShortId(shortUrlId: string) {
  return async () => {
    const res = await axiosClient.get(`${url}/${shortUrlId}`);
    return res.data;
  };
}

async function getPublicLinktreeWithShortId(shortUrlId: string) {
  const res = await axiosClient.get(`${url}/public/${shortUrlId}`);
  return res.data;
}

async function createLinktree(data: RequestPayload) {
  const res = await axiosClient.post(url, data);
  return res.data;
}

async function updateLinktree(data: any) {
  const res = await axiosClient.put(url, data);
  return res.data;
}

async function deleteLinktree(id: string) {
  const res = await axiosClient.delete(`${url}/${id}`);
  return res.data;
}

function getDropdownOptionsOfLinkType(linkType: string) {
  return async () => {
    const res = await axiosClient.get(`${url}/linkTypeDropdownOptions/${linkType}`);
    return res.data;
  };
}

async function updatePageVisitsOrLinkClicks(shortUrlId: string, bodyData: RequestPayload) {
  const res = await axiosClient.patch(`${url}/pageVisitsOrLinkClicks/${shortUrlId}`, bodyData);
  return res.data;
}

export {
  getLinktrees,
  getLinktreeWithShortId,
  getPublicLinktreeWithShortId,
  createLinktree,
  updateLinktree,
  deleteLinktree,
  getDropdownOptionsOfLinkType,
  updatePageVisitsOrLinkClicks,
};
