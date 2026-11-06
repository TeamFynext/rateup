import type { RequestPayload } from "@/types/api.ts";

import { axiosClient } from "../apiClient";

const url = "/generateQr";

/** A dynamic QR code: a short link that redirects to `link` and counts scans. */
export interface GeneratedQr {
  id: string;
  name: string;
  shortUrlId: string;
  link: string;
  noOfScans: number;
  createdAt: string;
  shareSettings?: { qrColor?: string; qrBgColor?: string } | null;
}

async function getAllGeneratedQrs() {
  const res = await axiosClient.get<GeneratedQr[]>(url);
  return res.data;
}

function getQrWithShortUrlId(shortUrlId: string) {
  return async () => {
    const res = await axiosClient.get<GeneratedQr>(`${url}/${shortUrlId}`);
    return res.data;
  };
}

function getQrWithShortUrlIdPublic(shortUrlId: string) {
  return async () => {
    const res = await axiosClient.get(`${url}/public/${shortUrlId}`);
    return res.data;
  };
}

async function createQr(data: RequestPayload) {
  const res = await axiosClient.post<GeneratedQr>(url, data);
  return res.data;
}

async function updateQr(data: RequestPayload) {
  const res = await axiosClient.put(url, data);
  return res.data;
}

async function deleteQr(shortUrlId: string) {
  const res = await axiosClient.delete(`${url}/${shortUrlId}`);
  return res.data;
}

async function incrementNoOfScans(shortUrlId: string) {
  const res = await axiosClient.post(`${url}/noOfScans/${shortUrlId}`);
  return res.data;
}

export {
  getAllGeneratedQrs,
  createQr,
  updateQr,
  deleteQr,
  getQrWithShortUrlId,
  getQrWithShortUrlIdPublic,
  incrementNoOfScans,
};
