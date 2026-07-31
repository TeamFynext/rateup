import { IconCopy, IconDots, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useCloneAndDeprecateFlowsMutation,
  useCloneFlowsMutation,
  useDeleteFlowMutation,
  useDeprecateFlowMutation,
} from "@/backend/whatsapp/flow/flow.query";
import { ActionCard } from "@/components/common/action-card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Field, FieldError } from "@/components/ui/field.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { WaFlowStatus } from "@/types/enums.ts";
import { SAVE_HOTKEY } from "@/utils/constants.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";

import styles from "./FlowCard.module.css";

interface FlowCardProps {
  name: string;
  status: WaFlowStatus;
  dbFlowId: string;
  createdAt: Date;
  teamsData?;
  version: number;
  category?: string;
  responseCount?: number;
}

function FlowCard({
  name,
  status,
  dbFlowId,
  createdAt,
  teamsData,
  version,
  category = "Customer Engagement",
  responseCount = 0,
}: Readonly<FlowCardProps>) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [cloneDialogOpened, setCloneDialogOpened] = useState(false);
  const [teamId, setTeamId] = useState("");
  const [teamIdError, setTeamIdError] = useState("");
  const deleteMutation = useDeleteFlowMutation();
  const deprecateFlowMutation = useDeprecateFlowMutation();
  const cloneFlowsMutation = useCloneFlowsMutation(() => {
    setCloneDialogOpened(false);
    setTeamId("");
    setTeamIdError("");
  });
  const cloneAndDeprecateFlowsMutation = useCloneAndDeprecateFlowsMutation();
  const teamOptions = teamsData?.map((team) => ({
    value: team?.id,
    label: team?.name,
  }));
  const { t: translations } = useTranslation();

  const closeCloneDialog = () => {
    setCloneDialogOpened(false);
    setTeamId("");
    setTeamIdError("");
  };

  // Also reached from the save hotkey, which has already prevented the default.
  const onSubmit = (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!teamId) {
      setTeamIdError("Must contain one team");
      return;
    }
    toast.loading(translations("Clonning Flow.."), {
      id: "copy",
      description: translations("Hold on, your flow is getting clonned..."),
    });
    cloneFlowsMutation.mutate({
      flowId: dbFlowId,
      teamId: teamId,
    });
  };

  const handleDelete = async () => {
    const shouldDelete = await confirm({
      title: translations("Delete Flow?"),
      description: translations("Are you sure to delete this Flow?"),
      confirmText: translations("Delete"),
      cancelText: translations("Cancel"),
    });

    if (!shouldDelete) return;

    if (status === WaFlowStatus.DRAFT) {
      deleteMutation.mutate(dbFlowId);
    } else if (status !== WaFlowStatus.DEPRECATED) {
      deprecateFlowMutation.mutate(dbFlowId);
    }
  };

  const handleCopyAndRenew = async () => {
    const shouldCopy = await confirm({
      title: translations("Copy & Renew Flow"),
      description: translations(
        "Attention! Copying and renewing this workflow will permanently disable the original one. A new, identical copy will be created, but you won't be able to use the old one anymore. Think carefully before confirming!",
      ),
      confirmText: translations("Copy & Renew Flow"),
      cancelText: translations("Cancel"),
    });

    if (!shouldCopy) return;

    toast.loading(translations("Copy & Renew whatapp flow"), {
      id: "copy-renew",
      description: translations("Hold.. your flow data is getting Coping & Renew..."),
    });
    cloneAndDeprecateFlowsMutation.mutate(dbFlowId);
  };

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        <IconDots size={20} />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <Tooltip>
          <TooltipTrigger render={<div />}>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="text-red-600 focus:text-red-600"
            >
              <IconTrash size={16} className="mr-2" />
              {translations("Delete")}
            </DropdownMenuItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {status === WaFlowStatus.DRAFT
                ? translations("Delete Flow")
                : translations("It will be deprecated and will be removed from the system")}
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger render={<div />}>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setCloneDialogOpened(true);
              }}
              disabled={status === WaFlowStatus.DEPRECATED}
            >
              <IconCopy size={16} className="mr-2" />
              {translations("Clone")}
            </DropdownMenuItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>clone-flow</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger render={<div />}>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleCopyAndRenew();
              }}
              disabled={status !== WaFlowStatus.PUBLISHED}
            >
              <IconCopy size={16} className="mr-2" />
              {translations("Copy & Renew Flow")}
            </DropdownMenuItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {status === WaFlowStatus.PUBLISHED
                ? translations("Copy & Renew Flow")
                : translations("You can only Copy & Renew Flow in PUBLISHED state")}
            </p>
          </TooltipContent>
        </Tooltip>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <ActionCard
        title={name}
        titleTooltip={name}
        subtitle={category}
        actions={menu}
        content={
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            {responseCount} responses
          </p>
        }
        footerLeft={
          <Badge variant="secondary" className={styles[`${status.toLowerCase()}-badge`]}>
            {status === WaFlowStatus.PUBLISHED ? "Active" : status}
          </Badge>
        }
        createdAt={createdAt}
        onClick={() =>
          navigate({
            to: `/dashboard/whatsapp/flows/v${version}/${dbFlowId}${
              status === WaFlowStatus.PUBLISHED ? "?tab=Result" : ""
            }`,
          })
        }
      />
      <Dialog
        open={cloneDialogOpened}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeCloneDialog();
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-auto sm:max-w-125"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="text-center text-3xl font-semibold">
              {translations("Clone Whatsapp Flow")}
            </DialogTitle>
          </DialogHeader>
          <form
            className="p-5"
            onSubmit={onSubmit}
            onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, () => void onSubmit()]])}
          >
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground">
                {translations("Select the team in which the whatsapp flow copy to be created.")}
              </p>
              <Field className="w-full">
                <Select
                  items={teamOptions}
                  value={teamId ?? ""}
                  onValueChange={(value) => {
                    setTeamId(value as string);
                    setTeamIdError("");
                  }}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!teamIdError}>
                    <SelectValue placeholder={translations("Select team (type in to search)")} />
                  </SelectTrigger>
                  <SelectContent>
                    {teamOptions.map((option: { value: string; label: string }) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {teamIdError && <FieldError>{teamIdError}</FieldError>}
              </Field>
            </div>
            <DialogFooter className="mt-4">
              <Button type="reset" variant="ghost" onClick={closeCloneDialog}>
                {translations("Cancel")}
              </Button>
              <Button type="submit">Clone</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FlowCard;
