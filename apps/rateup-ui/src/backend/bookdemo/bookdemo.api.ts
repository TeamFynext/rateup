import { axiosClient } from "../apiClient";

export interface BookDemo {
  firstName: string;
  lastName: string;
  workEmail: string;
  phoneNumber: string;
  companyName: string;
  teamSize: string;
  preferredTime: string;
  primaryUseCase: string;
  additionalInfo?: string;
}

export async function bookDemo(data: BookDemo) {
  const res = await axiosClient.post("/bookdemo", data);
  return res.data;
}
