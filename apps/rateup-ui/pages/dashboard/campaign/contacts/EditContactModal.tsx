import {
  Box,
  Checkbox,
  Flex,
  Group,
  Paper,
  SimpleGrid,
  TextInput,
} from "@mantine/core";
import { isEmail, isNotEmpty, useForm } from "@mantine/form";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../../components/Button/RateupButtons";
import { useState } from "react";
import { useEditContactMutation } from "../../../../backend/campaign/contacts/contacts.query";

const EditContactModal = ({ contact, closeEditModal, groupId }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [contactType, setContactType] = useState<string[]>(["phone", "email"]);

  const form = useForm({
    initialValues: contact,
    validate: {
      phone: (value) => {
        if (contactType.includes("phone") && value?.length) {
          return /^\d{10}$/g.test(value)
            ? null
            : "Must contain 10 numbers and only numbers";
        } else return null;
      },
      name: isNotEmpty("Name cannot be blank"),
      email: (value) =>
        contactType.includes("email") &&
        value?.length &&
        !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(value)
          ? "Invalid Email"
          : null,
    },
  });
  const editContactMutation = useEditContactMutation(groupId);
  const handleSubmit = () => {
    const validation = form.validate();
    if (validation.hasErrors) {
      return;
    }
    setIsUpdating(true);
    editContactMutation.mutate(
      { data: form.values, contactId: contact?.id },
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
  return (
    <Box>
      <form>
        <SimpleGrid cols={2}>
          <TextInput
            label="Name"
            placeholder="Enter customer name"
            {...form.getInputProps("name")}
            size="md"
            radius={"md"}
            required
          />
          <Paper shadow="xl" p="md" px="xl">
            <Checkbox.Group value={contactType} onChange={setContactType}>
              <Group>
                <Checkbox value="phone" label="Phone" />
                <Checkbox value="email" label="Email" />
              </Group>
            </Checkbox.Group>
          </Paper>
          {contactType.includes("phone") && (
            <TextInput
              label="Phone Number"
              placeholder="Enter phone number"
              {...form.getInputProps("phone")}
              size="md"
              radius={"md"}
            />
          )}
          {contactType.includes("email") && (
            <TextInput
              label="Email"
              placeholder="Enter email id"
              {...form.getInputProps("email")}
              size="md"
              radius={"md"}
            />
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
