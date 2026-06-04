"use client";

import { useState } from "react";

import {
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconCopy,
  IconDots,
  IconMessageCircle,
  IconTrash,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { WaAutomatedReply } from "@/types/global";
import {
  useCloneWaAutomatedReplyMutation,
  useDeleteWaAutomatedReplyMutation,
  useUpdateWaAutomatedReplyMutation,
} from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useDeleteInstagramAutomationMutation } from "@/backend/whatsapp/instagram-automation/instagramAutomation.query";
import {
  GenericActionCard,
  GenericCardGrid,
} from "@/components/common/generic-card.tsx";
import ConfirmationModal from "@/components/Modal/ConfirmationModal.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Input } from "@/components/ui/input.tsx";

interface WaAutomationCardsProps {
  data: WaAutomatedReply[];
  detailsBasePath?: string;
}
export function WaAutomationCards({
  data,
  detailsBasePath = "/dashboard/whatsapp/flowbots",
}: Readonly<WaAutomationCardsProps>) {
  if (!data || !Array.isArray(data)) return null;

  return (
    <GenericCardGrid
      items={data}
      getKey={(automation) => automation.id}
      renderItem={(automation) => (
        <AutomationCard
          automation={automation}
          detailsBasePath={detailsBasePath}
        />
      )}
    />
  );
}

interface WaAutomationCardProps {
  automation: WaAutomatedReply;
  detailsBasePath: string;
}
function AutomationCard({
  automation,
  detailsBasePath,
}: Readonly<WaAutomationCardProps>) {
  const navigate = useNavigate();

  const matchData = automation.matchData?.json;
  const nodeCount = matchData?.edges?.length || 0;
  const platform = automation.platform || "whatsapp";
  const isInstagram = platform === "instagram";

  const platformBadge = (
    <Badge
      variant="outline"
      className={
        isInstagram
          ? "border-purple-500 bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400"
          : "border-green-500 bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400"
      }
    >
      {isInstagram ? (
        <>
          <IconBrandInstagram className="mr-1 size-3" />
          Instagram
        </>
      ) : (
        <>
          <IconBrandWhatsapp className="mr-1 size-3" />
          WhatsApp
        </>
      )}
    </Badge>
  );

  return (
    <GenericActionCard
      title={automation.name}
      titleTooltip={automation.name}
      actions={
        <AutomationActions
          automationId={automation.id}
          automationName={automation.name}
          platform={automation.platform}
        />
      }
      content={
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconMessageCircle className="size-3.5" />
            <span>
              {nodeCount} {nodeCount === 1 ? "step" : "steps"}
            </span>
          </div>
        </div>
      }
      footerLeft={platformBadge}
      createdAt={automation.createdAt}
      onClick={() =>
        navigate({
          to: `${detailsBasePath}/${automation.id}`,
        })
      }
    />
  );
}

type AutomationActionsProps = {
  readonly automationId: string;
  readonly automationName: string;
  readonly platform?: string;
};

function AutomationActions({
  automationId,
  automationName,
  platform,
}: AutomationActionsProps) {
  const [deleteDialogOpened, setDeleteDialogOpened] = useState(false);
  const [cloneDialogOpened, setCloneDialogOpened] = useState(false);
  const [cloneName, setCloneName] = useState("");

  const deleteWaMutation = useDeleteWaAutomatedReplyMutation();
  const cloneWaMutation = useCloneWaAutomatedReplyMutation();
  const updateWaMutation = useUpdateWaAutomatedReplyMutation();
  const deleteIgMutation = useDeleteInstagramAutomationMutation();
  const { t: translations } = useTranslation();

  const isInstagram = platform === "instagram";
  const isClonePending =
    cloneWaMutation.isPending || updateWaMutation.isPending;

  function handleOpenCloneDialog() {
    if (isClonePending) return;
    setCloneName(`${translations("Copy of")} ${automationName}`);
    setCloneDialogOpened(true);
  }

  function handleClone(e) {
    e?.preventDefault();
    e?.stopPropagation();
    if (isClonePending) return;
    const trimmedName = cloneName.trim();
    if (!trimmedName) return;
    cloneWaMutation.mutate(
      { automationId, name: trimmedName },
      {
        onSuccess: (clonedAutomation) => {
          if (!clonedAutomation?.id) {
            setCloneDialogOpened(false);
            return;
          }
          setCloneDialogOpened(false);
          setCloneName("");
        },
      },
    );
  }

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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <IconDots className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {isInstagram ? null : (
            <DropdownMenuItem
              disabled={isClonePending}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleOpenCloneDialog();
              }}
            >
              <IconCopy className="mr-2 size-3.5" />
              {isClonePending
                ? translations("Cloning...")
                : translations("Clone")}
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDeleteDialogOpened(true);
            }}
          >
            <IconTrash className="mr-2 size-3.5" />
            {translations("Delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
      <Dialog open={cloneDialogOpened} onOpenChange={setCloneDialogOpened}>
        <DialogContent className="sm:max-w-112.5">
          <DialogHeader>
            <DialogTitle>{translations("Clone chatbot")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              placeholder={translations("Enter name")}
              disabled={isClonePending}
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCloneDialogOpened(false)}
                disabled={isClonePending}
              >
                {translations("Cancel")}
              </Button>
              <Button
                onClick={handleClone}
                disabled={isClonePending || !cloneName.trim()}
              >
                {isClonePending
                  ? translations("Cloning...")
                  : translations("Clone")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
