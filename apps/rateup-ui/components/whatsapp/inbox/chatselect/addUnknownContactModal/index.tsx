"use client";

import { useEffect, useState } from "react";

import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconBrandWhatsapp } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import PhoneInputWithCountrySelect, {
  isValidPhoneNumber,
} from "react-phone-number-input";
import { toast } from "sonner";

import { ICreateContact } from "@/backend/campaign/contacts/contacts.api";
import { useCreateContactMutation } from "@/backend/campaign/contacts/contacts.query";
import { LifecycleInputs } from "@/components/Contacts/LifecycleSelector";
import SimpleModalLayout from "@/components/Modal/SimpleModalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importMethod } from "@/utils/enums";

import ActionButtonTrigger from "./actionButtonTrigger";
import CardTrigger from "./cardTrigger";

interface UnknownContactModalProps {
  phone: string;
  successCallback?: (contact: ContactsData) => void;
  triggerType?: "action_button" | "card";
}
export default function AddUnknownContactModal(
  props: UnknownContactModalProps,
) {
  const { successCallback, ...rest } = props;
  const [opened, { open, close: onClose }] = useDisclosure(false);
  const translations = useTranslations();

  return (
    <>
      {!props.triggerType || props.triggerType === "card" ? (
        <CardTrigger onClick={open} phone={props.phone} />
      ) : (
        <ActionButtonTrigger onClick={open} />
      )}

      {opened && (
        <SimpleModalLayout
          {...{
            opened,
            onClose,
            title: translations("Add New Contact"),
            centered: true,
            size: "md",
            withCloseButton: true,
          }}
        >
          <AddUnknownContactForm
            {...rest}
            successCallback={(data) => {
              successCallback(data);
              onClose();
            }}
          />
        </SimpleModalLayout>
      )}
    </>
  );
}

export const AddUnknownContactForm = (props: UnknownContactModalProps) => {
  const contactMutation = useCreateContactMutation();
  const [loading, setLoading] = useState(false);
  const translations = useTranslations();

  const form = useForm({
    initialValues: {
      name: "",
      phone: "",
      email: "",
      countryCode: "91",
      lifecycleId: "",
      source: importMethod.MANUAL,
    },
    validate: {
      name: (value) =>
        value && value.length ? null : translations("Name cannot be blank"),
      phone: (value) =>
        !value
          ? translations("Phone Number cannot be blank")
          : !isValidPhoneNumber(value)
            ? translations("Invalid phone number")
            : null,
      email: (value) =>
        !value
          ? null //
          : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
            ? null
            : translations("Invalid email address"),
    },
  });

  useEffect(() => {
    if (!props.phone) return;

    // If prop already includes +, use it; otherwise prefix +
    const normalized =
      typeof props.phone === "string" && props.phone.startsWith("+")
        ? props.phone
        : `+${props.phone}`;

    // Only set if different from current to avoid extra renders
    if (form.values.phone !== normalized) {
      form.setFieldValue("phone", normalized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.phone]);

  function onSubmit(values: ICreateContact) {
    setLoading(true);

    // Defensive: ensure phone is string, strip leading + if backend expects number without +
    const rawPhone = (values.phone ?? "") as string;
    const phoneToSend = rawPhone.replace(/^\+/, "");

    const payload: ICreateContact = {
      ...values,
      phone: phoneToSend,
    };

    contactMutation.mutate(payload, {
      onSuccess(data) {
        form.reset();
        form.resetDirty();
        toast.success("contact added");
        props.successCallback(data.data);
        setLoading(false);
      },
      onError(error) {
        toast.error("error adding contact");
        setLoading(false);
      },
    });
  }

  const nameError = form.errors.name;
  const phoneError = form.errors.phone;
  const emailError = form.errors.email;

  return (
    <div className="flex flex-col w-full gap-4">
      <form onSubmit={form.onSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Full name */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="fullName">
            {translations("Full Name")} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="fullName"
            placeholder="Enter contact name"
            {...form.getInputProps("name")}
          />
          {nameError && (
            <p className="text-xs text-red-500 mt-1">{nameError}</p>
          )}
        </div>

        {/* two-column row: WhatsApp + Email */}
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="whatsapp">
              {translations("WhatsApp Number")}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <PhoneInput
              international
              defaultCountry="IN"
              value={form.values.phone}
              onChange={(val) => form.setFieldValue("phone", val || "")}
              className="border-2 border-gray-200 focus:border-rateup-blue focus-within:ring-2 focus-within:ring-rateup-blue/20 rounded-md px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm bg-white [&>input]:border-0 [&>input]:focus:ring-0 [&>input]:focus:outline-none [&>input]:w-full"
            />
            {phoneError && (
              <p className="text-xs text-red-500 mt-1">{phoneError}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="email">{translations("Email Address")}</Label>
            <Input
              id="email"
              placeholder="contact@email.com"
              {...form.getInputProps("email")}
            />
            {emailError && (
              <p className="text-xs text-red-500 mt-1">{emailError}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="lifecycle">{translations("Lifecycle Stage")}</Label>
          <LifecycleInputs
            value={form.values.lifecycleId}
            onChange={(value) => form.setFieldValue("lifecycleId", value)}
            placeholder={"Enter lifecycle"}
            width={"100%"}
          />
        </div>
        <div className="w-full flex items-center justify-end gap-4">
          <Button
            type="submit"
            disabled={loading}
            className="bg-green-500 hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1 min-w-[12vw]"
          >
            <IconBrandWhatsapp color="white" size={28} />
            <span className="font-semibold">
              {loading
                ? translations("Please wait")
                : translations("Start Conversation")}
            </span>
          </Button>
        </div>
      </form>
    </div>
  );
};
