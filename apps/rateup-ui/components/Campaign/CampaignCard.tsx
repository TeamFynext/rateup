"use client";

import { Edit2, Eye, MoreVertical, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useDeleteCampaignMutation } from "@/backend/campaign/campaign.query";
import { GenericActionCard } from "@/components/common/generic-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Separator } from "../ui/separator";

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

export interface Campaign {
  readonly id: string;
  readonly teamId: string;
  readonly teamName?: string;
  readonly type: string;
  readonly status?: string;
  readonly name?: string;
  readonly campaignParticipantsCount?: number;
  readonly createdAt?: string;
}
interface CampaignCardProps {
  readonly campaign: Campaign;
  readonly onView: (campaign: Campaign) => void;
  readonly onEdit: (campaign: Campaign) => void;
}

export default function CampaignCard(props: Readonly<CampaignCardProps>) {
  const { campaign, onView, onEdit } = props;
  const t = useTranslations("campaign.card");
  const deleteCampaignMutation = useDeleteCampaignMutation(
    campaign.teamId,
    campaign.type,
  );

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await deleteCampaignMutation.mutateAsync(campaign.id);
      toast.success(t("toast.deleteSuccess"));
    } catch {
      toast.error(t("toast.deleteError"));
    }
  };

  const actions = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            onView(campaign);
          }}
        >
          <Eye className="mr-2 h-4 w-4" />
          {t("actions.view")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            onEdit(campaign);
          }}
        >
          <Edit2 className="mr-2 h-4 w-4" />
          {t("actions.edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive dark:text-red-400 focus:text-destructive dark:focus:text-red-400"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <GenericActionCard
      title={campaign.name}
      titleTooltip={campaign.name}
      subtitle={campaign.type}
      actions={actions}
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
        <Badge
          variant="outline"
          className={getStatusColor(campaign.status ?? "")}
        >
          {campaign.status}
        </Badge>
      }
      createdAt={campaign.createdAt}
      className="group relative h-full cursor-pointer overflow-hidden border border-border p-[0.7rem] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg dark:hover:border-primary/10"
      onClick={() => onView(campaign)}
    />
  );
}
