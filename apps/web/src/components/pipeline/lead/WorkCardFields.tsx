import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useUpdateLeadMutation } from "@/backend/pipeline/pipeline.query.tsx";
import type { LeadDetail } from "@/backend/pipeline/pipeline.types.ts";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";

import { FieldLabel } from "../shared/atoms.tsx";
import { submitOnEnter } from "../shared/submitOnEnter.ts";
import { ContactPicker } from "./ContactPicker.tsx";

/** The card's description, read in place and edited behind a click. */
export function CardDescription({ lead }: Readonly<{ lead: LeadDetail }>) {
  const { t } = useTranslation();
  const updateLead = useUpdateLeadMutation();
  const [draft, setDraft] = useState<string | null>(null);

  const save = () => {
    if (draft === null || updateLead.isPending) return;
    updateLead.mutate(
      { leadId: lead.id, input: { description: draft.trim() || null } },
      { onSuccess: () => setDraft(null) },
    );
  };

  return (
    <div className="mb-5">
      <FieldLabel>{t("Description")}</FieldLabel>
      {draft !== null ? (
        <div className="mt-1.5 flex flex-col gap-2">
          <Textarea
            autoFocus
            value={draft}
            maxLength={5000}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={submitOnEnter(save)}
            className="bg-background min-h-24"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              {t("Cancel")}
            </Button>
            <Button size="sm" onClick={save} loading={updateLead.isPending}>
              {t("Save")}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDraft(lead.description ?? "")}
          className="hover:bg-background -mx-1.5 mt-1 block w-[calc(100%+0.75rem)] rounded-md px-1.5 py-1 text-left text-[13.5px] whitespace-pre-wrap transition-colors"
        >
          {lead.description ? (
            <span className="text-foreground">{lead.description}</span>
          ) : (
            <span className="text-muted-foreground">{t("Add a description")}</span>
          )}
        </button>
      )}
    </div>
  );
}

export function CardDueDate({ lead }: Readonly<{ lead: LeadDetail }>) {
  const { t } = useTranslation();
  const updateLead = useUpdateLeadMutation();

  return (
    <div className="min-w-0">
      <FieldLabel>{t("Due date")}</FieldLabel>
      <DatePicker
        id="card-due-date"
        value={lead.expectedCloseAt ? new Date(lead.expectedCloseAt) : undefined}
        onChange={(date) =>
          updateLead.mutate({
            leadId: lead.id,
            input: { expectedCloseAt: date ? dayjs(date).endOf("day").toISOString() : null },
          })
        }
        placeholder={t("Not set")}
        disabled={false}
        endMonth={dayjs().add(5, "year").toDate()}
        className="mt-0.5 h-8 w-full text-[13px]"
      />
    </div>
  );
}

export function CardContact({ lead }: Readonly<{ lead: LeadDetail }>) {
  const { t } = useTranslation();
  const updateLead = useUpdateLeadMutation();

  return (
    <div className="col-span-2 min-w-0">
      <FieldLabel>{t("Contact")}</FieldLabel>
      <div className="mt-1">
        <ContactPicker
          value={
            lead.contact
              ? {
                  id: lead.contact.id,
                  name: lead.contact.name ?? lead.contact.phone ?? t("Contact"),
                  phone: lead.contact.phone,
                  email: null,
                }
              : null
          }
          onChange={(picked) =>
            updateLead.mutate({
              leadId: lead.id,
              input: picked
                ? { contactId: picked.id, phone: picked.phone, email: picked.email }
                : { contactId: null },
            })
          }
        />
      </div>
    </div>
  );
}
