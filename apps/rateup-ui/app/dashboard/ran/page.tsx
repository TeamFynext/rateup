import React from "react";

import { Button } from "@mantine/core";
import { useTranslations } from "next-intl";

const Ran = () => {
  const t = useTranslations();
  return (
    <div>
      <Button>{t("Create")}</Button>
    </div>
  );
};

export default Ran;
