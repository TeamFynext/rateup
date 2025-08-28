"use client";

import { useEffect, useState } from "react";

import {
  Box,
  Checkbox,
  Flex,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import PhoneInputWithCountrySelect, {
  isValidPhoneNumber,
} from "react-phone-number-input";

import { useEditContactMutation } from "../../backend/campaign/contacts/contacts.query";
import { SAVE_HOTKEY } from "../../utils/constants";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";

import "react-phone-number-input/style.css";

import { useTranslations } from "next-intl";

import styles from "./contact.module.css";

const EditContactModal = ({
  contact,
  closeEditModal,
  groupId,
  tags = [],
}: {
  contact: ContactsData;
  closeEditModal: () => void;
  groupId: string;
  tags: string[];
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [contactType, setContactType] = useState<string[]>([]);
  const translations = useTranslations();
  const form = useForm({
    initialValues: {
      ...contact,
      phone: "+" + contact?.phone,
    },
    validate: {
      phone: (value) =>
        !value
          ? translations("Phone Number cannot be blank")
          : !isValidPhoneNumber(value)
            ? translations("Invalid phone number")
            : null,
      tags: {},
      name: isNotEmpty(translations("Name cannot be blank")),
    },
  });
  const editContactMutation = useEditContactMutation(groupId);
  const handleSubmit = () => {
    const validation = form.validate();
    if (validation.hasErrors) {
      return;
    }
    setIsUpdating(true);
    form.values.phone = form.values.phone
      ? form.values.phone.slice(1)
      : undefined;
    const result = {};
    for (const key of contactType) {
      if (form.getValues()?.tags?.hasOwnProperty(key)) {
        result[key] = form.getValues()?.tags?.[key];
      }
    }
    form?.setFieldValue("tags", result);
    editContactMutation.mutate(
      { data: form.getValues(), contactId: contact?.id },
      {
        onSuccess: () => {
          setIsUpdating(false);
          closeEditModal();
          form.reset();
        },
        onError: () => {
          setIsUpdating(false);
          form.reset();
        },
      },
    );
  };

  useEffect(() => {
    setContactType([
      contact.phone ? "phone" : undefined,
      ...(tags?.filter((tag) => contact?.tags?.hasOwnProperty(tag)) ?? []),
    ]);
  }, []);

  return (
    <Box
      onKeyDown={getHotkeyHandler([
        [SAVE_HOTKEY, (event: any) => form.onSubmit(handleSubmit)(event)],
      ])}
    >
      <form>
        <SimpleGrid cols={2}>
          <TextInput
            label={translations("Name")}
            placeholder={translations("Enter name")}
            {...form.getInputProps("name")}
            size="md"
            radius={"md"}
            required
          />
          {tags?.length > 0 && (
            <Paper shadow="xl" p="md" px="xl">
              <Checkbox.Group value={contactType} onChange={setContactType}>
                <Group>
                  {tags?.map((data) => (
                    <Checkbox
                      value={data}
                      label={data}
                      key={data}
                      tt={"capitalize"}
                    />
                  ))}
                </Group>
              </Checkbox.Group>
            </Paper>
          )}

          {contactType.includes("phone") && (
            <Stack gap={0}>
              <Group gap={3}>
                <Text>{translations("Phone Number")}</Text>
                <Text c="red">*</Text>
              </Group>
              <Box
                className={`${styles["phone-input-container"]} ${form?.errors?.phone ? styles["phone-input-error"] : ""}`}
              >
                <PhoneInputWithCountrySelect
                  defaultCountry="IN"
                  international
                  countryCallingCodeEditable={false}
                  placeholder={translations("Enter phone number")}
                  {...form.getInputProps("phone")}
                  className={styles.inputPhone}
                />
                <Text size="sm" c={"red"}>
                  {form?.errors?.phone}
                </Text>
              </Box>
            </Stack>
          )}
          {contactType?.map(
            (data) =>
              data !== "phone" && (
                <TextInput
                  label={data}
                  placeholder={`Enter ${data}`}
                  {...form.getInputProps(`tags.${data}`)}
                  radius={"md"}
                  size="md"
                  required
                  key={data}
                />
              ),
          )}
        </SimpleGrid>
        <Flex justify={"flex-end"} gap={"sm"} mt={"sm"}>
          <RateupButtonSecondary
            title={translations("cancel")}
            onClick={closeEditModal}
          />
          <RateupButtonBlue
            title={translations("Save")}
            loading={isUpdating}
            onClick={handleSubmit}
          />
        </Flex>
      </form>
    </Box>
  );
};

export default EditContactModal;
