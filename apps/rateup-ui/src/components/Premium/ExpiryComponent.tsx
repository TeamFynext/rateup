import dayjs from "dayjs";
import React from "react";

export const checkExpiry = (expiresAt: Date) => {
  const expirationDate = dayjs(expiresAt);
  const currentDate = dayjs();
  return currentDate.isAfter(expirationDate);
};

const ExpiryComponent = ({ expiryDate, children }) => {
  return <>{checkExpiry(expiryDate) && <>{children}</>}</>;
};
