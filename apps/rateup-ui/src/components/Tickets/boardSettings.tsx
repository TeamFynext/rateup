import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  ChevronLeft,
  Columns,
  LayoutGrid,
  Settings,
  Trash2,
  ArrowRight,
  Users,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useId, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useUpdateBoardMutation, useBoardQueries } from "@/backend/tickets/tickets.query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { cn } from "@/lib/utils";

import { ManageColumnsDialog } from "./ManageColumnsDialog.tsx";
import { ManageLabels } from "./ManageLabels.tsx";
import type { Board } from "./types.ts";

interface SettingsFeatureCardProps {
  icon: LucideIcon;
  color: string;
  title: string;
  desc: string;
  actionLabel: string;
  onAction: () => void;
  danger?: boolean;
}

function SettingsFeatureCard({
  icon: Icon,
  color,
  title,
  desc,
  actionLabel,
  onAction,
  danger,
}: SettingsFeatureCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex-1 p-4">
        <div
          className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: danger ? "#FEF2F2" : `${color}16` }}
        >
          <Icon size={17} color={danger ? "#DC2626" : color} strokeWidth={2} />
        </div>
        <div className="mb-1 font-display text-sm font-extrabold text-foreground">{title}</div>
        <div className="font-body text-xs leading-snug text-muted-foreground">{desc}</div>
      </div>
      <div className="border-t border-border px-4 py-3">
        <button
          onClick={onAction}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={cn(
            "inline-flex items-center gap-1 border-none bg-transparent p-0 font-body text-xs font-bold cursor-pointer",
            danger ? "text-red-600" : "text-primary",
          )}
        >
          {actionLabel}
          <ArrowRight
            size={12}
            strokeWidth={2.5}
            className={cn("transition-transform duration-150", hovered && "translate-x-0.5")}
          />
        </button>
      </div>
    </div>
  );
}

interface BoardDetailsDialogProps {
  board: Board;
  open: boolean;
  onClose: () => void;
  onSave: (patch: { title: string; description: string }) => void;
}

