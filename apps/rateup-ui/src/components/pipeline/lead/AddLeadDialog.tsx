import { IconRepeat } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCreateLeadMutation } from "@/backend/pipeline/pipeline.query.tsx";
import type {
  CreateLeadInput,
  LeadSource,
  PipelineDetail,
  PipelineUser,
} from "@/backend/pipeline/pipeline.types.ts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { SOURCE_META } from "../pipeline.constants.tsx";
import { sourceLabel } from "../pipeline.labels.ts";
import { LeadAvatar } from "../shared/LeadAvatar.tsx";
import { ContactPicker, type PickedContact } from "./ContactPicker.tsx";

const SOURCES: LeadSource[] = [
  "WHATSAPP",
  "INSTAGRAM",
  "MESSENGER",
  "SURVEY",
  "REFERRAL",
  "LOYALTY",
  "MANUAL",
];

/** Pill-style single choice; used for stage, team and source. */
function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: Readonly<{
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
  value: T | null;
  onChange: (value: T) => void;
}>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
            option.value === value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: PipelineDetail | undefined;
  members: PipelineUser[];
  /** Stage the dialog opens on, when launched from a column's + button. */
  defaultStageId?: string;
}

export function AddLeadDialog({
  open,
  onOpenChange,
  pipeline,
  members,
  defaultStageId,
}: Readonly<AddLeadDialogProps>) {
  const { t } = useTranslation();
  const createLead = useCreateLeadMutation();

  const [contact, setContact] = useState<PickedContact | null>(null);
  const [stageId, setStageId] = useState<string | null>(null);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [source, setSource] = useState<LeadSource>("WHATSAPP");

  // Reopening resets the form and honours whichever column launched it.
  useEffect(() => {
    if (!open) return;
    setContact(null);
    setStageId(defaultStageId ?? pipeline?.stages[0]?.id ?? null);
    setAssigneeIds([]);
    setSource("WHATSAPP");
  }, [open, defaultStageId, pipeline]);

  const stage = pipeline?.stages.find((candidate) => candidate.id === stageId);

  const submit = () => {
    if (!pipeline || !stageId || !contact) return;

    // The lead copies the contact's details so the board can render a card
    // without a second fetch, but `contactId` is what actually links the two.
    const input: CreateLeadInput = {
      pipelineId: pipeline.id,
      stageId,
      contactId: contact.id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      source,
      channel:
        source === "WHATSAPP" || source === "INSTAGRAM" || source === "MESSENGER" ? source : "NONE",
      assigneeIds,
    };

    createLead.mutate(input, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-nunito font-extrabold">{t("Add lead")}</DialogTitle>
          <DialogDescription>
            {t(
              "New leads land on the board straight away and follow the stage's lifecycle mapping.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block">{t("Customer")}</Label>
            <ContactPicker value={contact} onChange={setContact} />
          </div>

          <div className="sm:col-span-2">
            <Label className="mb-2 block">{t("Stage")}</Label>
            <ChipGroup
              options={(pipeline?.stages ?? []).map((candidate) => ({
                value: candidate.id,
                label: candidate.name,
              }))}
              value={stageId}
              onChange={setStageId}
            />
          </div>

          <div className="sm:col-span-2">
            <Label className="mb-2 block">{t("Source")}</Label>
            <ChipGroup
              options={SOURCES.map((candidate) => {
                const SourceIcon = SOURCE_META[candidate].icon;
                return {
                  value: candidate,
                  label: sourceLabel(t, candidate),
                  icon: <SourceIcon className="size-3.5" />,
                };
              })}
              value={source}
              onChange={setSource}
            />
          </div>

          {members.length > 0 ? (
            <div className="sm:col-span-2">
              <Label className="mb-2 block">{t("Assignees")}</Label>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    title={member.name ?? t("Teammate")}
                    onClick={() =>
                      setAssigneeIds((current) =>
                        current.includes(member.id)
                          ? current.filter((id) => id !== member.id)
                          : [...current, member.id],
                      )
                    }
                    className={cn(
                      "rounded-full ring-2 transition-opacity",
                      assigneeIds.includes(member.id)
                        ? "ring-primary opacity-100"
                        : "ring-transparent opacity-60 hover:opacity-100",
                    )}
                  >
                    <LeadAvatar
                      name={member.name}
                      photo={member.profilePhoto}
                      colorKey={member.id}
                      tone="person"
                      size="lg"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {stage?.lifecycle ? (
            <div className="bg-primary/8 text-primary flex items-center gap-2.5 rounded-lg p-3 sm:col-span-2">
              <IconRepeat className="size-4 shrink-0" />
              <span className="text-xs">
                {t(
                  "{stage} maps to the {lifecycle} lifecycle — the contact's inbox lifecycle updates automatically.",
                  { stage: stage.name, lifecycle: stage.lifecycle.name },
                )}
              </span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={submit} disabled={!contact || !stageId || createLead.isPending}>
            {t("Add lead")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
