import { Plus, RefreshCcw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";

import {
  useDeleteReply,
  useGetWaQuickReplies,
} from "@/backend/whatsapp/inbox/quickReply/quickreply.query";
import { Button } from "@/components/ui/button.tsx";

import CreateOrEditQuickReply from "./CreateOrEditQuickReply.tsx";
import QuickReplyItem from "./QuickReplyItem.tsx";

const WaQuickReplySettings = () => {
  const { data: quickReplies, isLoading, refetch, isRefetching } = useGetWaQuickReplies();
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
    <div className="space-y-4">
      {/* Sub-header row */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">{t("Quick Replies")}</h2>
          <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs font-semibold">
            {quickReplies?.length || 0}
          </span>
          <Button
            variant="ghost"
            onClick={() => refetch()}
            className="text-muted-foreground hover:text-foreground h-7 w-7 p-0"
            size="icon"
          >
            <RefreshCcw
              className={`w-3.5 h-3.5 ${isLoading || isRefetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-1.5 px-4 font-medium"
          onClick={() => {
            setSelectedItem(null);
            setOpened(true);
          }}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">{t("Add Quick Reply")}</span>
        </Button>
      </div>

      {/* Quick replies list container */}
      {quickReplies && quickReplies.length > 0 ? (
        <div className="bg-white dark:bg-card border border-border rounded-2xl shadow-sm divide-y divide-border overflow-hidden">
          {quickReplies.map((reply) => (
            <QuickReplyItem
              reply={reply}
              key={reply?.id}
              onEditClick={() => handleEditClick(reply)}
              onDelete={() => handleDeleteQuickReply(reply)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-2xl text-center bg-white dark:bg-card">
          <p className="text-muted-foreground text-sm">{t("No quick replies found")}</p>
        </div>
      )}

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