function BoardDetailsDialog({ board, open, onClose, onSave }: BoardDetailsDialogProps) {
  const uid = useId();
  const { t } = useTranslation();
  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description || "");

  useEffect(() => {
    if (open) {
      setTitle(board.title);
      setDescription(board.description || "");
    }
  }, [open, board]);

  const submit = () => {
    if (title.trim()) {
      onSave({ title: title.trim(), description: description.trim() });
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{t("Board Details")}</DialogTitle>
        <div className="py-2">
          <Field className="mb-4">
            <FieldLabel htmlFor={`${uid}-field`} className="mb-1.5 block">
              {t("Board Name *")}
            </FieldLabel>
            <Input
              id={`${uid}-field`}
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </Field>
          <Field className="mb-5">
            <FieldLabel htmlFor={`${uid}-field-2`} className="mb-1.5 block">
              {t("Description")}
            </FieldLabel>
            <Input
              id={`${uid}-field-2`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2.5 mt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button size="sm" onClick={submit} disabled={!title.trim()}>
            {t("Save Changes")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface NotificationSettingsFormProps {
  board: Board;
  onSave: (settings: {
    ticketCreatedEmail: boolean;
    ticketCreatedWhatsapp: boolean;
    ticketAssignedEmail: boolean;
    ticketAssignedWhatsapp: boolean;
  }) => void;
}

function NotificationSettingsForm({ board, onSave }: NotificationSettingsFormProps) {
  const { t } = useTranslation();
  const [s, setS] = useState({
    ticketCreatedEmail: board.ticketCreatedEmail || false,
    ticketCreatedWhatsapp: board.ticketCreatedWhatsapp || false,
    ticketAssignedEmail: board.ticketAssignedEmail || false,
    ticketAssignedWhatsapp: board.ticketAssignedWhatsapp || false,
  });

  const set = (k: keyof typeof s) => (v: boolean) => setS((prev) => ({ ...prev, [k]: v }));

  const Row = ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between py-2.5">
      <span className="font-body text-sm font-bold text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <div className="max-w-xl">
      <div className="mb-1 font-display text-sm font-extrabold text-foreground">
        {t("Notification Recipients")}
      </div>
      <div className="mb-3 font-body text-xs leading-snug text-muted-foreground">
        {t("Select users who should receive notifications")}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3.5 py-3">
        <Users size={15} className="text-muted-foreground" strokeWidth={1.75} />
        <span className="font-body text-sm text-muted-foreground">
          {t("User selection coming soon")}
        </span>
      </div>

      <div className="my-4 h-px bg-border" />

      <div className="mb-1 font-display text-sm font-extrabold text-foreground">
        {t("Ticket Creation")}
      </div>
      <div className="mb-3 font-body text-xs leading-snug text-muted-foreground">
        {t("Notifications to send when a new ticket is created")}
      </div>
      <Row
        label={t("Send email notification")}
        checked={s.ticketCreatedEmail}
        onChange={set("ticketCreatedEmail")}
      />
      <Row
        label={t("Send WhatsApp notification (when session is available)")}
        checked={s.ticketCreatedWhatsapp}
        onChange={set("ticketCreatedWhatsapp")}
      />

      <div className="my-4 h-px bg-border" />

      <div className="mb-1 font-display text-sm font-extrabold text-foreground">
        {t("Ticket Assignment")}
      </div>
      <div className="mb-3 font-body text-xs leading-snug text-muted-foreground">
        {t(
          "Notifications are sent when a ticket is assigned to a user, and the notification is sent to the assigned user.",
        )}
      </div>
      <Row
        label={t("Send email notification")}
        checked={s.ticketAssignedEmail}
        onChange={set("ticketAssignedEmail")}
      />
      <Row
        label={t("Send WhatsApp notification")}
        checked={s.ticketAssignedWhatsapp}
        onChange={set("ticketAssignedWhatsapp")}
      />

      <div className="mt-6 flex justify-end">
        <Button size="sm" onClick={() => onSave(s)}>
          <Bell size={14} strokeWidth={2} className="mr-1.5" /> {t("Save Notification Settings")}
        </Button>
      </div>
    </div>
  );
}

type Panel = "grid" | "delete" | "notifications";

export default function TicketSettings({
  selectedBoard,
  onClose,
  onSaveColumns,
}: Readonly<{
  boardId: string;
  selectedBoard: Board;
  teamOptions: { value: string; label: string }[];
  onClose?: () => void;
  onSaveColumns?: (newColumns: any[], deletedIds: string[]) => void;
}>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel>("grid");
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [isManageLabelsOpen, setIsManageLabelsOpen] = useState(false);
  const [isBoardDetailsOpen, setIsBoardDetailsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const updateBoardMutation = useUpdateBoardMutation();
  const { deleteBoard, isDeleteBoardLoading } = useBoardQueries(false);

  const TITLES: Record<Panel, { title: string; sub: string }> = {
    grid: { title: t("Board Settings"), sub: t("Configure how this board looks and behaves.") },
    delete: { title: t("Delete Board"), sub: t("Permanently remove this board.") },
    notifications: {
      title: t("Notification Settings"),
      sub: t("Control who gets notified and how."),
    },
  };

  const handleSaveDetails = (patch: { title: string; description: string }) => {
    updateBoardMutation.mutate({
      id: selectedBoard.id,
      ...patch,
      // Pass required fields from the existing board to satisfy the API schema
      teamIds: selectedBoard.teams?.map((t) => t.teamId) || [],
      ticketCreatedWhatsapp: selectedBoard.ticketCreatedWhatsapp || false,
    });
    setIsBoardDetailsOpen(false);
  };

  const handleDeleteBoard = () => {
    deleteBoard(selectedBoard.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        if (onClose) onClose();
        navigate({ to: "/dashboard/tickets" });
      },
    });
  };

  const handleSaveNotifications = (settings: {
    ticketCreatedEmail: boolean;
    ticketCreatedWhatsapp: boolean;
    ticketAssignedEmail: boolean;
    ticketAssignedWhatsapp: boolean;
  }) => {
    updateBoardMutation.mutate({
      id: selectedBoard.id,
      title: selectedBoard.title, // required
      teamIds: selectedBoard.teams?.map((t) => t.teamId) || [], // required
      ...settings,
    });
    setPanel("grid");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="flex max-h-[84vh] w-full max-w-2xl sm:max-w-2xl flex-col rounded-2xl bg-background p-6">
        <DialogTitle className="sr-only">{t("Board Settings")}</DialogTitle>
        <div className="mb-5 flex items-center gap-3">
          {panel !== "grid" && (
            <button
              onClick={() => setPanel("grid")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-none bg-secondary text-muted-foreground cursor-pointer transition-colors hover:bg-secondary/80 hover:text-foreground"
            >
              <ChevronLeft size={15} strokeWidth={2.5} />
            </button>
          )}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings size={20} />
          </div>
          <div className="flex-1">
            <div className="font-display text-xl font-extrabold text-foreground">
              {TITLES[panel].title}
            </div>
            <div className="font-body text-sm text-muted-foreground">{TITLES[panel].sub}</div>
          </div>
        </div>

        <div className="overflow-y-auto pr-0.5">
          {panel === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SettingsFeatureCard
                icon={LayoutGrid}
                color="#1C518E"
                title={t("Board Details")}
                desc={t("Rename the board or update its description.")}
                actionLabel={t("Edit details")}
                onAction={() => setIsBoardDetailsOpen(true)}
              />
              <SettingsFeatureCard
                icon={Columns}
                color="#F8951D"
                title={t("Manage Columns")}
                desc={t("Add, reorder, rename or recolor the workflow columns.")}
                actionLabel={t("Manage columns")}
                onAction={() => setIsManageColumnsOpen(true)}
              />
              <SettingsFeatureCard
                icon={Bell}
                color="#5B21B6"
                title={t("Notifications")}
                desc={t("Choose when to send email or WhatsApp alerts for ticket activity.")}
                actionLabel={t("Manage notifications")}
                onAction={() => setPanel("notifications")}
              />
              <SettingsFeatureCard
                icon={Tag}
                color="#10B981"
                title={t("Manage Labels")}
                desc={t("Create, edit or delete labels available on this board.")}
                actionLabel={t("Manage labels")}
                onAction={() => setIsManageLabelsOpen(true)}
              />
              <SettingsFeatureCard
                icon={Trash2}
                color="#DC2626"
                title={t("Delete Board")}
                danger
                desc={t("Permanently delete this board and everything in it.")}
                actionLabel={t("Delete board")}
                onAction={() => setIsDeleteDialogOpen(true)}
              />
            </div>
          )}
          {panel === "notifications" && (
            <NotificationSettingsForm board={selectedBoard} onSave={handleSaveNotifications} />
          )}
        </div>
      </DialogContent>

      {isManageColumnsOpen && (
        <ManageColumnsDialog
          columns={selectedBoard?.ticketColumns || []}
          onClose={() => setIsManageColumnsOpen(false)}
          onSave={onSaveColumns || (() => {})}
        />
      )}

      <ManageLabels
        boardId={selectedBoard.id}
        open={isManageLabelsOpen}
        onOpenChange={setIsManageLabelsOpen}
      />

      <BoardDetailsDialog
        board={selectedBoard}
        open={isBoardDetailsOpen}
        onClose={() => setIsBoardDetailsOpen(false)}
        onSave={handleSaveDetails}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Are you absolutely sure?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "This action cannot be undone. This will permanently delete the board and all its tickets.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleteBoardLoading}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={isDeleteBoardLoading}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteBoard();
              }}
            >
              {isDeleteBoardLoading ? t("Deleting...") : t("Delete Board")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
