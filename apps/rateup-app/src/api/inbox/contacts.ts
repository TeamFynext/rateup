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

export const getContactById = async (contactId:string) => {
  const res = await axios.get(`/api/contact/${contactId}`)
  return res.data
}

export const editContactById = async (contactId:string,data:any) => {
  const res = await axios.put(`/api/contact/${contactId}`,data)
  return res.data
}

export const closeChat = async (contactId:string,data:any) => {
  const res = await axios.put(`/api/contact/${contactId}`,data)
  return res.data
}

export async function assignInboxToUser(data: {
  contactId: string;
  assignedUserIds: string[];
  teamId: string;
}) {
  await axios.post("/api/wa/inbox/message/assign", data);
}