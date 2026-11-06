import dayjs from "dayjs";

export const checkExpiry = (expiresAt?: Date) => {
  const expirationDate = dayjs(expiresAt);
  const currentDate = dayjs();
  return currentDate.isAfter(expirationDate);
};
