"use client";

import React from "react";

import { useTranslations } from "next-intl";

const Error = () => {
  const translations = useTranslations();
  return <div>{translations("Error!")}</div>;
};

export default Error;
