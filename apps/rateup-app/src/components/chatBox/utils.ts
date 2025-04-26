import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export const namePreview = (name_: string) => {
    const nameArray = name_.split(" ");
    if (nameArray.length >= 2) {
        return (nameArray[0][0] + nameArray[1][0]).toUpperCase();
    }
    return nameArray[0].slice(0, 2).toUpperCase();
};


export const getRelativeTime = (waCreatedAt: string | undefined) => {
  if (!waCreatedAt) return "No time";
  return dayjs(waCreatedAt).fromNow();
};


export const getMessagePreview = (lastMessage: any) => {
    if (!lastMessage) return "No message";

    if (lastMessage.text) return lastMessage.text.body;
    if (lastMessage.image) return "📷 Photo";
    if (lastMessage.video) return "🎥 Video";

    return "Unsupported message";
  };