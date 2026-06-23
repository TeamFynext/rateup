import React from "react";

import dayjs from "dayjs";

export const checkExpiry = (expiresAt: Date) => {
  const expirationDate = dayjs(expiresAt);
  const currentDate = dayjs();
  return currentDate.isAfter(expirationDate);
};

const ExpiryComponent = ({ expiryDate, children }) => {
  return <>{checkExpiry(expiryDate) && <>{children}</>}</>;
};
