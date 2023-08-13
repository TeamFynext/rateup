// TODO: find if there is an official type for this
export type WaMessageBody = {
  object: string;
  entry: [
    {
      id: string;
      changes: [
        {
          value: {
            messaging_product: string;
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
              }
            ];
            messages: [
              {
                from: string;
                id: string;
                timestamp: string;
                text: {
                  body: string;
                };
                interactive: {
                  type: "list_reply" | "button_reply";
                  list_reply: {
                    id: string;
                    title: string;
                  };
                  button_reply: {
                    id: string;
                    title: string;
                  };
                };
                image: {
                  id: string;
                  mime_type: string;
                  sha256: string;
                  link: string;
                };
                type: "text" | "image" | "interactive"|"button";
                button?: any;
              }
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
              }
            ];
          };
          field: string;
        }
      ];
    }
  ];
};

export interface WaSendMessageBody {
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
    | "template";
  text?: {
    preview_url?: boolean;
    body: string;
  };
  template?: any;
  image?: {};
  interactive?: {
    type: "button" | "list";
    action: WaInteractiveMessageAction;
    body: {
      text: string; // max 1024 chars
    };
    footer?: {
      text: string; // max 60 chars
    };
    header?: {
      type: "text" | "image" | "video" | "document";
      text?: string; // max 60 chars
      // add image, video, document if needed in future
    };
  };
}
type WaButton = {
  type: "reply";
  reply: {
    title: string; // max 20 chars
    id: string;
  };
};
type WaSection = {
  title?: string; // max 24 chars
  rows: Array<{
    title: string; // max 24 chars
    description?: string; // max 72 chars
    id: string;
  }>;
};
type WaInteractiveMessageAction = {
  button?: string; // max 20 chars
  sections?: Array<WaSection>;
  buttons?: Array<WaButton>;
};
