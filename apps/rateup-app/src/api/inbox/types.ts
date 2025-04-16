export type ContactsWithLastMessageResponse = {
    rows: ContactsWithLastMessage[];
    nextOffset: number | null;
  };
  
  export type ContactsWithLastMessage = {
    id: string;
    name: string;
    phone: string;
    lastMessage: {
      waCreatedAt: string;
      messageBody: {
        type: string;
        text?: string;
      };
    };
    waMessageAssignStatus: WaMessageAssignStatus;
  };
  
  export enum WaMessageAssignStatus {
    NEW = "New",
    ASSIGNED = "Assigned",
    CLOSED = "Closed",
    UNASSIGNED = "UnAssigned"
  }
  