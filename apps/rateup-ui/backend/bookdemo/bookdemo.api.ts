import { axiosClient } from "../apiClient";

interface BookDemo {
  name: string;
  email: string;
  phone: string;
  reason: string;
}

export async function bookDemo({ name, email, phone, reason }: BookDemo) {
  const res = await axiosClient.post("/bookdemo", {
    name,
    email,
    phone,
    reason,
  });
  return res;
}
