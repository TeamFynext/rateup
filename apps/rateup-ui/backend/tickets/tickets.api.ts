import { axiosClient } from "../apiClient";
import { ICreateTicketResponse, ITicket } from "./tickets";

const TICKET_URL = "/tickets";
//TODO-TICKET update types
export async function createTicket(data) {
  let res: ICreateTicketResponse = (
    await axiosClient.post(`${TICKET_URL}/create`, data)
  ).data;
  return res;
}

export async function getTickets() {
  try {
    let tickets: Array<ITicket> = (await axiosClient.get(TICKET_URL)).data;
    return tickets;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function getTicket(id: string) {
  try {
    let ticket: any = (await axiosClient.get(`${TICKET_URL}/${id}`)).data;
    return ticket;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

//update ticket status
export async function updateTicketStatus(ticketId, data) {
  try {
    let ticket: any = (
      await axiosClient.put(`${TICKET_URL}/${ticketId}/status`, data)
    ).data;
    return ticket;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

//update ticket - deadline, priority
export async function updateTicket(ticketId, data) {
  try {
    let ticket: any = (await axiosClient.put(`${TICKET_URL}/${ticketId}`, data))
      .data;
    return ticket;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

//create comment
export async function createComment(data) {
  let id = data.ticketId;
  try {
    let comment: any = (
      await axiosClient.post(`${TICKET_URL}/${id}/comment`, data)
    ).data;
    return comment;
  } catch (e) {
    console.error(e);
    throw e;
  }
}
