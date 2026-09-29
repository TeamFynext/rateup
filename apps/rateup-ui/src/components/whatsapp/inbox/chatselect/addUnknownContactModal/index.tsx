import { zodResolver } from "@hookform/resolvers/zod";
import { IconBrandWhatsapp, IconUserPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";
import { z } from "zod/v4";

import type { ICreateContact } from "@/backend/campaign/contacts/contacts.api";
import { useCreateContactMutation } from "@/backend/campaign/contacts/contacts.query";
import { useAssignContactStageMutation } from "@/backend/pipeline/pipeline.query";
import { StageSelector, usePipelineStages } from "@/components/pipeline/shared/StageSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { importMethod } from "@/utils/enums/index.ts";

interface UnknownContactModalProps {
  phone: string;
  successCallback?: (contact: ContactsData) => void;
  triggerType?: "action_button" | "card";
}

export default function AddUnknownContactModal(props: UnknownContactModalProps) {
  const { successCallback, ...rest } = props;
  const [open, setOpen] = useState(false);
  const { t: translations } = useTranslation();

  return (
    <>
      {!props.triggerType || props.triggerType === "card" ? (
        <div className="mx-3 p-4 border rounded-lg bg-card text-card-foreground shadow-xs flex flex-col gap-3">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{translations("This PhoneNumber is not in your contact list")}</p>
            <p>
              {translations("Message")}
              {""}
              <span className="font-semibold text-foreground">{props.phone}</span>
              {""}
              {translations("on Whatsap?")}
            </p>
          </div>
          <Button onClick={() => setOpen(true)} size="sm" className="w-full">
            {translations("Add and Message")}
          </Button>
        </div>
      ) : (
        <Button
          aria-label={translations("Add a member")}
          variant="secondary"
          size="icon"
          className="h-[30px] w-[30px] rounded-md"
          onClick={() => setOpen(true)}
        >
          <IconUserPlus size={16} />
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{translations("Add New Contact")}</DialogTitle>
          </DialogHeader>
          <AddUnknownContactForm
            {...rest}
            successCallback={(data) => {
              if (successCallback) successCallback(data);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

const addContactSchema = z.object({
  name: z.string().min(1, "Name cannot be blank"),
  phone: z.string().refine((phone) => {
    if (!phone) return false;
    return isValidPhoneNumber(phone);
  }, "Invalid phone number"),
  countryCode: z.string(),
  stageId: z.string().optional(),
  source: z.string(),
});

type AddContactFormValues = z.infer<typeof addContactSchema>;

export const AddUnknownContactForm = (props: UnknownContactModalProps) => {
  const contactMutation = useCreateContactMutation();
  const stages = usePipelineStages();
  const assignStage = useAssignContactStageMutation();
  const [loading, setLoading] = useState(false);
  const { t: translations } = useTranslation();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<AddContactFormValues>({
    resolver: zodResolver(addContactSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      phone: "",
      countryCode: "91",
      stageId: "",
      source: importMethod.MANUAL,
    },
  });

  useEffect(() => {
    if (!props.phone) return;

    const normalized =
      typeof props.phone === "string" && props.phone.startsWith("+")
        ? props.phone
        : `+${props.phone}`;

    setValue("phone", normalized, { shouldValidate: true });
  }, [props.phone, setValue]);

  function onSubmit(values: AddContactFormValues) {
    setLoading(true);

    const rawPhone = values.phone ?? "";
    const phoneToSend = rawPhone.replace(/^\+/, "");

    const payload: ICreateContact & { countryCode?: string } = {
      name: values.name,
      phone: phoneToSend,
      countryCode: values.countryCode,
      source: values.source,
    };

    contactMutation.mutate(payload, {
      onSuccess(data) {
        // The stage lives on a lead, so it can only be written once the contact
        // has an id. Leaving the field empty opens no lead.
        if (values.stageId) {
          assignStage.mutate({ contactId: data.data.id, stageId: values.stageId });
        }
        reset();
        toast.success("contact added");
        if (props.successCallback) props.successCallback(data.data);
        setLoading(false);
      },
      onError(error) {
        toast.error(error?.message || "error adding contact");
        setLoading(false);
      },
    });
  }

  return (
    <div className="flex flex-col w-full gap-4">
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="gap-4">
          {/* Full name */}
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="fullName">
              {translations("Full Name")} <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="fullName"
              placeholder="Enter contact name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="whatsapp">
              {translations("WhatsApp Number")} <span className="text-destructive">*</span>
            </FieldLabel>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  id="whatsapp"
                  international
                  defaultCountry="IN"
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={!!errors.phone}
                />
              )}
            />
            <FieldError errors={[errors.phone]} />
          </Field>

          {stages.length > 0 && (
            <Field>
              <FieldTitle>{translations("Lead stage")}</FieldTitle>
              <Controller
                name="stageId"
                control={control}
                render={({ field }) => (
                  <StageSelector
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    className="w-full"
                  />
                )}
              />
            </Field>
          )}

          <div className="w-full flex items-center justify-end gap-4 mt-2">
            <Button type="submit" disabled={!isValid} loading={loading}>
              <IconBrandWhatsapp data-icon="inline-start" />
              {translations("Add & start conversation")}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
};
