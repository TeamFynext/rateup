import { UserRole } from "./../../utils/enums/index";
export interface ICreateTicketResponse {
  id: string;
  createdAt: string;
  type: string;
  title: string;
  priority: string;
  teamId: string;
  deadline: string;
  assignedToId: string;
  reviewId: string;
  surveyResponseId: string;
}

export interface ITicket {
  id: string;
  number: number;
  title: string;
  type: string;
  createdById: string;
  createdAt: string;
  status: string;
  priority: string;
  teamId: string;
  deadline: string;
  assignedToId: string;
  reviewId: string | null;
  surveyResponseId: string | null;
}

export interface IUpdateTicketStatusRequest {
  status: string;
  role: string;
}

export interface IUpdateTicketRequest {
  priority?: string;
  deadline?: string;
  assignedToId?: string;
  assignedToName?: string;
}
