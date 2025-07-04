"use client";

import { useEffect, useState } from "react";

import { Group, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import PhoneInputWithCountrySelect, {
  isValidPhoneNumber,
} from "react-phone-number-input";

import { ICreateContact } from "@/backend/campaign/contacts/contacts.api";
import { useCreateContactMutation } from "@/backend/campaign/contacts/contacts.query";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import SimpleModalLayout from "@/components/Modal/SimpleModalLayout";
import useTranslations from "@/dictionaries/useTranslation";
import { importMethod } from "@/utils/enums";

import ActionButtonTrigger from "./actionButtonTrigger";
import CardTrigger from "./cardTrigger";
import classes from "./styles.module.css";

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
  const { translations } = useTranslations();

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
            title: translations["Add New Contact"],
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
  const { translations } = useTranslations();
  useEffect(() => {
    if (props.phone) {
      form.setFieldValue("phone", "+" + form.values.countryCode + props.phone);
    }
  }, [props]);
  const form = useForm({
    initialValues: {
      name: "",
      phone: "",
      email: "",
      countryCode: "91",
      source: importMethod.MANUAL,
    },
    validate: {
      name: (value) =>
        value.length ? null : translations["Name cannot be blank"],
      phone: (value) =>
        !value
          ? translations["Phone Number cannot be blank"]
          : !isValidPhoneNumber(value)
            ? translations["Invalid phone number"]
            : null,
    },
  });

  function onSubmit(values: ICreateContact) {
    setLoading(true);
    values.phone = values.phone.slice(1);
    contactMutation.mutate(values, {
      onSuccess(data) {
        form.reset();
        form.resetDirty();
        props.successCallback(data.data);
        setLoading(false);
      },
      onError(error) {
        setLoading(false);
      },
    });
  }
  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap={5}>
        <ContainedTextField
          label={translations["Name"]}
          withAsterisk
          {...form.getInputProps("name")}
        />
        <Stack gap={0}>
          <Group gap={3}>
            <Text className={classes.inputLabel}>
              {translations["Phone Number"]}
            </Text>
            <Text c="red">*</Text>
          </Group>
          <PhoneInputWithCountrySelect
            international
            defaultCountry="IN"
            countryCallingCodeEditable={false}
            placeholder={translations["Enter phone number"]}
            className={classes.inputPhone}
            key={form.key("phone")}
            {...form.getInputProps("phone")}
          />
          <Text size="sm" c={"red"}>
            {form?.errors?.phone}
          </Text>
        </Stack>
        <ContainedTextField
          label={translations["Email"]}
          {...form.getInputProps("email")}
        />
        <Group>
          <RateupButtonSecondary
            title={translations["Cancel"]}
            variant="light"
          />
          <RateupButtonPrimary
            type={"submit"}
            title={translations["Add Contact"]}
            loading={loading}
          />
        </Group>
      </Stack>
    </form>
  );
};
