import { IconCopy, IconDots, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ChatbotSummary } from "@/backend/chatbots/chatbots.api.ts";
import {
  useCloneChatbotMutation,
  useDeleteChatbotMutation,
  useToggleChatbotMutation,
} from "@/backend/chatbots/chatbots.query.ts";
import { ActionCard } from "@/components/common/action-card.tsx";
import { CardGrid } from "@/components/common/generic-card.tsx";
import { PLATFORM_BADGE } from "@/components/dashboard/automation/components/rule-card.tsx";
import { PLATFORMS } from "@/components/dashboard/automation/components/schema.ts";
import type { DataTableFeatures } from "@/components/Table/data-table-features.ts";
import { DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";

/** The channel badge, coloured as on the automation rule cards. */
export function ChannelBadge({ platform }: Readonly<{ platform: string }>) {
  const value = platform.toUpperCase();
  return (
    <Badge variant="secondary" className={PLATFORM_BADGE[value]}>
      {PLATFORMS.find((option) => option.value === value)?.label ?? platform}
    </Badge>
  );
}

function useStepLabel() {
  const { t } = useTranslation();
  return (count: number) => t("{count, plural, one {# step} other {# steps}}", { count });
}

/** "12 runs · 8 completed", or "No runs yet". */
function useRunsLabel() {
  const { t } = useTranslation();
  return ({ started, completed }: ChatbotSummary["runs"]) =>
    started === 0
      ? t("No runs yet")
      : `${t("{count, plural, one {# run} other {# runs}}", { count: started })} · ${t(
          "{count} completed",
          { count: completed },
        )}`;
}

const formatDate = (value: string) => new Date(value).toLocaleDateString();

/** Active / Inactive, as on the rule cards. */
function StatusBadge({ isActive }: Readonly<{ isActive: boolean }>) {
  const { t } = useTranslation();
  return (
    <Badge
      variant="secondary"
      className={
        isActive
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
          : "bg-muted text-foreground"
      }
    >
      {isActive ? t("Active") : t("Inactive")}
    </Badge>
  );
}

/** The on/off switch. Its clicks stay off the card and the table row (see ActionCard). */
function ActiveSwitch({ chatbot }: Readonly<{ chatbot: ChatbotSummary }>) {
  const { t } = useTranslation();
  const toggle = useToggleChatbotMutation();
  return (
    <span className="inline-flex" onClick={(event) => event.stopPropagation()}>
      <Switch
        aria-label={chatbot.isActive ? t("Switch off") : t("Switch on")}
        checked={chatbot.isActive}
        onCheckedChange={(isActive) => toggle.mutate({ id: chatbot.id, isActive })}
      />
    </span>
  );
}

/** Chatbots as cards (the automation rule card's layout) or as a table. */
export function ChatbotCards({
  data,
  viewMode,
}: Readonly<{ data: ChatbotSummary[]; viewMode: "grid" | "list" }>) {
  return viewMode === "grid" ? (
    <CardGrid
      items={data}
      getKey={(chatbot) => chatbot.id}
      renderItem={(chatbot) => <ChatbotCard chatbot={chatbot} />}
    />
  ) : (
    <ChatbotTable data={data} />
  );
}

function ChatbotCard({ chatbot }: Readonly<{ chatbot: ChatbotSummary }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const steps = useStepLabel();
  const runs = useRunsLabel();
  return (
    <ActionCard
      title={chatbot.name}
      titleTooltip={chatbot.name}
      subtitle={`${steps(chatbot.stepCount)} · ${t("Edited {date}", {
        date: formatDate(chatbot.updatedAt),
      })}`}
      onClick={() =>
        void navigate({ to: "/dashboard/chatbots/$chatbotId", params: { chatbotId: chatbot.id } })
      }
      actions={<ChatbotActions chatbot={chatbot} />}
      content={
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <ChannelBadge platform={chatbot.platform} />
            <ActiveSwitch chatbot={chatbot} />
          </div>
          <span className="text-xs text-muted-foreground">{runs(chatbot.runs)}</span>
        </div>
      }
      footerLeft={<StatusBadge isActive={chatbot.isActive} />}
      createdAt={chatbot.createdAt}
    />
  );
}

function ChatbotTable({ data }: Readonly<{ data: ChatbotSummary[] }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const steps = useStepLabel();
  const runs = useRunsLabel();

  const columns = useMemo<ColumnDef<DataTableFeatures, ChatbotSummary>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("Name"),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">{steps(row.original.stepCount)}</span>
          </div>
        ),
      },
      {
        accessorKey: "platform",
        header: t("Channel"),
        cell: ({ row }) => <ChannelBadge platform={row.original.platform} />,
      },
      {
        id: "runs",
        header: t("Runs"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{runs(row.original.runs)}</span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: t("Last edited"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.updatedAt)}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("Created"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "isActive",
        header: t("Active"),
        cell: ({ row }) => <ActiveSwitch chatbot={row.original} />,
      },
      {
        id: "row-actions",
        header: "",
        cell: ({ row }) => <ChatbotActions chatbot={row.original} />,
      },
    ],
    [t],
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      onRowClick={(row) =>
        void navigate({ to: "/dashboard/chatbots/$chatbotId", params: { chatbotId: row.id } })
      }
    />
  );
}

/** The ⋯ menu: copy under a new name, or delete after a confirm. */
function ChatbotActions({ chatbot }: Readonly<{ chatbot: ChatbotSummary }>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const cloneMutation = useCloneChatbotMutation();
  const deleteMutation = useDeleteChatbotMutation();
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const isCloning = cloneMutation.isPending;

  function openClone() {
    setCloneName(`${t("Copy of")} ${chatbot.name}`);
    setCloneOpen(true);
  }

  function clone() {
    const name = cloneName.trim();
    if (!name || isCloning) return;
    cloneMutation.mutate({ id: chatbot.id, name }, { onSuccess: () => setCloneOpen(false) });
  }

  async function remove() {
    const ok = await confirm({
      title: t("Delete chatbot"),
      description: t("Are you sure you want to delete this chatbot? This can't be undone."),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });
    if (ok) deleteMutation.mutate(chatbot.id);
  }

  return (
    // React events bubble through the menu's and dialog's portals, so stopping them here keeps
    // every click inside from reaching the card or the table row.
    <span className="inline-flex" onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={t("More actions")}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            />
          }
        >
          <IconDots size={20} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-40">
          <DropdownMenuItem disabled={isCloning} onClick={openClone}>
            <IconCopy className="mr-2 h-4 w-4" />
            {t("Clone")}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => void remove()}>
            <IconTrash className="mr-2 h-4 w-4" />
            {t("Delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent className="sm:max-w-112.5">
          <DialogHeader>
            <DialogTitle>{t("Clone chatbot")}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              clone();
            }}
          >
            <Input
              aria-label={t("Name")}
              value={cloneName}
              onChange={(event) => setCloneName(event.target.value)}
              placeholder={t("Enter name")}
              disabled={isCloning}
            />
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCloneOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" loading={isCloning} disabled={!cloneName.trim()}>
                {t("Clone")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </span>
  );
}
