"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconClock,
  IconDots,
  IconMessageCircle,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { WaAutomatedReply } from "@/types/global";
import { useTimeSince } from "@/hooks/timeSince";
import { useDeleteWaAutomatedReplyMutation } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useDeleteInstagramAutomationMutation } from "@/backend/whatsapp/instagram-automation/instagramAutomation.query";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { Card } from "@/components/ui/card";

interface WaAutomationCardsProps {
  data: any;
}
export function WaAutomationCards({ data }: Readonly<WaAutomationCardsProps>) {
  if (!data || !Array.isArray(data)) return null;

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-4 pt-4 pb-4">
      {data.map((automation) => (
        <AutomationCard key={automation.id} automation={automation} />
      ))}
    </div>
  );
}

interface WaAutomationCardProps {
  automation: WaAutomatedReply;
}
function AutomationCard({ automation }: Readonly<WaAutomationCardProps>) {
  const timeSince = useTimeSince(automation.createdAt);
  const router = useRouter();
  const translations = useTranslations();

  const matchData = automation.matchData?.json;
  const nodeCount = matchData?.edges?.length || 0;
  const platform = automation.platform || "whatsapp";
  const isInstagram = platform === "instagram";

  return (
    <Card
      className="hover:shadow-lg dark:hover:shadow-primary-foreground transition-shadow cursor-pointer py-0 gap-0"
      onClick={() => router.push(`flowbots/${automation.id}`)}
    >
      <div className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-md font-semibold truncate mb-2">
              {automation.name}
            </h3>
            <span
              className={`inline-flex items-center gap-1 text-xs h-5 px-1.5 rounded-md border ${
                isInstagram
                  ? "border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20"
                  : "border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20"
              }`}
            >
              {isInstagram ? (
                <>
                  <IconBrandInstagram className="w-3 h-3" />
                  Instagram
                </>
              ) : (
                <>
                  <IconBrandWhatsapp className="w-3 h-3" />
                  WhatsApp
                </>
              )}
            </span>
          </div>
          <DeleteButton
            automationId={automation.id}
            platform={automation.platform}
          />
        </div>
      </div>
      <div className="px-3 pb-3 space-y-1">
        {nodeCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconMessageCircle className="w-3.5 h-3.5" />
            <span>
              {nodeCount} {nodeCount === 1 ? "step" : "steps"}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconClock className="w-3.5 h-3.5" />
          <span>
            {translations("Created")} {timeSince}
          </span>
        </div>
      </div>
    </Card>
  );
}
function DeleteButton({ automationId, platform }) {
  const [deleteDialogOpened, setDeleteDialogOpened] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const deleteWaMutation = useDeleteWaAutomatedReplyMutation();
  const deleteIgMutation = useDeleteInstagramAutomationMutation();
  const translations = useTranslations();

  const isInstagram = platform === "instagram";

  function handleDelete() {
    if (isInstagram) {
      deleteIgMutation.mutate(automationId, {
        onSuccess: () => setDeleteDialogOpened(false),
      });
    } else {
      deleteWaMutation.mutate(automationId, {
        onSuccess: () => setDeleteDialogOpened(false),
      });
    }
  }

  return (
    <div className="relative">
      <button
        className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
      >
        <IconDots className="h-4 w-4 text-muted-foreground" />
      </button>
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
            }}
          />
          <div className="absolute right-0 top-8 z-20 bg-popover border border-border rounded-md shadow-lg overflow-hidden min-w-[120px]">
            <button
              className="w-full px-3 py-2 text-xs text-left hover:bg-muted transition-colors flex items-center gap-2 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                setDeleteDialogOpened(true);
              }}
            >
              <IconTrash className="h-3.5 w-3.5" />
              {translations("Delete")}
            </button>
          </div>
        </>
      )}
      <ConfirmationModal
        forDeleteFunctionality
        opened={deleteDialogOpened}
        onClose={() => setDeleteDialogOpened(false)}
        headerLabel={translations(
          "Are you sure you want to delete this Automated Reply?",
        )}
        headerTitle={translations("Delete Automated Reply")}
        confirmLabel={translations("Delete")}
        onConfirm={handleDelete}
      />
    </div>
  );
}
