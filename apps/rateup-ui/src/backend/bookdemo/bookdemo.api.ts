import { axiosClient } from "../apiClient";

export interface BookDemo {
  name: string;
  workEmail: string;
  businessName: string;
  phone: string;
  message?: string;
}

export async function bookDemo(data: BookDemo) {
  const res = await axiosClient.post("/bookdemo", data);
  return res.data;
}
