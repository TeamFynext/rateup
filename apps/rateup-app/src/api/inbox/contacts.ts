import axios from "@/src/config/axios";
import { ICreateContact } from "./types";

export const createContact = async (data: ICreateContact) => {
  const response = await axios.post('/api/contact', data);
  return response.data;
};

export const assignedContact = async (contactId:string) => {
    const response = await axios.get(`/api/wa/inbox/message/assign/${contactId}`)
    return response.data
}

export const markMessageAsRead = async (contactId:string) => {
    await axios.post(`/api/wa/inbox/message/mark/${contactId}`)
}