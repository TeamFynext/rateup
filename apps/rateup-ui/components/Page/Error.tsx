"use client";

import React from "react";

import { useExtracted } from "next-intl";

const Error = () => {
  const translations = useExtracted();
  return <div>{translations("Error!")}</div>;
};

export default Error;
