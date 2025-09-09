"use client";

import React from "react";

import {
  ActionIcon,
  Avatar,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Popover,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronRight, IconUserPlus } from "@tabler/icons-react";

import { WaSendMessageBody } from "@/types/global";
import { useImportCSVContactMutation } from "@/backend/campaign/contacts/contacts.query";
import CreateContactModal from "@/components/Contacts/CreateContactModal";
import { importMethod } from "@/utils/enums";

const WaInboxContact = ({
  messageContent,
}: {
  messageContent: WaSendMessageBody["contacts"];
}) => {
  const contacts = [...messageContent];
  const [opened, { open, close }] = useDisclosure(false);
  if (contacts.length === 1) {
    return <Contact contact={contacts[0]} showAddtoContact={true} />;
  }

  return (
    <Stack pt={"xs"} gap={"xs"}>
      <Group gap={"xs"}>
        <Avatar size={"sm"} />
        <Text>
          {contacts[0].name
            ? contacts[0].name.formatted_name
            : contacts[0].phones[0].phone}{" "}
          and {contacts.length - 1} other contacts
        </Text>
      </Group>
      <Divider />
      <Button variant="transparent" onClick={open}>
        View All
      </Button>
      <Modal
        opened={opened}
        onClose={close}
        title={"All contacts"}
        centered
        zIndex={2}
      >
        {contacts?.map((contact, index) => (
          <>
            <Contact contact={contact} />
            {index + 1 !== contacts.length && <Divider />}
          </>
        ))}
      </Modal>
    </Stack>
  );
};

const Contact = ({
  contact,
  showAddtoContact = false,
}: {
  contact: WaSendMessageBody["contacts"][0];
  showAddtoContact?: boolean;
}) => {
  const [opened, { open, close }] = useDisclosure(false);
  const initialValues = {
    name: contact.name ? contact.name.formatted_name : "",
    phone: contact.phones[0].phone.trim().replaceAll(" ", ""),
    email: contact.emails?.[0]?.email ?? "",
    dob: contact.birthday,
    source: importMethod.MANUAL,
    contactType: [],
    tags: {},
    updateExisting: false,
    external_id: "",
  };
  const importCSVContactMutation = useImportCSVContactMutation();
  return (
    <Card p={0}>
      <Stack gap={"5px"} p={0}>
        <Group justify="space-between">
          <Group gap={"xs"} p={"5px"}>
            <Avatar size={"sm"} />
            <Text>
              {contact.name
                ? contact.name.formatted_name
                : contact.phones[0].phone}
            </Text>
          </Group>
          <Popover position="right" zIndex={2}>
            <Popover.Target>
              <ActionIcon variant="subtle">
                <IconChevronRight size={16} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <ContactInfo
                contact={contact}
                showAddtoContact={!showAddtoContact}
                open={open}
              />
            </Popover.Dropdown>
          </Popover>
        </Group>
        <Divider />
        {showAddtoContact && (
          <Button
            bd={0}
            variant="transparent"
            onClick={open}
            leftSection={<IconUserPlus size={16} />}
          >
            Add to contact
          </Button>
        )}
        <Modal
          onClose={close}
          opened={opened}
          title={"Add to contact"}
          size="xl"
          centered
          key={contact.phones[0].phone}
          zIndex={3}
        >
          <CreateContactModal
            initialValues={initialValues}
            close={close}
            contactClose={close}
            importCSVContactMutation={importCSVContactMutation}
          />
        </Modal>
      </Stack>
    </Card>
  );
};

const ContactInfo = ({
  contact,
  open,
  showAddtoContact = false,
}: {
  contact: WaSendMessageBody["contacts"][0];
  open?: () => void;
  showAddtoContact?: boolean;
}) => {
  return (
    <Stack gap={"xs"}>
      <Group justify="space-between">
        <Group gap={"xs"}>
          <Avatar size={"sm"} />
          <Text>
            {contact.name
              ? contact.name.formatted_name
              : contact.phones[0].phone}
          </Text>
        </Group>
        {showAddtoContact && (
          <Button
            bd={0}
            onClick={open}
            leftSection={<IconUserPlus size={16} />}
          >
            Add to contact
          </Button>
        )}
      </Group>
      {contact.emails?.map((email) => (
        <Stack gap={2}>
          <Text size="sm" c={"dimmed"}>
            {email.type}
          </Text>
          <Text size="sm">{email.email}</Text>
          <Divider />
        </Stack>
      ))}
      {contact.phones?.map((phone) => (
        <Stack gap={2}>
          <Text size="sm" c={"dimmed"}>
            {phone.type}
          </Text>
          <Text size="sm">{phone.phone}</Text>
          <Divider />
        </Stack>
      ))}
      {contact.addresses?.map((address) => (
        <Stack gap={2}>
          <Text size="sm" c={"dimmed"}>
            {address.type}
          </Text>
          <Text size="sm">{address.city}</Text>
          <Text size="sm">{address.country}</Text>
          <Divider />
        </Stack>
      ))}
    </Stack>
  );
};

export default WaInboxContact;
