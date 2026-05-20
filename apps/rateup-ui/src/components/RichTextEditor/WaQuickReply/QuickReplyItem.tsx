import React from "react";

import { Edit, Trash } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";

import { isJSONString } from ".";
import { parseFromWhatsAppFormat, parseJsonToReact } from "../waTextEditor.tsx";

const QuickReplyItem = ({
  reply,
  onEditClick,
  onDelete,
  onClick,
  cursor,
}: {
  reply: any;
  onEditClick?: () => void;
  onDelete?: () => void;
  onClick?: (value: string) => void;
  cursor?: boolean;
}) => {
  const { t } = useTranslation();

  const json = !isJSONString(reply.text)
    ? parseFromWhatsAppFormat(reply.text)
    : JSON.parse(reply.text);

  return (
    <div
      className={`group p-4 rounded-lg border-2 shadow-sm bg-gray-100 hover:bg-gray-200 ${cursor ? "cursor-pointer" : ""}`}
      onClick={(e) => {
        e.preventDefault();
        if (onClick) onClick(reply.text);
      }}
    >
      <div className="flex justify-between gap-2 mb-4">
        <div className="flex gap-2">
          {reply?.key ? (
            <span className="text-sm text-muted-foreground font-semibold">
              {" "}
              {reply.key}
            </span>
          ) : (
            <span className="text-red-500 text-sm">*{t("key not found")} </span>
          )}
          <Badge variant="secondary" className="h-6 ml-4">
            {reply.category}
          </Badge>
          <Badge variant="secondary" className="h-6">
            {reply.topic}
          </Badge>
        </div>
        <div className="flex gap-1">
          {onEditClick && (
            <CustomTooltip
              trigger={
                <Button
                  className=""
                  variant="secondary"
                  size="icon-sm"
                  onClick={onEditClick}
                >
                  <Edit />
                </Button>
              }
              content={<span>{t("Edit")} </span>}
            />
          )}
          {onDelete && (
            <CustomTooltip
              trigger={
                <Button
                  variant="ghost"
                  className="hover:bg-red-100"
                  size="icon-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete();
                  }}
                >
                  <Trash color="red" />
                </Button>
              }
              content={<span>{t("Delete")}</span>}
            />
          )}
        </div>
      </div>
      <div className={cursor ? "group-hover:text-blue-700" : ""}>
        {parseJsonToReact(json)}
      </div>
    </div>
  );
};

export default QuickReplyItem;
