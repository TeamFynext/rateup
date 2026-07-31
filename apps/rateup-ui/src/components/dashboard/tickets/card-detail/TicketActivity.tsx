// Extracted verbatim from `CardDetailPage.tsx`. Behaviour is unchanged.

import {
  AlertCircle,
  Check,
  CheckSquare,
  ListPlus,
  Paperclip,
  Plus,
  Trash,
  Trash2,
  User,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import type { Activity } from "@/components/Tickets/types.ts";
import { formatToRelativeTime } from "@/utils/dateTime.ts";

export function TicketActivity({ activities }: Readonly<{ activities: Array<Activity> }>) {
  const { t } = useTranslation();
  if (!activities || activities.length === 0)
    return <div className="text-sm text-muted-foreground p-4">{t("No activity yet.")}</div>;

  return (
    <div className="flex flex-col gap-4 mt-1 relative before:absolute before:inset-y-0 before:left-3.75 before:w-0.5 before:bg-border">
      {activities.map((activity) => {
        let title = "";
        let IconCmp = ListPlus;

        switch (activity.type) {
          case "ADDED_CARD":
            title = `${activity.user?.name ?? "System"} added this card to ${activity.details?.title || "a column"}`;
            IconCmp = ListPlus;
            break;
          case "ADDED_MEMBER":
            title = `${activity.user?.name} added ${activity.details?.memberName || "someone"} to this card`;
            IconCmp = User;
            break;
          case "REMOVED_MEMBER":
            title = `${activity.user?.name} removed ${activity.details?.memberName || "someone"} from this card`;
            IconCmp = UserMinus;
            break;
          case "ADDED_CONTACT":
            title = `${activity.user?.name} added contact ${activity.details?.contactName || "someone"} to this card`;
            IconCmp = UserPlus;
            break;
          case "REMOVED_CONTACT":
            title = `${activity.user?.name} removed contact ${activity.details?.contactName || "someone"} from this card`;
            IconCmp = UserMinus;
            break;
          case "ADDED_ATTACHMENT":
            title = `${activity.user?.name} added attachment ${activity.details?.key?.split("/").pop() || "file"}`;
            IconCmp = Paperclip;
            break;
          case "REMOVED_ATTACHMENT":
            title = `${activity.user?.name} removed attachment ${activity.details?.key?.split("/").pop() || "file"}`;
            IconCmp = Trash2;
            break;
          case "CHANGED_PRIORITY":
            title = `${activity.user?.name} changed priority from ${activity.details?.fromPriority || "None"} to ${activity.details?.toPriority}`;
            IconCmp = AlertCircle;
            break;
          case "ADDED_CHECKLIST":
            title = `${activity.user?.name} added checklist ${activity.details?.checklistName}`;
            IconCmp = CheckSquare;
            break;
          case "REMOVED_CHECKLIST":
            title = `${activity.user?.name} removed checklist ${activity.details?.checklistName}`;
            IconCmp = Trash2;
            break;
          case "ADDED_CHECKLIST_ITEM":
            title = `${activity.user?.name} added item ${activity.details?.itemName} to checklist ${activity.details?.checklistName}`;
            IconCmp = Plus;
            break;
          case "REMOVED_CHECKLIST_ITEM":
            title = `${activity.user?.name} removed item ${activity.details?.itemName} from checklist ${activity.details?.checklistName}`;
            IconCmp = Trash;
            break;
          case "CHECKED_CHECKLIST_ITEM":
            title = `${activity.user?.name} completed ${activity.details?.itemName} in checklist ${activity.details?.checklistName}`;
            IconCmp = Check;
            break;
          case "UNCHECKED_CHECKLIST_ITEM":
            title = `${activity.user?.name} unchecked ${activity.details?.itemName} in checklist ${activity.details?.checklistName}`;
            IconCmp = X;
            break;
          case "EDITED_CARD":
            title = `${activity.user?.name} edited this card`;
            IconCmp = User;
            break;
          case "MOVED_CARD":
            title = `${activity.user?.name} moved this card from ${activity.details?.fromColumnName || "a column"} to ${activity.details?.toColumnName || "another column"}`;
            IconCmp = ListPlus;
            break;
          default:
            title = `${activity.user?.name} updated this card`;
        }

        return (
          <div key={activity.id} className="relative flex gap-4 items-start">
            <div className="h-8 w-8 rounded-full bg-background border-2 flex items-center justify-center z-10 shrink-0">
              <IconCmp className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex flex-col pt-1.5">
              <span className="text-sm text-foreground">{title}</span>
              <span className="text-xs text-muted-foreground mt-0.5">
                {formatToRelativeTime(activity.timestamp)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
