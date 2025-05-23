export type orgWsMessage = {
  type: "inbox";
  inbox?: {
    contact: ContactsData;
    message: WaGetMessagesBody;
  };
};

export type WaGetMessagesBody = {
  id: string;
  waContctId: string;
  createdAt: string;
  waCreatedAt: string;
  messageBody: any;
  templateComponentParams: any;
  stats?: { read: string; delivered: string; sent: string; error: string };
  sender?: {
    name?: string;
    profile_photo?: string;
  };
  messageId?: string;
  readUsers?: string[];
};

 type ContactsData = {
    id: string;
    name: string;
    phone: string;
    email: string;
    dob?: Date;
    source: string;
    createdAt: Date;
    tags?: any;
    consent: boolean;
    waMessageAssignStatus:any;
    whatsappUserName?: string;
    blockedOnWhatsApp: boolean;
    loyaltyCustomer?: {
      id: string;
      email?: string;
      createdAt: Date;
      referralCodes: Array<{
        referralCode: string;
      }>;
      redeems: Array<{
        status: string;
      }>;
      totalEarnedPoints: number;
      redeemedPoints: number;
    };
    org: {
      whatsappSettings: {
        contactTags: string[];
      };
    };
    contactGroups?: [
      {
        contactGroup?: {
          name?: string;
        };
      },
    ];
    campaignParticipants: any[];
    aiWaChat: boolean;
  };