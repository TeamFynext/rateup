"use client";

import React, { useState } from "react";

import { ActionIcon, Tooltip } from "@mantine/core";
import { IconCheck, IconRefresh } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { showLoadingToast, showSuccessToast } from "../../utils/notifications";

const RefreshButton = ({
  queryKeys,
  onClick,
  isLoading,
}: {
  queryKeys?: Array<string>;
  onClick?: () => void;
  isLoading?: boolean;
}) => {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const translations = useTranslations();

  const handleRefresh = async () => {
    setLoading(true);
    showLoadingToast(
      translations("Hold onData is refreshing"),
      "refresh",
      true,
      translations("Refreshing"),
    );
    if (onClick) onClick();
    else {
      for (const queryKey of queryKeys)
        await queryClient.invalidateQueries({ queryKey: [queryKey] });
    }
    setLoading(false);
    showSuccessToast(
      translations("Data Updated Successfully"),
      "refresh",
      <IconCheck />,
      true,
    );
  };

  return (
    <Tooltip label={translations("Refresh data")} position="top" withArrow>
      <ActionIcon
        variant="light"
        aria-label="Refresh"
        onClick={handleRefresh}
        loading={loading || isLoading}
      >
        <IconRefresh style={{ width: "90%", height: "90%" }} stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  );
};

export default RefreshButton;
