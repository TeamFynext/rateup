import { axiosClient } from "../apiClient";

const url = "/generateQr";

async function getAllGeneratedQrs() {
  const res = await axiosClient.get(url);
  return res.data;
}

async function createQr(data) {
  const res = await axiosClient.post(url, data);
  return res.data;
}

export { getAllGeneratedQrs, createQr };
