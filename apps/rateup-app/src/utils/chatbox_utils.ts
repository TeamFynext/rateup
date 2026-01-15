import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";

dayjs.extend(relativeTime);
dayjs.extend(utc);

export const namePreview = (name_: any) => {
  if (name_) {
    const name1 = name_.trim();
    const nameArray = name1.split(" ");
    if (nameArray.length >= 2) {
      return (nameArray[0][0] + nameArray[1][0]).toUpperCase();
    }
    return nameArray[0].slice(0, 2).toUpperCase();
  } else {
    return 0;
  }
};

export function isInboxSessionExpired(timeStamp: string) {
  if (!timeStamp) return true;
  const currentTime = dayjs().utc();
  const givenTime = dayjs(timeStamp).utc();
  const diffInHours = currentTime.diff(givenTime, "hours");
  return diffInHours >= 24;
}
