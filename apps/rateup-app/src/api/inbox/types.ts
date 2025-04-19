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
  };
  
  export enum WaMessageAssignStatus {
    NEW = "New",
    ASSIGNED = "Assigned",
    CLOSED = "Closed",
    UNASSIGNED = "UnAssigned"
  }
  