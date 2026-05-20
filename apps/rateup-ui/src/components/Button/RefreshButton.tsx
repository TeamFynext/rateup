"use client";

import { useState } from "react";

import { IconRefresh } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

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
  const { t: translations } = useTranslation();
  const isRefreshing = loading || isLoading;

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setLoading(true);
    toast.loading(translations("Hold on..Data is refreshing"), {
      id: "refreshing-data",
    });
    if (onClick) {
      onClick();
    } else if (queryKeys?.length) {
      for (const queryKey of queryKeys) {
        await queryClient.invalidateQueries({ queryKey: [queryKey] });
      }
    }
    setLoading(false);
    toast.success(translations("Data Updated Successfully"), {
      id: "refreshing-data",
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Refresh"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <IconRefresh className={isRefreshing ? "animate-spin" : ""} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{translations("Refresh data")}</TooltipContent>
    </Tooltip>
  );
};

export default RefreshButton;
