"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

import { ActionIcon, FloatingPosition, Menu } from "@mantine/core";
import {
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconDots,
} from "@tabler/icons-react";
import { Clock, MessageSquare, Trash } from "lucide-react";
import { useTranslations } from "next-intl";

import { WaAutomatedReply } from "@/types/global";
import { useTimeSince } from "@/hooks/timeSince";
import { useDeleteWaAutomatedReplyMutation } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useDeleteInstagramAutomationMutation } from "@/backend/whatsapp/instagram-automation/instagramAutomation.query";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WaAutomationCardsProps {
  data: any;
}
export function WaAutomationCards({ data }: Readonly<WaAutomationCardsProps>) {
  if (!data || !Array.isArray(data)) return null;

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-4 p-3.5">
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
      className="hover:shadow-lg dark:hover:shadow-primary-foreground transition-shadow cursor-pointer"
      onClick={() => router.push(`flowbots/${automation.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate mb-1.5">
              {automation.name}
            </CardTitle>
            <Badge
              variant="outline"
              className={`text-xs flex items-center gap-1 w-fit ${
                isInstagram
                  ? "border-purple-500 text-purple-600 dark:text-purple-400"
                  : "border-green-500 text-green-600 dark:text-green-400"
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
            </Badge>
          </div>
          <LCampaignCardMenuItems
            campaignId={automation.id}
            platform={automation.platform}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-3 space-y-1.5">
        {nodeCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>
              {nodeCount} {nodeCount === 1 ? "step" : "steps"}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {translations("Created")} {timeSince}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
export function CardMenu({
  children,
  position,
}: Readonly<{
  children: ReactNode;
  position?: FloatingPosition;
}>) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Menu position={position ?? "bottom-start"}>
        <Menu.Target>
          <ActionIcon variant="subtle">
            <IconDots color="gray" />
          </ActionIcon>
        </Menu.Target>
        {children}
      </Menu>
    </div>
  );
}

function LCampaignCardMenuItems({ campaignId, platform }) {
  const [deleteDialogOpened, setDeleteDialogOpened] = useState(false);
  const deleteWaMutation = useDeleteWaAutomatedReplyMutation();
  const deleteIgMutation = useDeleteInstagramAutomationMutation();
  const translations = useTranslations();

  const isInstagram = platform === "instagram";

  function handleDelete() {
    if (isInstagram) {
      deleteIgMutation.mutate(campaignId, {
        onSuccess: () => setDeleteDialogOpened(false),
      });
    } else {
      deleteWaMutation.mutate(campaignId, {
        onSuccess: () => setDeleteDialogOpened(false),
      });
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={(e) => {
          e.stopPropagation();
          setDeleteDialogOpened(true);
        }}
      >
        <Trash className="h-4 w-4 text-destructive" />
      </Button>
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
    </>
  );
}
