export interface ICreateTicketResponse {
  id: string;
  createdAt: string;
  type: string;
  title: string;
  description?: string;
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
  description?: string;
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
  assignedTo?: {
    recipeName?: string;
    name?: string;
    phone?: string;
  };
  surveyId?: string;
}

export interface IUpdateTicketStatusRequest {
  status: string;
  role: string;
  id?: string;
}

export interface IUpdateTicketRequest {
  priority?: string;
  deadline?: Date;
  assignedToId?: string;
  assignedToName?: string;
}
