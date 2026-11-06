import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@rateup/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rateup/ui/components/dialog";
import { Spinner } from "@rateup/ui/components/spinner";
import { IconCircleCheck, IconUserPlus } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useCreateContactMutation,
  useEditContactMutation,
} from "@/backend/campaign/contacts/contacts.query";
import {
  addContactIdentity,
  removeContactIdentity,
  updateContactIdentity,
  type ContactIdentityOverview,
} from "@/backend/campaign/contacts/merge.api";
import { useContactIdentityOverview } from "@/backend/campaign/contacts/merge.query";
import {
  useAssignContactStageMutation,
  useContactStageQuery,
} from "@/backend/pipeline/pipeline.query";
import { usePipelineStages } from "@/components/pipeline/shared/StageSelector.tsx";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext.tsx";
import type { RequestPayload } from "@/types/api.ts";
import { ContactGroupType } from "@/types/enums.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { ContactAvatar } from "../ui/contact-avatar.tsx";
import { FieldError } from "../ui/field.tsx";
import {
  buildContactSchema,
  type ContactFormValues,
  type ContactInitialValues,
  realPhone,
  toFormValues,
} from "./contact-form-schema.ts";
import ContactForm from "./ContactForm.tsx";
import { normalizeIdentity, planIdentityChanges } from "./identityChanges.ts";

/** A saved contact's phones or emails as form rows, main first; one empty row when none. */
function identityRows(overview: ContactIdentityOverview | undefined, kind: "PHONE" | "EMAIL") {
  const all = overview
    ? overview.identities.length
      ? overview.identities
      : overview.legacyIdentities
    : [];
  const rows = all
    .filter((identity) => identity.kind === kind)
    .sort((a, b) => Number(!!b.isPrimary) - Number(!!a.isPrimary))
    .map((identity) => ({
      ...(identity.id ? { id: identity.id } : {}),
      value: kind === "PHONE" ? `+${identity.value}` : identity.value,
    }));
  return rows.length ? rows : [{ value: "" }];
}

/**
 * Makes the contact's phones or emails match the edited list: edits, then additions, then
 * the main one, then removals (last, so the contact is never left with nothing). Stops at
 * the first refusal, which the caller shows.
 */
async function saveIdentityList(
  contactId: string,
  kind: "PHONE" | "EMAIL",
  overview: ContactIdentityOverview | undefined,
  rows: ContactFormValues["phones"],
) {
  const saved = (overview?.identities ?? []).flatMap((identity) =>
    identity.kind === kind && identity.id
      ? [{ id: identity.id, value: identity.value, isPrimary: identity.isPrimary }]
      : [],
  );
  const plan = planIdentityChanges(kind, saved, rows);
  for (const change of plan.update) {
    await updateContactIdentity(contactId, change.id, { value: change.value });
  }
  const addedIds = new Map<string, string>();
  for (const value of plan.add) {
    const { identityId } = await addContactIdentity(contactId, { kind, value });
    addedIds.set(value, identityId);
  }
  const mainId = plan.main
    ? "id" in plan.main
      ? plan.main.id
      : addedIds.get(plan.main.value)
    : undefined;
  if (mainId) await updateContactIdentity(contactId, mainId, { isPrimary: true });
  for (const identityId of plan.remove) {
    await removeContactIdentity(contactId, identityId);
  }
}
import { getSourceBadge } from "./utils/utils.tsx";

/**
 * react-hook-form nests errors (custom fields arrive as an array), so pull every message out of
 * the tree for the submit-time summary. `ref` holds a DOM node, so it must not be walked.
 */
const collectErrorMessages = (node: unknown, messages: string[] = []): string[] => {
  if (!node || typeof node !== "object") return messages;
  const { message } = node as { message?: unknown };
  if (typeof message === "string" && message) messages.push(message);
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key !== "ref" && value && typeof value === "object") collectErrorMessages(value, messages);
  }
  return messages;
};

/**
 * The caller-supplied "create contacts" mutation (`useAddNewContactMutation`, which posts to a
 * contact group). Only the members this modal touches are declared, so any react-query mutation
 * over a contact payload satisfies it.
 */
export interface CreateContactsMutation {
  mutate(contacts: RequestPayload, options?: MutationCallbacks): void;
  isPending: boolean;
}

