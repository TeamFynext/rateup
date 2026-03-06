import { axiosClient } from "../apiClient";

export interface IContactForm {
  name: string;
  email: string;
  message: string;
  address: string;
}

export const sendContactMessage = (data: IContactForm) =>
  axiosClient({
    url: `/public/contact`,
    method: "POST",
    data: data,
  });
