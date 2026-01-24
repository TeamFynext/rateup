"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useTranslations } from "next-intl";
import { IconCalendar, IconCopy, IconDots, IconTrash } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

import { WaFlowStatus } from "@/types/enums";
import {
  useCloneAndDeprecateFlowsMutation,
  useCloneFlowsMutation,
  useDeleteFlowMutation,
  useDeprecateFlowMutation,
} from "@/backend/whatsapp/flow/flow.query";
import CreatedSinceText from "@/components/DateAndTime/CreatedSinceText";
import { ContainedSelection } from "@/components/input/ContainedInput/ContainedInput";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import FormModalLayout from "@/components/Modal/FormModalLayout";

import styles from "./FlowCard.module.css";

interface FlowCardProps {
  name: string;
  status: WaFlowStatus;
  dbFlowId: string;
  createdAt: Date;
  teamsData?: any;
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
  responseCount = 5,
}: Readonly<FlowCardProps>) {
  const router = useRouter();
  const [dialogOpened, setDialogOpened] = useState(false);
  const [cloneAandRenewOpened, setCloneAandRenewOpened] = useState(false);
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
  const teamOptions = teamsData?.map((team: any) => ({
    value: team?.id,
    label: team?.name,
  }));
  const translations = useTranslations();
  
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) {
      setTeamIdError("Must contain one team");
      return;
    }
    toast.loading(translations("Clonning Flow"), {
      id: "copy",
      description: translations("Hold on, your flow is getting clonned"),
    });
    cloneFlowsMutation.mutate({
      flowId: dbFlowId,
      teamId: teamId,
    });
  };

  return (
    <Card
      className="h-full cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-colors border dark:border-gray-700 dark:bg-[#121212]"
      onClick={() =>
        router.push(
          `/dashboard/whatsapp/flows/v${version}/${dbFlowId}${status === WaFlowStatus.PUBLISHED ? "?tab=Result" : ""}`,
        )
      }
    >
      <CardContent className="px-4  flex flex-col justify-between h-full gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="flex-1 overflow-hidden">
              <h3
                className="font-semibold text-lg text-black dark:text-white truncate"
                title={name}
              >
                {name}
              </h3>
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                {category}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <IconDots size={20} />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDialogOpened(true);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <IconTrash size={16} className="mr-2" />
                          {translations("Delete")}
                        </DropdownMenuItem>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {status !== WaFlowStatus.DRAFT
                          ? translations(
                            "It will be deprecated and will be removed from the system",
                          )
                          : translations("Delete Flow")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
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
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>clone-flow</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setCloneAandRenewOpened(true);
                          }}
                          disabled={status !== WaFlowStatus.PUBLISHED}
                        >
                          <IconCopy size={16} className="mr-2" />
                          {translations("Copy & Renew Flow")}
                        </DropdownMenuItem>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {status !== WaFlowStatus.PUBLISHED
                          ? translations(
                            "You can only Copy & Renew Flow in PUBLISHED state",
                          )
                          : translations("Copy & Renew Flow")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="font-semibold text-sm text-muted-foreground mt-2">
            {responseCount} responses
          </p>
        </div>

        <div>
          <Separator className="mb-3" />
          <div className="flex justify-between items-center">
            <Badge
              variant="secondary"
              className={styles[`${status.toLowerCase()}-badge`]}
            >
              {status === WaFlowStatus.PUBLISHED ? "Active" : status}
            </Badge>

            <div className="flex items-center gap-1 text-muted-foreground">
              <IconCalendar size={18} />
              <CreatedSinceText createdAt={createdAt} />
            </div>
          </div>
        </div>
      </CardContent>

      <ConfirmationModal
        forDeleteFunctionality
        opened={dialogOpened}
        onClose={() => setDialogOpened(false)}
        headerLabel={translations("Are you sure to delete this Flow?")}
        headerTitle={translations("Delete Flow?")}
        confirmLabel={translations("Delete")}
        onConfirm={(e) => {
          if (status === WaFlowStatus.DRAFT) {
            deleteMutation.mutate(dbFlowId);
          } else if (status !== WaFlowStatus.DEPRECATED) {
            deprecateFlowMutation.mutate(dbFlowId);
          }
          setDialogOpened(false);
        }}
      />
      <ConfirmationModal
        forDeleteFunctionality
        opened={cloneAandRenewOpened}
        onClose={() => setCloneAandRenewOpened(false)}
        headerLabel={translations(
          "Attention! Copying and renewing this workflow will permanently disable the original one A new, identical copy will be created, but you won't be able to use the old one anymore Think carefully before confirming!",
        )}
        headerTitle={translations("Copy & Renew Flow")}
        confirmLabel={translations("Copy & Renew Flow")}
        onConfirm={(e) => {
          toast.loading(translations("Copy & Renew whatapp flow"), {
            id: "copy-renew",
            description: translations(
              "Hold your flow data is getting Coping & Renew",
            ),
          });
          cloneAndDeprecateFlowsMutation.mutate(dbFlowId);
          setCloneAandRenewOpened(false);
        }}
      />

      <FormModalLayout
        opened={cloneDialogOpened}
        onClose={() => {
          setCloneDialogOpened(false);
          setTeamId("");
          setTeamIdError("");
        }}
        title={translations("Clone Whatsapp Flow")}
        centered
        onSubmit={onSubmit}
        buttonTitle={"Clone"}
        includeCancelButton
      >
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground">
            {translations(
              "Select the team in which the whatsapp flow copy to be created",
            )}
          </p>
          <ContainedSelection
            radius="md"
            placeholder={translations("Select team (type in to search)")}
            data={teamOptions}
            searchable
            styles={{ root: { width: "100%" } }}
            value={teamId}
            onChange={(value) => {
              setTeamId(value);
              setTeamIdError("");
            }}
            error={teamIdError}
          />
        </div>
      </FormModalLayout>
    </Card>
  );
}

export default FlowCard;