/** The subset of react-query's per-call `MutateOptions` these modals pass. */
export interface MutationCallbacks {
  onSuccess?: () => void;
  onError?: () => void;
  onSettled?: () => void;
}

const CreateOrEditContactModal = ({
  opened,
  setOpened,
  initialValues,
  type = ContactGroupType.NORMAL,
  createNewContactMutation,
  onSaved,
}: {
  opened: boolean;
  setOpened: (value: boolean) => void;
  initialValues?: ContactInitialValues;
  type?: ContactGroupType;
  createNewContactMutation?: CreateContactsMutation;
  /** After an edit saves, with what was written — for a screen holding its own copy. */
  onSaved?: (contact: { id: string; name: string; phone: string; email: string }) => void;
}) => {
  const { t } = useTranslation();
  const { customFields } = useCustomFieldsContext();
  const createContactMutation = useCreateContactMutation();
  const editContactMutation = useEditContactMutation();
  const contactSchema = useMemo(() => buildContactSchema(t, customFields), [t, customFields]);
  const queryClient = useQueryClient();
  // Editing lists every phone and email the contact is known by, not only the main ones.
  const editingId = initialValues?.id;
  const { data: identityOverview } = useContactIdentityOverview(editingId, opened && !!editingId);
  const [savingIdentities, setSavingIdentities] = useState(false);

  // The stage lives on a lead, not on the contact row, so it is fetched and
  // written separately from the rest of the form.
  const stages = usePipelineStages();
  const assignStage = useAssignContactStageMutation();
  const { data: contactStage } = useContactStageQuery(initialValues?.id, stages.length > 0);
  // Every custom field is shown here, so all of them are always "selected".
  const withAllCustomFields = (values: ContactFormValues): ContactFormValues => ({
    ...values,
    contactType: customFields.map((field) => field.slug),
  });
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: withAllCustomFields(toFormValues(initialValues, customFields)),
  });

  /**
   * Writes the picked stage once the contact exists. Only ever adds or moves:
   * emptying the field leaves an existing lead alone, since taking a contact off
   * the board deletes the lead and everything on it, and that needs the
   * confirmation the inbox panel and the board carry.
   */
  function applyStage(contactId: string | undefined, stageId: string) {
    if (!contactId || !stageId || stageId === contactStage?.stageId) return;
    assignStage.mutate({ contactId, stageId });
  }

  const handleSubmit = form.handleSubmit((values) => {
    const { multiIdentity: _multi, phones: _phones, emails: _emails, ...fields } = values;
    const contactData = {
      ...fields,
      dob: values.dob ? new Date(values.dob).toISOString() : null,
      external_id: values.external_id || undefined,
      // "No lifecycle" is "" in the form but a uuid column in the API; null is how it's cleared.
      lifecycleId: values.lifecycleId || null,
      // An Instagram/Messenger contact whose `phone` holds its platform id shows an empty
      // phone field; left empty, that column is left as it is rather than wiped.
      phone:
        values.phone?.replace(/^\+/, "") ||
        (initialValues?.id && initialValues.phone && !realPhone(initialValues) ? undefined : ""),
      source: type === ContactGroupType.LOYALTY ? ContactGroupType.LOYALTY : values.source,
      lastReceivedMessageTimeStamp: undefined as string | undefined,
    };
    // Edit mode is keyed on the contact's id; a draft without one takes the create path below.
    if (editingId) {
      // Phones and emails go through the identity API (which keeps the contact's main
      // phone/email columns in step); the external id only when it was typed in here.
      const editData = {
        ...contactData,
        phone: undefined,
        email: undefined,
        external_id: form.formState.dirtyFields.external_id ? contactData.external_id : undefined,
      };
      void (async () => {
        setSavingIdentities(true);
        try {
          await saveIdentityList(editingId, "PHONE", identityOverview, values.phones);
          await saveIdentityList(editingId, "EMAIL", identityOverview, values.emails);
        } catch (error) {
          toast.error(getApiErrorMessage(error, t("Could not save the phone numbers and emails")));
          return;
        } finally {
          setSavingIdentities(false);
          void queryClient.invalidateQueries({ queryKey: ["contactMerge"] });
        }
        editContactMutation.mutate(
          { data: editData, contactId: editingId },
          {
            onSuccess: () => {
              applyStage(editingId, values.stageId);
              const mainPhone = values.phones.find((row) => row.value)?.value ?? "";
              onSaved?.({
                id: editingId,
                name: contactData.name,
                phone: normalizeIdentity("PHONE", mainPhone),
                email: values.emails.find((row) => row.value)?.value.trim() ?? "",
              });
              setOpened(false);
              form.reset();
            },
          },
        );
      })();
      return;
    }
    if (createNewContactMutation) {
      createNewContactMutation.mutate([contactData], {
        onSuccess: () => {
          setOpened(false);
          form.reset();
          toast.success("contact added successfully");
        },
      });
      return;
    }
    createContactMutation.mutate(contactData, {
      onSuccess: (created) => {
        applyStage(created?.data?.id, values.stageId);
        setOpened(false);
        form.reset();
        toast.success("contact added successfully");
      },
      onError: (error) => {
        toast.error(error?.message || "Error in adding contact");
      },
    });
  });

  // Callers rebuild `initialValues` on every render, so it is left out of the deps: resetting
  // on its identity would wipe the user's edits whenever the contacts list refetches.
  useEffect(() => {
    if (!opened) return;
    form.reset(
      withAllCustomFields({
        ...toFormValues(initialValues, customFields),
        stageId: contactStage?.stageId ?? "",
        multiIdentity: !!editingId,
        phones: editingId ? identityRows(identityOverview, "PHONE") : [],
        emails: editingId ? identityRows(identityOverview, "EMAIL") : [],
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, initialValues?.id, customFields, form]);

  // The identities may arrive after the form opened; fill the lists then, unless the user has
  // already started editing them.
  useEffect(() => {
    if (!opened || !editingId || !identityOverview) return;
    if (!form.getFieldState("phones").isDirty) {
      form.setValue("phones", identityRows(identityOverview, "PHONE"), { shouldDirty: false });
    }
    if (!form.getFieldState("emails").isDirty) {
      form.setValue("emails", identityRows(identityOverview, "EMAIL"), { shouldDirty: false });
    }
  }, [opened, editingId, identityOverview, form]);

  // The board is fetched after the form mounts, so the current column is seeded
  // here rather than in `defaultValues`.
  useEffect(() => {
    form.setValue("stageId", contactStage?.stageId ?? "");
  }, [contactStage?.stageId, form]);

  const { errors, isSubmitted } = form.formState;
  const errorMessages = useMemo(() => [...new Set(collectErrorMessages(errors))], [errors]);
  const showErrorSummary = isSubmitted && errorMessages.length > 0;

  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      {/* Below `sm` the dialog keeps DialogContent's responsive max-width; a hard min-width here
          would overflow a 320px viewport. */}
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!initialValues && (
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-blue-600 flex items-center justify-center">
                <IconUserPlus className="w-4 h-4 text-white" />
              </div>
            )}
            {initialValues ? t("Edit Contact") : t("Add Contact")}
          </DialogTitle>
          <DialogDescription>
            {initialValues
              ? t("Update contact information and preferences")
              : t("Fill the details and click save.")}
          </DialogDescription>
        </DialogHeader>
        {initialValues && (
          <div className="flex items-center gap-3 pb-3 border-b">
            <ContactAvatar
              name={initialValues.name || initialValues.phone}
              src={initialValues.profilePic}
              size="lg"
            />
            <div className="flex-1">
              <p className="font-medium">{initialValues.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {getSourceBadge(initialValues.source)}
              </div>
            </div>
          </div>
        )}
        <div className="-mx-6 flex max-h-[65vh] flex-col gap-4 overflow-y-auto px-6 py-1">
          {showErrorSummary && (
            <FieldError className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
              <p className="font-medium">{t("Fix the following before saving:")}</p>
              <ul className="ml-4 mt-1 flex list-disc flex-col gap-1">
                {errorMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </FieldError>
          )}
          <ContactForm
            form={form}
            customFields={customFields}
            type={type}
            contactId={initialValues?.id}
          />
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="secondary" onClick={() => form.reset()} />}>
            <span className="text-sm font-normal">{t("Cancel")}</span>
          </DialogClose>
          <Button onClick={handleSubmit}>
            {createContactMutation.isPending ||
            createNewContactMutation?.isPending ||
            editContactMutation.isPending ||
            savingIdentities ? (
              <Spinner />
            ) : (
              <IconCircleCheck className="w-4 h-4 mr-2" />
            )}
            <span className="text-sm font-normal">{t("Save")}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrEditContactModal;
