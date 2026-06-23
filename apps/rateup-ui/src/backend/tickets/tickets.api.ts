import type { NotificationFormValues } from "@/components/Tickets/boardSettings.tsx";
import type {
  Board,
  Card,
  Column,
  MemberData,
} from "@/components/Tickets/types.ts";
import type { TicketType } from "@/utils/enums/ticket.ts";

import { axiosClient } from "../apiClient";
import type { ICreateTicketResponse, ITicket } from "./tickets";

const TICKET_URL = "/tickets";
export async function createTicket(data) {
  const res: ICreateTicketResponse = (
    await axiosClient.post(`${TICKET_URL}/create`, data)
  ).data;
  return res;
}

export async function getTickets() {
  try {
    const tickets: Array<ITicket> = (await axiosClient.get(TICKET_URL)).data;
    return tickets;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function getTicket(id: string) {
  try {
    const ticket: any = (await axiosClient.get(`${TICKET_URL}/${id}`)).data;
    return ticket;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function deleteTicket(id: string) {
  try {
    const ticket: any = (await axiosClient.delete(`${TICKET_URL}/${id}`)).data;
    return ticket;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

// update ticket status
export async function updateTicketStatus(ticketId, data) {
  try {
    const ticket: any = (
      await axiosClient.put(`${TICKET_URL}/${ticketId}/status`, data)
    ).data;
    return ticket;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

// update ticket - deadline, priority
export async function updateTicket(ticketId, data) {
  try {
    const ticket: any = (
      await axiosClient.put(`${TICKET_URL}/${ticketId}`, data)
    ).data;
    return ticket;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

// create comment
export async function createComment(data) {
  const id = data.ticketId;
  try {
    const comment: any = (
      await axiosClient.post(`${TICKET_URL}/${id}/comment`, data)
    ).data;
    return comment;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

// Export types for convenience
export type { Board, Column, Card };

// API functions
export const fetchBoards = async (): Promise<Board[]> => {
  const { data } = await axiosClient.get("/tickets/boards");
  return data;
};

export const fetchBoard = async (boardId: string): Promise<Board> => {
  const { data } = await axiosClient.get(`/tickets/boards/${boardId}`);
  return data;
};

export const createBoard = async (board: {
  title: string;
  description?: string;
  teamIds: Array<string>;
}): Promise<Board> => {
  const { data } = await axiosClient.post("/tickets/boards/create", board);
  return data;
};

export const updateBoard = async (
  board: Partial<NotificationFormValues>,
): Promise<Board> => {
  const { data } = await axiosClient.put(`/tickets/boards/${board.id}`, board);
  return data;
};

export const deleteBoard = async (boardId: string): Promise<void> => {
  await axiosClient.delete(`/tickets/boards/${boardId}`);
};

export const createColumn = async (column: {
  title: string;
  ticketBoardId: string;
}): Promise<Column> => {
  const { data } = await axiosClient.post("/tickets/columns/create", column);
  return data;
};

export const updateColumn = async (column: {
  id: string;
  title?: string;
}): Promise<Column> => {
  const { data } = await axiosClient.put(
    `/tickets/columns/${column.id}`,
    column,
  );
  return data;
};

export const deleteColumn = async (columnId: string): Promise<void> => {
  await axiosClient.delete(`/tickets/columns/${columnId}`);
};

export const moveColumnToBoard = async (params: {
  columnId: string;
  targetBoardId: string;
  title?: string;
}): Promise<Column> => {
  const { data } = await axiosClient.post("/tickets/columns/move", params);
  return data;
};

export const createCard = async (card: {
  title: string;
  description?: string;
  ticketColumnId: string;
  type: TicketType;
  contactId?: string;
  priority?: string;
}): Promise<Card> => {
  const { data } = await axiosClient.post("/tickets/cards/create", card);
  return data;
};

export const updateCard = async (card): Promise<Card> => {
  const { data } = await axiosClient.put(`/tickets/cards/${card.id}`, card);
  return data;
};

export const deleteCard = async (cardId: string): Promise<void> => {
  await axiosClient.delete(`/tickets/cards/${cardId}`);
};

export const moveCard = async (params: {
  cardId: string;
  sourceColumnId: string;
  targetColumnId: string;
}): Promise<Card> => {
  console.log("here");

  const { data } = await axiosClient.put(
    `/tickets/cards/${params.cardId}/move`,
    {
      ticketColumnId: params.targetColumnId,
    },
  );
  return data;
};

// Update reorderCard API function to accept an array of card orders
export const reorderCard = async (params: {
  columnId: string;
  cards: { id: string; order: number }[];
}): Promise<Column> => {
  const { data } = await axiosClient.put(`/tickets/cards/reorder`, {
    columnId: params.columnId,
    cards: params.cards,
  });
  return data;
};

// Add reorderColumns API function
export const reorderColumns = async (params: {
  boardId: string;
  columns: { id: string; order: number }[];
}): Promise<Board> => {
  const { data } = await axiosClient.put(`/tickets/columns/reorder`, {
    boardId: params.boardId,
    columns: params.columns,
  });
  return data;
};

// Add fetchCardById API function
export const fetchCardById = async (cardId: string): Promise<Card> => {
  const { data } = await axiosClient.get(`/tickets/cards/${cardId}`);
  return data;
};

export const deleteComment = async (commentId: string): Promise<void> => {
  await axiosClient.delete(`/tickets/${commentId}/comment`);
};

export const fetchCardTeamMemberById = async (
  cardId: string,
): Promise<Array<MemberData>> => {
  const { data } = await axiosClient.get(
    `/tickets/cards/${cardId}/team-members`,
  );
  return data;
};

export const fetchBoardTeamMemberById = async (
  cardId: string,
): Promise<Array<MemberData>> => {
  const { data } = await axiosClient.get(
    `/tickets/boards/${cardId}/team-members`,
  );
  return data;
};
