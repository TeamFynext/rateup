"use client";

import { useEffect, useState } from "react";

import {
  ActionIcon,
  Avatar,
  Button,
  Checkbox,
  Divider,
  Group,
  Paper,
  ScrollAreaAutosize,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconClock, IconUser, IconX } from "@tabler/icons-react";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useTranslations } from "next-intl";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod/v4";

import { useEditContactMutation } from "@/backend/campaign/contacts/contacts.query";
import { LifecycleInput } from "@/components/Contacts/LifecycleSelector";
import PhoneInputWithCountry from "@/components/input/PhoneInputWithCountry";

interface WaInboxContactDetailsProps {
  contact: any;
  cTags: any;
}

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().refine((phone) => {
    if (!phone) return false;
    return isValidPhoneNumber(phone);
  }, "Please enter a valid phone number"),
  email: z.email("Invalid email").optional().or(z.literal("")),
  tags: z.any().optional(),
  other: z.string().optional(),
  lifecycleId: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function WaInboxContactDetails({
  contact,
  cTags,
}: WaInboxContactDetailsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const editContactMutation = useEditContactMutation(null);

  const form = useForm<ContactFormValues>({
    validate: zod4Resolver(contactSchema),
    initialValues: {
      name: contact?.name || "",
      phone: "+" + contact?.phone || "",
      email: contact?.email || "",
      tags: contact?.tags || {},
      other: contact?.other || "",
      lifecycleId: contact?.lifecycleId || "",
    },
  });

  const t = useTranslations();
  const [contactType, setContactType] = useState<string[]>([]);

  useEffect(() => {
    form.setValues({
      name: contact?.name || "",
      phone: "+" + contact?.phone || "",
      email: contact?.email || "",
      tags: contact?.tags || {},
      other: contact?.other || "",
      lifecycleId: contact?.lifecycleId || "",
    });
    setContactType(cTags || []);
  }, [contact]);

  const handleSubmit = async (values: ContactFormValues) => {
    let data = {
      ...values,
      phone: values.phone?.startsWith("+")
        ? values.phone.slice(1)
        : values.phone,
    };
    try {
      await editContactMutation.mutateAsync({
        contactId: contact.id,
        data,
      });
    } catch (error) {
      console.error("Error updating contact:", error);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // Icon-only view when closed
  if (!isOpen) {
    return (
      <Paper
        p="xs"
        style={{
          borderLeft: "1px solid #e9ecef",
        }}
      >
        <Stack gap="md" align="center" style={{ flex: 1 }}>
          <ActionIcon
            variant="outline"
            size="md"
            onClick={handleToggle}
            title={t("Open Contact Details")}
            color="black"
            radius={"md"}
          >
            <IconUser size="1.2rem" />
          </ActionIcon>

          <ActionIcon
            variant="outline"
            size="md"
            title={t("Recent Activity")}
            color="black"
            radius={"md"}
            disabled
          >
            <IconClock size="1.2rem" />
          </ActionIcon>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper p="md" style={{ borderLeft: "1px solid #e9ecef" }} w={320}>
      <Group justify="space-between" mb="md">
        <Title order={4}>{t("Contact Details")}</Title>
        <ActionIcon variant="subtle" onClick={handleToggle}>
          <IconX size="1rem" />
        </ActionIcon>
      </Group>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <ScrollAreaAutosize mah={600} pr={1}>
            <Stack gap="md">
              <Group justify="center">
                <Avatar
                  src={contact?.profilePic}
                  size="xl"
                  radius="50%"
                  name={contact?.name || contact?.phone}
                  color="initials"
                />
              </Group>

              <Stack gap="sm">
                <div>
                  <TextInput
                    label={t("Name")}
                    placeholder={t("Enter name")}
                    {...form.getInputProps("name")}
                  />
                </div>

                <div>
                  <Text size="sm" mb={3}>
                    {t("Phone")}
                  </Text>
                  <PhoneInputWithCountry
                    defaultCountry="IN"
                    international
                    countryCallingCodeEditable={false}
                    value={form.values.phone}
                    onChange={(value) =>
                      form.setFieldValue("phone", value || "")
                    }
                    borderRadius={4}
                    placeholder={t("Enter the phone")}
                    error={form.errors.phone}
                  />
                </div>

                <div>
                  <TextInput
                    label={t("WhatsApp Username")}
                    placeholder={t("Enter WhatsApp username")}
                    readOnly
                    {...form.getInputProps("whatsappUserName")}
                  />
                </div>
                <TextInput
                  label={t("Email")}
                  placeholder={t("Enter email")}
                  {...form.getInputProps("email")}
                />
                <div>
                  <LifecycleInput
                    label={t("Lifecycle")}
                    value={form.values.lifecycleId}
                    onChange={(value) =>
                      form.setFieldValue("lifecycleId", value)
                    }
                    placeholder={t("Enter lifecycle")}
                    width={"100%"}
                  />
                </div>
                <TextInput
                  label={t("Other")}
                  placeholder={t("Enter other")}
                  {...form.getInputProps("other")}
                />

                <div>
                  {cTags?.length > 0 && (
                    <Paper p="xs" withBorder>
                      <Checkbox.Group
                        value={contactType}
                        onChange={setContactType}
                      >
                        <Group>
                          {cTags?.map((data) => (
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
                  {contactType?.map((data) => (
                    <TextInput
                      label={data}
                      placeholder={`Enter ${data}`}
                      onChange={(e) => {
                        const tagsObj = {
                          ...form.values.tags,
                          [data]: e.target.value,
                        };
                        form.setFieldValue("tags", tagsObj);
                      }}
                      value={form.values.tags ? form.values.tags?.[data] : ""}
                      radius={"md"}
                      size="md"
                      key={data}
                    />
                  ))}
                </div>
              </Stack>

              <Button
                type="submit"
                loading={editContactMutation.isPending}
                disabled={!form.isValid()}
              >
                {t("Save Changes")}
              </Button>

              <Divider />

              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  {t("Additional Info")}
                </Text>
                <Text size="sm">
                  {t("Status")}:{" "}
                  {contact?.blockedOnWhatsApp ? t("Blocked") : t("Active")}
                </Text>
                <Text size="sm">
                  {t("Source")}: {contact?.source || t("Unknown")}
                </Text>
                <Text size="sm">
                  {t("Consent")}:{" "}
                  {contact?.consent ? t("Given") : t("Not given")}
                </Text>
                <Text size="sm">
                  {t("AI Chat")}:{" "}
                  {contact?.aiWaChat ? t("Enabled") : t("Disabled")}
                </Text>
                <Text size="sm">
                  {t("Assignment Status")}:{" "}
                  {contact?.waMessageAssignStatus || t("Unknown")}
                </Text>
                <Text size="sm">
                  {t("Last seen")}:{" "}
                  {contact?.lastReceivedMessageTimeStamp
                    ? new Date(
                        contact.lastReceivedMessageTimeStamp,
                      ).toLocaleString()
                    : t("Unknown")}
                </Text>
              </Stack>

              <Divider />

              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  {t("Assigned Users")}
                </Text>
                {contact?.assignedUsers && contact.assignedUsers.length > 0 ? (
                  contact.assignedUsers.map((user, index) => (
                    <Text key={user.id} size="sm">
                      {user.name}
                    </Text>
                  ))
                ) : (
                  <Text size="sm">{t("No users assigned")}</Text>
                )}
              </Stack>
            </Stack>
          </ScrollAreaAutosize>
        </Stack>
      </form>
    </Paper>
  );
}
