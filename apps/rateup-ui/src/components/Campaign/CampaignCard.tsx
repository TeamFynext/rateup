import { Edit2, Eye, MoreVertical, Trash2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useDeleteCampaignMutation,
  useUpdateCampaignMutation,
} from "@/backend/campaign/campaign.query";
import { ActionCard } from "@/components/common/action-card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import type { Campaign } from "@/types/global";

import { Separator } from "../ui/separator.tsx";

function getStatusColor(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
    case "INACTIVE":
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
    case "DRAFT":
      return "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600";
    case "SCHEDULED":
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    case "COMPLETED":
      return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800";
    default:
      return "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600";
  }
}

interface CampaignCardProps {
  readonly campaign: Campaign;
  readonly onView: (campaign: Campaign) => void;
  readonly onEdit: (campaign: Campaign) => void;
}

export default function CampaignCard(props: Readonly<CampaignCardProps>) {
  const { campaign, onView, onEdit } = props;
  const updateCampaignMutation = useUpdateCampaignMutation(
    campaign.id,
    campaign.teamId,
    () => {},
    campaign.type,
  );
  const { t } = useTranslation("campaign.card");
  const confirm = useConfirm();
  const deleteCampaignMutation = useDeleteCampaignMutation(campaign.teamId, campaign.type);
  const handleStatusChange = async (campaign: Campaign, checked: boolean) => {
    const newStatus = checked ? "ACTIVE" : "INACTIVE";

    try {
      await updateCampaignMutation.mutateAsync({
        campaignId: campaign.id,
        data: {
          status: newStatus,
        },
      });
    } catch {
      toast.error(t("toast.statusUpdateError"));
    }
  };
  const handleDelete = async () => {
    const shouldDelete = await confirm({
      title: t("Delete Campaign"),
      description: t('Are you sure you want to delete "{name}"? This action cannot be undone.', {
        name: campaign.name,
      }),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });

    if (!shouldDelete) return;

    try {
      await deleteCampaignMutation.mutateAsync(campaign.id);
      toast.success(t("Campaign deleted successfully"));
    } catch {
      toast.error(t("Failed to delete campaign"));
    }
  };

  const actions = (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(event) => event.stopPropagation()}
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          />
        }
      >
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            onView(campaign);
          }}
        >
          <Eye className="mr-2 h-4 w-4" />
          {t("View Details")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            onEdit(campaign);
          }}
        >
          <Edit2 className="mr-2 h-4 w-4" />
          {t("Edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={(event) => {
            event.stopPropagation();
            handleDelete();
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("Delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <ActionCard
      title={campaign.name}
      titleTooltip={campaign.name}
      subtitle={campaign.type}
      actions={actions}
      showSwitch
      switchChecked={campaign.status === "ACTIVE"}
      onSwitchChange={(checked) => handleStatusChange(campaign, checked)}
      content={
        <div className="flex">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 pr-3 text-sm text-slate-600 dark:text-slate-400">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{campaign.teamName}</span>
          </div>
          <Separator orientation="vertical" className="mx-1 h-auto" />
          <div className="flex flex-1 flex-col items-end justify-center gap-1 text-sm">
            {campaign.campaignParticipantsCount?.toLocaleString() ?? "0"}
          </div>
        </div>
      }
      footerLeft={
        <Badge variant="outline" className={getStatusColor(campaign.status ?? "")}>
          {campaign.status}
        </Badge>
      }
      createdAt={campaign.createdAt}
      onClick={() => onView(campaign)}
    />
  );
}
