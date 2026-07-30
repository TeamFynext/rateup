import { Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { QuickReply } from "@/backend/whatsapp/inbox/quickReply/quickreply.api";
import { useGetWaQuickReplies } from "@/backend/whatsapp/inbox/quickReply/quickreply.query";
import { Spinner } from "@/components/ui/spinner.tsx";

export function isJSONString(string: string) {
  return /^\s*\{.*\}\s*$/.test(string);
}

export const WaQuickReply = ({
  handleSelectQuickReply,
  searchQuery,
}: {
  handleSelectQuickReply: (value: string) => void;
  searchQuery?: string;
}) => {
  const waQuickReplies = useGetWaQuickReplies();
  const { t } = useTranslation();

  const quickReplies = waQuickReplies?.data ? waQuickReplies?.data : [];

  const filteredReplies = searchQuery
    ? quickReplies.filter(
        (r: QuickReply) =>
          (r.key && r.key.toLowerCase().includes(searchQuery?.toLowerCase())) ||
          r.category.toLowerCase().includes(searchQuery?.toLowerCase()) ||
          r.topic.toLowerCase().includes(searchQuery?.toLowerCase()),
      )
    : quickReplies;

  if (waQuickReplies.isPending) return <Spinner />;
  return (
    <div className="flex flex-col gap-1 max-h-32 overflow-auto">
      {filteredReplies.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {filteredReplies.map((reply: QuickReply) => {
            return (
              <div
                key={reply.id}
                className="flex items-center gap-1 border p-2 rounded-sm bg-gray-100 dark:bg-transparent cursor-pointer"
                onClick={() => handleSelectQuickReply(reply?.text)}
              >
                <Zap className="text-primary w-3 h-3" />
                <span className="text-xs">
                  {reply?.key && reply.key.length > 50
                    ? `${reply.key.slice(0, 60)}...`
                    : reply?.key}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p>{t("No quick replies found")}</p>
      )}
    </div>
  );
};
