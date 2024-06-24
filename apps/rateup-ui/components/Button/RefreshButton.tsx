import React from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconRefresh, IconCheck } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { showLoadingToast, showSuccessToast } from "../../utils/notifications";

const RefreshButton = ({ queryKeys }: { queryKeys: Array<string> }) => {
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    showLoadingToast(
      "Hold on..Data is refreshing",
      "refresh",
      true,
      "Refreshing",
    );
    for (const queryKey of queryKeys)
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
    showSuccessToast(
      "Data Updated Successfully",
      "refresh",
      <IconCheck />,
      true,
    );
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
