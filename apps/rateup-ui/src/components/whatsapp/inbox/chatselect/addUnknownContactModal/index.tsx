import { zodResolver } from "@hookform/resolvers/zod";
import { IconBrandWhatsapp, IconUserPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";
import { z } from "zod/v4";

import type { ICreateContact } from "@/backend/campaign/contacts/contacts.api";
import { useCreateContactMutation } from "@/backend/campaign/contacts/contacts.query";
import { LifecycleSelector } from "@/components/Contacts/LifecycleSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
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
              {translations("Message")}{" "}
              <span className="font-semibold text-foreground">{props.phone}</span>{" "}
              {translations("on Whatsap?")}
            </p>
          </div>
          <Button onClick={() => setOpen(true)} size="sm" className="w-full">
            {translations("Add and Message")}
          </Button>
        </div>
      ) : (
        <Button
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
  email: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => {
      if (!val) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }, "Invalid email address"),
  countryCode: z.string(),
  lifecycleId: z.string().optional(),
  source: z.string(),
});

type AddContactFormValues = z.infer<typeof addContactSchema>;

export const AddUnknownContactForm = (props: UnknownContactModalProps) => {
  const contactMutation = useCreateContactMutation();
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
      email: "",
      countryCode: "91",
      lifecycleId: "",
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

    const payload: ICreateContact & { countryCode?: string; lifecycleId?: string } = {
      name: values.name,
      phone: phoneToSend,
      email: values.email || undefined,
      countryCode: values.countryCode,
      lifecycleId: values.lifecycleId || undefined,
      source: values.source as any,
    };

    contactMutation.mutate(payload, {
      onSuccess(data) {
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
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Full name */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="fullName">
            {translations("Full Name")} <span className="text-red-500">*</span>
          </Label>
          <Input id="fullName" placeholder="Enter contact name" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>

        {/* two-column row: WhatsApp + Email */}
        <div className="flex items-start justify-center gap-4">
          <div className="flex flex-col gap-1 flex-1">
            <Label htmlFor="whatsapp">
              {translations("WhatsApp Number")} <span className="text-red-500">*</span>
            </Label>
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
                  className="border border-input focus-within:ring-1 focus-within:ring-ring focus-within:border-ring rounded-md px-3 py-1.5 text-xs sm:text-sm bg-background [&>input]:border-0 [&>input]:focus:ring-0 [&>input]:focus:outline-none [&>input]:w-full bg-white [&>input]:bg-white dark:bg-zinc-950 dark:[&>input]:bg-zinc-950"
                />
              )}
            />
            {errors.phone && (
              <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1 flex-1">
            <Label htmlFor="email">{translations("Email Address")}</Label>
            <Input id="email" placeholder="contact@email.com" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="lifecycle">{translations("Lifecycle Stage")}</Label>
          <Controller
            name="lifecycleId"
            control={control}
            render={({ field }) => (
              <LifecycleSelector
                value={field.value}
                onChange={field.onChange}
                placeholder={"Enter lifecycle"}
                className="w-full"
              />
            )}
          />
        </div>

        <div className="w-full flex items-center justify-end gap-4 mt-2">
          <Button
            type="submit"
            disabled={loading || !isValid}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1.5 min-w-[12vw] text-white"
          >
            <IconBrandWhatsapp color="white" size={28} />
            <span className="font-semibold">
              {loading ? translations("Please wait..") : translations("Start Conversation")}
            </span>
          </Button>
        </div>
      </form>
    </div>
  );
};
