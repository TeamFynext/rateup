import {
  IconLink,
  IconLinkOff,
  IconRepeat,
  IconUserSearch,
  IconWriting,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "react-phone-number-input";

import { useContactByPhone } from "@/backend/campaign/contacts/contacts.query";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { useDebounce } from "@/hooks/use-debounce";
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
            "inline-flex items-center gap-1.5 rounded-full border px-2.75 py-1.5 text-xs font-bold transition-colors",
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

/**
 * A manually typed customer opens a lead with no `contactId` — a walk-in or a
 * phone enquiry that is not in the contact book. The board already draws that
 * state: `LeadCard` swaps the open-conversation button for an unlinked marker,
 * and `LeadDetailModal` flags the name in amber.
 *
 * Typing a number that *is* already a contact is the common case though — the
 * WhatsApp webhook creates a contact for every inbound sender — so the number
 * is looked up as it is typed and the lead can be linked to what is already
 * there. Nothing is created either way; linking is always the user's click.
 */
type CustomerMode = "manual" | "existing";

interface ManualCustomer {
  name: string;
  company: string;
  phone: string;
}

const EMPTY_MANUAL: ManualCustomer = { name: "", company: "", phone: "" };

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

  const [mode, setMode] = useState<CustomerMode>("manual");
  const [manual, setManual] = useState<ManualCustomer>(EMPTY_MANUAL);
  const [manualErrors, setManualErrors] = useState<Partial<ManualCustomer>>({});
  const [contact, setContact] = useState<PickedContact | null>(null);
  /** The contact a typed number was matched to, once the user accepted it. */
  const [linked, setLinked] = useState<PickedContact | null>(null);
  const [stageId, setStageId] = useState<string | null>(null);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [source, setSource] = useState<LeadSource>("WHATSAPP");
  const [saving, setSaving] = useState(false);

  // Reopening resets the form and honours whichever column launched it.
  useEffect(() => {
    if (!open) return;
    setMode("manual");
    setManual(EMPTY_MANUAL);
    setManualErrors({});
    setContact(null);
    setLinked(null);
    setStageId(defaultStageId ?? pipeline?.stages[0]?.id ?? null);
    setAssigneeIds([]);
    setSource("WHATSAPP");
    setSaving(false);
  }, [open, defaultStageId, pipeline]);

  const stage = pipeline?.stages.find((candidate) => candidate.id === stageId);

  const editManual = (patch: Partial<ManualCustomer>) => {
    setManual((current) => ({ ...current, ...patch }));
    // A different number is a different person; the old link no longer holds.
    if (patch.phone !== undefined) setLinked(null);
    setManualErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as Array<keyof ManualCustomer>) delete next[key];
      return next;
    });
  };

  const validateManual = () => {
    const errors: Partial<ManualCustomer> = {};
    if (!manual.name.trim()) errors.name = t("Enter a contact name.");
    // The number is optional — a walk-in may not have left one — but a number
    // that is typed in has to be dialable, since the lead carries it verbatim.
    if (manual.phone && !isValidPhoneNumber(manual.phone)) {
      errors.phone = t("That number doesn't look right.");
    }
    setManualErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const customerReady = mode === "existing" ? Boolean(contact) : Boolean(manual.name.trim());

  // Only look a number up once it is complete enough to mean one person.
  const lookupPhone =
    mode === "manual" && manual.phone && isValidPhoneNumber(manual.phone) ? manual.phone : null;
  const { match } = useContactByPhone(useDebounce(lookupPhone, 400));

  const linkTo = (found: PickedContact) => {
    setLinked(found);
    // The contact book's spelling of the name wins only when nothing was typed.
    if (!manual.name.trim()) editManual({ name: found.name });
  };

  const openLead = (
    customer: Pick<CreateLeadInput, "contactId" | "name" | "phone" | "email" | "company">,
  ) => {
    if (!pipeline || !stageId) return;

    // A lead carries its own copy of the customer's details either way, so the
    // board can draw a card without a second fetch. `contactId` is the extra
    // link a picked contact adds, and what the Inbox button keys off.
    const input: CreateLeadInput = {
      pipelineId: pipeline.id,
      stageId,
      ...customer,
      source,
      channel:
        source === "WHATSAPP" || source === "INSTAGRAM" || source === "MESSENGER" ? source : "NONE",
      assigneeIds,
    };

    createLead.mutate(input, {
      onSuccess: () => {
        setSaving(false);
        onOpenChange(false);
      },
      onError: () => setSaving(false),
    });
  };

  const submit = () => {
    if (!pipeline || !stageId) return;

    if (mode === "existing") {
      if (!contact) return;
      setSaving(true);
      openLead({
        contactId: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
      });
      return;
    }

    if (!validateManual()) return;
    setSaving(true);
    openLead({
      // Set only when the user accepted the match; a typed customer never
      // silently creates or attaches a contact.
      contactId: linked?.id ?? null,
      name: manual.name.trim(),
      // Company lives on the lead; the contact record has no such column.
      company: manual.company.trim() || null,
      phone: manual.phone ? manual.phone.replace(/^\+/, "") : null,
      email: linked?.email ?? null,
    });
  };

  const switchMode = (next: CustomerMode) => {
    setMode(next);
    setManualErrors({});
    // Each mode owns its own idea of the customer, so leaving one drops it —
    // including a link the abandoned number had picked up.
    setLinked(null);
    if (next === "manual") setContact(null);
    else setManual(EMPTY_MANUAL);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-nunito text-xl leading-tight font-bold tracking-[-0.01em]">
            {t("Add lead")}
          </DialogTitle>
          <DialogDescription>
            {t("New leads land on the board straight away, in the column you pick.")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <Label>{t("Customer")}</Label>
            <button
              type="button"
              onClick={() => switchMode(mode === "manual" ? "existing" : "manual")}
              className="text-primary inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
            >
              {mode === "manual" ? (
                <>
                  <IconUserSearch className="size-3.5" />
                  {t("Choose from contacts")}
                </>
              ) : (
                <>
                  <IconWriting className="size-3.5" />
                  {t("Enter details manually")}
                </>
              )}
            </button>
          </div>

          {mode === "existing" ? (
            <div className="sm:col-span-2">
              <ContactPicker value={contact} onChange={setContact} />
            </div>
          ) : (
            <>
              <div className="sm:col-span-2">
                <Field className="flex flex-col gap-1" data-invalid={Boolean(manualErrors.name)}>
                  <FieldLabel htmlFor="add-lead-name">{t("Contact name")}</FieldLabel>
                  <Input
                    id="add-lead-name"
                    placeholder={t("Ritu Bansal")}
                    value={manual.name}
                    onChange={(event) => editManual({ name: event.target.value })}
                    aria-invalid={Boolean(manualErrors.name)}
                  />
                  {manualErrors.name ? <FieldError>{manualErrors.name}</FieldError> : null}
                </Field>
              </div>

              <Field className="flex flex-col gap-1">
                <FieldLabel htmlFor="add-lead-company">{t("Business / company")}</FieldLabel>
                <Input
                  id="add-lead-company"
                  placeholder={t("Optional")}
                  value={manual.company}
                  onChange={(event) => editManual({ company: event.target.value })}
                />
              </Field>

              <Field className="flex flex-col gap-1" data-invalid={Boolean(manualErrors.phone)}>
                <FieldLabel htmlFor="add-lead-phone">{t("WhatsApp number")}</FieldLabel>
                <PhoneInput
                  id="add-lead-phone"
                  defaultCountry="IN"
                  international
                  countryCallingCodeEditable={false}
                  placeholder={t("Enter phone number")}
                  value={manual.phone}
                  onChange={(value) => editManual({ phone: value ?? "" })}
                  aria-invalid={Boolean(manualErrors.phone)}
                  className="w-full"
                />
                {manualErrors.phone ? <FieldError>{manualErrors.phone}</FieldError> : null}
              </Field>

              {linked ? (
                <div className="bg-primary/8 text-primary flex items-center gap-2.5 rounded-md px-3.5 py-3 sm:col-span-2">
                  <IconLink className="size-4 shrink-0" />
                  <span className="flex-1 text-xs">
                    {t("Linked to {name} — the lead opens their conversation in Inbox.", {
                      name: linked.name,
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLinked(null)}
                    className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold hover:underline"
                  >
                    <IconLinkOff className="size-3.5" />
                    {t("Unlink")}
                  </button>
                </div>
              ) : match ? (
                <div className="flex items-center gap-2.5 rounded-md bg-amber-500/10 px-3.5 py-3 text-amber-700 sm:col-span-2 dark:text-amber-500">
                  <IconUserSearch className="size-4 shrink-0" />
                  <span className="flex-1 text-xs">
                    {t("{name} already has this number in your contacts.", { name: match.name })}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      linkTo({
                        id: match.id,
                        name: match.name,
                        phone: match.phone || null,
                        email: match.email || null,
                      })
                    }
                    className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold hover:underline"
                  >
                    <IconLink className="size-3.5" />
                    {t("Link this lead")}
                  </button>
                </div>
              ) : null}
            </>
          )}

          <div className="sm:col-span-2">
            <Label className="mb-2 block">{t("Lead stage")}</Label>
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

          {stage && stage.status !== "OPEN" ? (
            <div className="bg-primary/8 text-primary flex items-center gap-2.5 rounded-md px-3.5 py-3 sm:col-span-2">
              <IconRepeat className="size-4 shrink-0" />
              <span className="text-xs">
                {t("{stage} is a closing column — the lead opens already closed.", {
                  stage: stage.name,
                })}
              </span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={submit} disabled={!customerReady || !stageId || saving}>
            {t("Add lead")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
