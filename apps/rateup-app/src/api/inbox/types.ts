export type ContactsWithLastMessageResponse = {
    rows: ContactsWithLastMessage[];
    nextOffset: number | null;
  };
  
  export type ContactsWithLastMessage = {
    id: string;
    name: string;
    phone: string;
    unReadMessageCount:number;
    lastReceivedMessageTimeStamp:any;
    lastMessage: any;
    waMessageAssignStatus: WaMessageAssignStatus;
    assignedUsers:any
  };
  
  export enum WaMessageAssignStatus {
    NEW = "New",
    ASSIGNED = "Assigned",
    CLOSED = "Closed",
    UNASSIGNED = "UnAssigned"
  }
  
  export interface ICreateContact {
    name: string;
    phone?: string;
    email?: string;
    teamId?: string;
    source?: string;
    tags?: any;
    external_id?: string;
  }


export interface filteredContactCount {
  all: number,
  assigned: number,
  assignedToMe: number,
  closed: number,
  new: number,
  sent: number,
  unassigned: number,
}

export type HomeInterface = "inbox" | "whatsapp" | ""