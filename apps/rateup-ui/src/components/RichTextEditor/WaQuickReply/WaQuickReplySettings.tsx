import React, { useEffect, useState } from "react";

import { Plus, RefreshCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";

import {
  useDeleteReply,
  useGetWaQuickReplies,
} from "@/backend/whatsapp/inbox/quickReply/quickreply.query";
import { Button } from "@/components/ui/button.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";

import CreateOrEditQuickReply from "./CreateOrEditQuickReply.tsx";
import QuickReplyItem from "./QuickReplyItem.tsx";

const WaQuickReplySettings = () => {
  const {
    data: quickReplies,
    isLoading,
    refetch,
    isRefetching,
  } = useGetWaQuickReplies();
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const deleteReply = useDeleteReply();

  const [selectedItem, setSelectedItem] = useState(null);

  function handleEditClick(reply) {
    setSelectedItem(reply);
    setOpened(true);
  }
  function handleDeleteQuickReply(reply) {
    deleteReply.mutate(reply.id, {
      onSuccess: () => {
        toast.success("Quick reply deleted successfully");
      },
      onError: (error) => {
        toast.error(error?.message || "Deletion failed");
      },
    });
  }

  useEffect(() => {
    if (!opened && selectedItem) {
      setSelectedItem(null);
    }
  }, [opened]);

  return (
    <div className="">
      <div className="flex justify-between gap-1 p-3 ">
        <h3>
          {t("Quick Replies")}
          <CustomTooltip
            trigger={
              <Button
                variant="secondary"
                onClick={() => refetch()}
                className="ml-1"
                size="icon-sm"
              >
                <RefreshCcw
                  className={isLoading || isRefetching ? "animate-spin" : ""}
                />
              </Button>
            }
            content={<span>{t("Refresh")}</span>}
          />
        </h3>
        <Button
          size="sm"
          className="rateup-blue"
          onClick={() => {
            setSelectedItem(null);
            setOpened(true);
          }}
        >
          <Plus />
          <span className="text-sm">{t("Add Quick Reply")}</span>
        </Button>
      </div>
      <div className="flex flex-col overflow-auto max-h-xl gap-2 ">
        {quickReplies?.map((reply) => {
          return (
            <QuickReplyItem
              reply={reply}
              key={reply?.id}
              onEditClick={() => handleEditClick(reply)}
              onDelete={() => handleDeleteQuickReply(reply)}
            />
          );
        })}
      </div>
      <CreateOrEditQuickReply
        open={opened}
        setOpen={setOpened}
        isEdit={!!selectedItem}
        reply={selectedItem}
      />
    </div>
  );
};

export const quickReplySchema = z.object({
  text: z.any(),
  key: z.string().min(1, { message: "key is required" }),
  category: z.string(),
  topic: z.string(),
});

export default WaQuickReplySettings;
