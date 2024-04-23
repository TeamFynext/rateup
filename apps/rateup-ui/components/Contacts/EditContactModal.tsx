import {
  Box,
  Checkbox,
  Flex,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  TextInput,
  Text,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import { useEffect, useState } from "react";
import { useEditContactMutation } from "../../backend/campaign/contacts/contacts.query";
import { getHotkeyHandler } from "@mantine/hooks";
import { SAVE_HOTKEY } from "../../utils/constants";
import PhoneInputWithCountrySelect, {
  isValidPhoneNumber,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
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

  const form = useForm({
    initialValues: {
      ...contact,
      phone: "+" + contact?.phone,
    },
    validate: {
      phone: (value) => {
        if (contactType.includes("phone"))
          return !isValidPhoneNumber(value) ? "Invalid number" : null;
      },
      tags: {},
      name: isNotEmpty("Name cannot be blank"),
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
            label="Name"
            placeholder="Enter name"
            {...form.getInputProps("name")}
            size="md"
            radius={"md"}
            required
          />
          <Paper shadow="xl" p="md" px="xl">
            <Checkbox.Group value={contactType} onChange={setContactType}>
              <Group>
                <Checkbox value="phone" label="Phone" />
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

          {contactType.includes("phone") && (
            <Stack gap={0}>
              <Text>Phone Number</Text>
              <PhoneInputWithCountrySelect
                defaultCountry="IN"
                international
                countryCallingCodeEditable={false}
                placeholder="Enter phone number"
                {...form.getInputProps("phone")}
                className={styles.inputPhone}
              />
              <Text size="sm" c={"red"}>
                {form?.errors?.phone}
              </Text>
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
          <RateupButtonSecondary title="cancel" onClick={closeEditModal} />
          <RateupButtonBlue
            title="Edit contact"
            loading={isUpdating}
            onClick={handleSubmit}
          />
        </Flex>
      </form>
    </Box>
  );
};

export default EditContactModal;
