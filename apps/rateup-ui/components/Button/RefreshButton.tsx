// RefreshButton.jsx
import React from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconRefresh, IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";

const RefreshButton = ({ queryKey }) => {
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
    notifications.show({
      color: "teal",
      title: "Data Refreshed",
      message: `Data Updated Successfully`,
      autoClose: 1000,
      loading: false,
      icon: <IconCheck />,
    });
  };

  return (
    <Tooltip label="Refresh data">
      <ActionIcon variant="light" aria-label="Refresh" onClick={handleRefresh}>
        <IconRefresh style={{ width: "90%", height: "90%" }} stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  );
};

export default RefreshButton;
