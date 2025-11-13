"use client";

import { useTranslations } from "next-intl";

import { useGetWaQuickReplies } from "@/backend/whatsapp/inbox/quickReply/quickreply.query";
import { Spinner } from "@/components/ui/spinner";

import QuickReplyItem from "./QuickReplyItem";

export function isJSONString(string) {
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
  const t = useTranslations();

  const quickReplies = waQuickReplies?.data ? waQuickReplies?.data : [];

  const filteredReplies = searchQuery
    ? quickReplies.filter(
        (r) =>
          (r.key && r.key.toLowerCase().includes(searchQuery?.toLowerCase())) ||
          r.category.toLowerCase().includes(searchQuery?.toLowerCase()) ||
          r.topic.toLowerCase().includes(searchQuery?.toLowerCase()),
      )
    : quickReplies;

  if (waQuickReplies.isPending) return <Spinner />;
  return (
    <div className="flex flex-col gap-1">
      {filteredReplies.length > 0 ? (
        filteredReplies.map((reply) => (
          <QuickReplyItem
            reply={reply}
            onClick={handleSelectQuickReply}
            key={reply?.id}
            cursor={true}
          />
        ))
      ) : (
        <p>{t("No quick replies found")}</p>
      )}
    </div>
  );
};

export default WaQuickReply;
