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

  export type MultiGV = {
    group: string;
    value: string;
  };
  export type ChatFilter = {
    messageType: "all" | "replied" | "unread" | "usermessages";
    strictFilter: boolean;
    searchTerm?: string;
    contactGroups: Array<MultiGV>;
    campaigns: Array<MultiGV>;
    tags: Array<MultiGV>;
    waMessageAssignStatus?: string;
    blockedUsers: boolean;
    newStatuses: string[];
  };
  
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


export enum WaMessageTypes {
  text = "text",
  image = "image",
  interactive = "interactive",
  button = "button",
}

export type WaInboxMessage = {
  exchangeProcess: "send" | "receive";
  send?: WaSendMessageBody;
  receive?: WaReceiveMessageBody;
};

export type WaReceiveMessageBody = {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts: [
    {
      profile: {
        name: string;
      };
      wa_id: string;
    },
  ];
  messages: [
    {
      from: string;
      id: string;
      timestamp: string;
      type: WaMessageTypes;
      text: {
        body: string;
      };
    
      image: {
        id: string;
        mime_type: string;
        sha256: string;
        link?: string;
        caption?: string;
      };
      audio: {
        id: string;
        mime_type: string;
        sha256: string;
        voice?: boolean;
        caption?: string;
      };
      video: {
        id: string;
        mime_type: string;
        sha256: string;
        caption?: string;
      };
      document: {
        id: string;
        caption?: string;
        filename: string;
      };
      button?: {
        text: string;
        payload: string;
      };
      reaction?: {
        emoji: string;
        message_id: string;
      };
    },
  ];
  statuses: [
    {
      id: string;
      status: string;
      timestamp: string;
      recipient_id: string;
      conversation: {
        id: string;
      };
    },
  ];
};
export type WaSendMessageBody = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string; // PHONE_NUMBER type
  type:
    | "text"
    | "image"
    | "interactive"
    | "audio"
    | "document"
    | "contacts"
    | "sticker"
    | "location"
    | "template"
    | "reaction";
  text?: {
    preview_url?: boolean;
    body: string;
  };
  image?: {
    link: string;
    caption?: string;
  };
  reaction?: {
    emoji: string;
    message_id: string;
  };
  document?: {
    link: string;
    caption?: string;
    filename?: string;
  };
  audio?: {
    link: string;
  };
  video?: {
    link: string;
    caption?: string;
  };
};