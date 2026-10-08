import axios from "@/config/axios";

/** An attachment on a quick reply. Same shape as a composer attachment. */
export type QuickReplyMedia = {
  type: "image" | "audio" | "video";
  url: string;
  key: string;
  name: string;
};

/**
 * A saved quick reply, managed on the web in Inbox Settings. `text` is either
 * WhatsApp-formatted text or the web editor's document as a JSON string; see
 * `quickReplyToWhatsAppText`.
 */
export type QuickReply = {
  id: string;
  key: string | null;
  topic: string;
  text: string;
  media?: QuickReplyMedia[];
};

export async function getQuickReplies(): Promise<QuickReply[]> {
  return (await axios.get(`/api/wa/inbox/quick-reply`)).data;
}
