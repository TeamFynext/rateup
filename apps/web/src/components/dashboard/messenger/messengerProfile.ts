import type {
  MessengerIceBreaker,
  MessengerMenuItem,
} from "@/backend/whatsapp/messenger-profile/messengerProfile.api";

/** Meta's limits, which the API checks too; here they keep Save off until a draft fits. */
export const MESSENGER_LIMITS = {
  payload: 1000,
  greeting: 160,
  question: 80,
  iceBreakers: 4,
  menuTitle: 30,
  menuItems: 20,
} as const;

/** One menu row while it is edited: switching its type keeps what was typed in the other. */
export interface DraftMenuItem {
  id: string;
  type: MessengerMenuItem["type"];
  title: string;
  payload: string;
  url: string;
}

export function draftMenuItem(item?: MessengerMenuItem): DraftMenuItem {
  return {
    id: crypto.randomUUID(),
    type: item?.type ?? "postback",
    title: item?.title ?? "",
    payload: item?.type === "postback" ? item.payload : "",
    url: item?.type === "web_url" ? item.url : "",
  };
}

const fits = (value: string, max: number) => value.length > 0 && value.length <= max;

export function isValidIceBreakers(items: MessengerIceBreaker[]): boolean {
  return (
    items.length > 0 &&
    items.length <= MESSENGER_LIMITS.iceBreakers &&
    items.every(
      (item) =>
        fits(item.question, MESSENGER_LIMITS.question) &&
        fits(item.payload, MESSENGER_LIMITS.payload),
    )
  );
}

export function isValidMenu(items: MessengerMenuItem[]): boolean {
  return (
    items.length > 0 &&
    items.length <= MESSENGER_LIMITS.menuItems &&
    items.every(
      (item) =>
        fits(item.title, MESSENGER_LIMITS.menuTitle) &&
        (item.type === "postback"
          ? fits(item.payload, MESSENGER_LIMITS.payload)
          : /^https?:\/\/\S+\.\S+/i.test(item.url)),
    )
  );
}
