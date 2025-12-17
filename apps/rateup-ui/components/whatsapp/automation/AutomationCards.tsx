"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

import { ActionIcon, FloatingPosition, Menu } from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import { Clock, MessageSquare, Trash } from "lucide-react";
import { useTranslations } from "next-intl";

import { WaAutomatedReply } from "@/types/global";
import { useTimeSince } from "@/hooks/timeSince";
import { useDeleteWaAutomatedReplyMutation } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
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

  return (
    <Card
      className="hover:shadow-lg dark:hover:shadow-primary-foreground transition-shadow cursor-pointer"
      onClick={() => router.push(`flowbots/${automation.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl truncate flex-1">
            {automation.name}
          </CardTitle>
          <LCampaignCardMenuItems campaignId={automation.id} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {nodeCount > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {nodeCount} {nodeCount === 1 ? "step" : "steps"}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
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

function LCampaignCardMenuItems({ campaignId }) {
  const [deleteDialogOpened, setDeleteDialogOpened] = useState(false);
  const deleteMutation = useDeleteWaAutomatedReplyMutation();
  const translations = useTranslations();

  function handleDelete() {
    deleteMutation.mutate(campaignId, {
      onSuccess: () => setDeleteDialogOpened(false),
    });
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
