import { Edit, Trash } from "lucide-react";
import { useTranslation } from "react-i18next";

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
      className={`group flex items-center justify-between gap-4 py-4 px-6 bg-white dark:bg-card hover:bg-gray-50/50 dark:hover:bg-zinc-800/10 transition-colors w-full ${
        cursor ? "cursor-pointer" : ""
      }`}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick(reply.text);
        }
      }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Key Badge */}
        {reply?.key ? (
          <span className="shrink-0 bg-primary/10 text-primary text-sm font-semibold px-2.5 py-1.5 rounded-lg select-none">
            {reply.key.startsWith("/") ? reply.key : `/${reply.key}`}
          </span>
        ) : (
          <span className="shrink-0 text-red-500 text-sm font-semibold select-none">
            *{t("key not found")}
          </span>
        )}

        {/* Category Badge */}
        {reply.category && (
          <span className="shrink-0 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-350 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none">
            {reply.category}
          </span>
        )}

        {/* Topic Badge */}
        {reply.topic && (
          <span className="shrink-0 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-350 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none">
            {reply.topic}
          </span>
        )}

        {/* Vertical Divider */}
        <span className="text-gray-300 dark:text-zinc-700 select-none">|</span>

        {/* Reply Message Preview */}
        <div
          className={`text-sm text-foreground/90 truncate flex-1 min-w-0 [&_p]:inline [&_p]:m-0 [&_div]:inline [&_div]:m-0 ${
            cursor ? "group-hover:text-primary transition-colors" : ""
          }`}
        >
          {parseJsonToReact(json)}
        </div>
      </div>

      {/* Hover Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 shrink-0 ml-auto">
        {onEditClick && (
          <CustomTooltip
            trigger={
              <Button
                variant="ghost"
                className="hover:bg-muted text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEditClick();
                }}
              >
                <Edit className="w-4 h-4" />
              </Button>
            }
            content={<span>{t("Edit")}</span>}
          />
        )}
        {onDelete && (
          <CustomTooltip
            trigger={
              <Button
                variant="ghost"
                className="hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-600 h-8 w-8 p-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash className="w-4 h-4" />
              </Button>
            }
            content={<span>{t("Delete")}</span>}
          />
        )}
      </div>
    </div>
  );
};

export default QuickReplyItem;
