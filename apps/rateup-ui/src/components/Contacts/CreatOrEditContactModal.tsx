import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, UserPlus } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useCreateContactMutation,
  useEditContactMutation,
} from "@/backend/campaign/contacts/contacts.query";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext.tsx";
import { ContactGroupType } from "@/types/enums.ts";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar.tsx";
import { Button } from "../ui/button.tsx";
import { Checkbox } from "../ui/checkbox.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Field, FieldError, FieldLabel } from "../ui/field.tsx";
import { Spinner } from "../ui/spinner.tsx";
import { getInitials } from "../ui/utils.ts";
import {
  buildContactSchema,
  type ContactFormValues,
  contactFormDefaults,
} from "./contact-form-schema.ts";
import ContactForm from "./ContactForm.tsx";
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

const CreateOrEditContactModal = ({
  opened,
  setOpened,
  initialValues,
  type = ContactGroupType.NORMAL,
  createNewContactMutation,
}: {
  opened: boolean;
  setOpened: (value: boolean) => void;
  initialValues?: any;
  type?: ContactGroupType;
  createNewContactMutation?: any;
}) => {
  const { t } = useTranslation();
  const { customFields = [] } = useCustomFieldsContext();
  const createContactMutation = useCreateContactMutation();
  const editContactMutation = useEditContactMutation();
  const contactSchema = useMemo(() => buildContactSchema(t, customFields), [t, customFields]);
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema) as any,
    defaultValues: {
      ...contactFormDefaults,
      contactType: customFields?.map((field) => field.slug) || [],
      ...initialValues,
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    const contactData = {
      ...values,
      dob: values.dob ? new Date(values.dob).toISOString() : null,
      external_id: values.external_id || undefined,
      phone: values.phone?.replace(/^\+/, "") || "",
      source: type === ContactGroupType.LOYALTY ? ContactGroupType.LOYALTY : values.source,
      lastReceivedMessageTimeStamp: undefined,
    };
    if (initialValues) {
      editContactMutation.mutate(
        { data: contactData, contactId: initialValues.id },
        {
          onSuccess: () => {
            setOpened(false);
            form.reset();
          },
        },
      );
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
      onSuccess: () => {
        setOpened(false);
        form.reset();
        toast.success("contact added successfully");
      },
      onError: (error) => {
        toast.error(error?.message || "Error in adding contact");
      },
    });
  });

  useEffect(() => {
    if (initialValues) {
      form.reset({ ...contactFormDefaults, ...initialValues, phone: "+" + initialValues.phone });
    }
  }, [initialValues, form]);

  useEffect(() => {
    form.setValue("contactType", customFields?.map((field) => field.slug) || []);
  }, [customFields, form]);

  const contactType = form.watch("contactType");
  const { errors, isSubmitted } = form.formState;
  const errorMessages = useMemo(() => [...new Set(collectErrorMessages(errors))], [errors]);
  const showErrorSummary = isSubmitted && errorMessages.length > 0;

  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      {/* Below `sm` the dialog keeps DialogContent's responsive max-width; a hard min-width here
          would overflow a 320px viewport. */}
      <DialogContent className="sm:min-w-125">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!initialValues && (
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-blue-600 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-white" />
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
            <Avatar className="w-16 h-16">
              <AvatarImage src={initialValues.profilePic} />
              <AvatarFallback className="bg-linear-to-br from-primary to-blue-600 text-white">
                {getInitials(initialValues.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{initialValues.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {getSourceBadge(initialValues.source)}
              </div>
            </div>
          </div>
        )}
        <Field className="max-h-[400px] overflow-y-auto p-1">
          {customFields?.length > 0 && (
            <Field className="border self-end p-1 w-fit">
              {customFields.map((field) => (
                <Field
                  key={field.id}
                  orientation="horizontal"
                  className="rounded-lg p-1 w-fit px-2"
                >
                  <Checkbox
                    checked={contactType?.includes(field?.slug)}
                    id={field.slug}
                    className="rounded-xl"
                    onCheckedChange={(checked) => {
                      form.setValue(
                        "contactType",
                        checked
                          ? [...contactType, field.slug]
                          : contactType.filter((slug) => field.slug !== slug),
                        { shouldDirty: true },
                      );
                    }}
                  />
                  <FieldLabel htmlFor={field.slug} className="text-sm font-normal">
                    {field.name}
                  </FieldLabel>
                </Field>
              ))}
            </Field>
          )}
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
          <ContactForm form={form} customFields={customFields} type={type} />
        </Field>
        <DialogFooter>
          <DialogClose render={<Button variant="secondary" onClick={() => form.reset()} />}>
            <span className="text-sm font-normal">{t("Cancel")}</span>
          </DialogClose>
          <Button onClick={handleSubmit}>
            {createContactMutation.isPending ||
            createNewContactMutation?.isPending ||
            editContactMutation.isPending ? (
              <Spinner />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            <span className="text-sm font-normal">{t("Save")}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrEditContactModal;
