"use client";

import { useRouter } from "next/navigation";

import { Copy, Edit2, Eye, MoreVertical, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { useDeleteCampaignMutation } from "@/backend/campaign/campaign.query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  campaign: any;
  onView: (campaign: any) => void;
  onEdit: (campaign: any) => void;
}

export default function CampaignCard({
  campaign,
  onView,
  onEdit,
}: CampaignCardProps) {
  const router = useRouter();
  const deleteCampaignMutation = useDeleteCampaignMutation(
    campaign.teamId,
    campaign.type,
  );

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await deleteCampaignMutation.mutateAsync(campaign.id);
      toast.success("Campaign deleted successfully");
      router.refresh();
    } catch {
      toast.error("Failed to delete campaign");
    }
  };

  return (
    <Card
      key={campaign.id}
      className="p-0.7 group hover:shadow-lg transition-all duration-300 cursor-pointer  border border-border hover:border-primary/30 dark:hover:border-primary/10 overflow-hidden relative hover:-translate-y-0.5"
      onClick={() => onView(campaign)}
    >
      {/* Card Content */}
      <div className="p-4">
        {/* Header with Name and 3-dot menu */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm line-clamp-2 flex-1 pr-2 dark:text-slate-50">
            {campaign.name}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 h-7 w-7 rounded-lg"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onView(campaign);
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(campaign);
                }}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive dark:text-red-400 focus:text-destructive dark:focus:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Team */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mb-3">
          <Users className="w-3.5 h-3.5" />
          <span>{campaign.teamName}</span>
        </div>

        {/* Status Badge */}
        <div className="mb-3">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(
              campaign.status,
            )}`}
          >
            {campaign.status}
          </span>
        </div>

        {/* Participants */}
        <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700">
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Participants
          </span>
          <span className="text-sm dark:text-slate-200">
            {campaign.campaignParticipantsCount?.toLocaleString() ?? "0"}
          </span>
        </div>

        {/* Created */}
        <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700">
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Created
          </span>
          <span className="text-xs text-slate-900 dark:text-slate-200">
            {new Date(campaign.createdAt)
              .toLocaleDateString("en-GB")
              .replace(/\//g, "-")}
          </span>
        </div>
      </div>
    </Card>
  );
}
