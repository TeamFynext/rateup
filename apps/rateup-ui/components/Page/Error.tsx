import React from "react";

import useTranslations from "@/dictionaries/useTranslation";

const Error = () => {
  const { translations } = useTranslations();
  return <div>{translations["Error!"]}</div>;
};

export default Error;
