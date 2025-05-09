import React, { useEffect, useMemo, useState } from "react";

import {
  Avatar,
  Box,
  Checkbox,
  CloseButton,
  Divider,
  Flex,
  Group,
  Indicator,
  Loader,
  Popover,
  ScrollArea,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { RichTextEditor, useRichTextEditorContext } from "@mantine/tiptap";
import { IconAddressBook } from "@tabler/icons-react";

import { useContactGroup } from "@/backend/campaign/contactGroup/contactGroup.query";
import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import ContactPagination from "@/components/Contacts/ContactPagination";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import RateupLoader from "@/components/Loaders/RateupLoader";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { useMessageBodyStore } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter";
import useTranslations from "@/dictionaries/useTranslation";
import { PAGE_SIZE } from "@/utils/constants";

import classes from "./ContactSelect.module.css";

const InboxContactsControl = () => {
  const [opened, setOpened] = useState(false);

  const { body, setBody } = useMessageBodyStore();

  function handleSubmit(contacts) {
    setBody({ ...body, type: "contact", contacts });
    setOpened((o) => !o);
  }
  return (
    <Popover position="top" opened={opened} onChange={setOpened}>
      <Popover.Target>
        <Indicator
          inline
          size={16}
          position="top-end"
          disabled={
            !body.contacts.contactIds.length && !body.contacts.groupIds.length
          }
          label={`${body.contacts.contactIds.length} contacts, ${body.contacts.groupIds.length} groups selected`}
        >
          <RichTextEditor.Control
            title="Contacts"
            onClick={() => setOpened((o) => !o)}
          >
            <IconAddressBook size={16} />
          </RichTextEditor.Control>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown>
        <SelectContacts
          submitbtnTitle={"Next"}
          onSubmit={handleSubmit}
          onCancel={() => setOpened((o) => !o)}
          contactIds={body.contacts.contactIds}
          groupIds={body.contacts.groupIds}
        />
      </Popover.Dropdown>
    </Popover>
  );
};

enum ContactMethods {
  Individual = "Individual",
  Group = "Group",
}

const SelectContacts = ({
  submitbtnTitle,
  onSubmit,
  onCancel,
  contactIds = [],
  groupIds = [],
}) => {
  const { translations } = useTranslations();
  const [selectedTab, setSelectedTab] = useState(ContactMethods.Individual);
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const { data: contacts, isLoading } = useContacts(pagination, searchText);
  const { data: groups, isPending } = useContactGroup();
  let totalPageCount = (contacts?.totalCount ?? 1) / pagination.pageSize;

  function handleCancel() {
    setSelectedContactIds([]);
    setSelectedContactIds([]);
    onCancel();
  }

  function handleSubmit() {
    onSubmit({ contactIds: selectedContactIds, groupIds: selectedGroupIds });
  }

  useEffect(() => {
    if (contactIds) setSelectedContactIds(contactIds);
    if (groupIds) setSelectedGroupIds(groupIds);
  }, [contactIds, groupIds]);

  if (isLoading || isPending) return <RateupLoader />;

  return (
    <Stack w={350}>
      <Flex justify={"space-between"} gap={"md"}>
        <SegmentedControl
          data={Object.values(ContactMethods)}
          value={selectedTab}
          onChange={(value) => setSelectedTab(value as ContactMethods)}
          color={"var(--mantine-color-whatsapp-green-filled)"}
          radius={"md"}
          defaultValue={ContactMethods.Individual}
          tt={"capitalize"}
          miw={150}
          size="xs"
        />
        <Group gap={4}>
          <RateupButtonSecondary
            variant="light"
            title="Cancel"
            onClick={handleCancel}
            size="xs"
          />
          <RateupButtonPrimary
            title={submitbtnTitle}
            onClick={handleSubmit}
            size="xs"
          />
        </Group>
      </Flex>
      <ContainedTextField
        placeholder={`Search ${selectedTab?.toLowerCase()}`}
        defaultValue={searchText}
        onChange={(e) => setSearchText(e.currentTarget.value)}
        rightSection={
          <CloseButton
            aria-label="Clear input"
            onClick={() => setSearchText("")}
            display={searchText ? undefined : "none"}
            mr={"xs"}
          />
        }
        mah={40}
      />
      <Group justify="space-between" mb={4}>
        <Title order={6}>
          {translations["Select"]} {selectedTab?.toLowerCase()} (Max 100
          contacts/members)
        </Title>
      </Group>
      <ScrollArea
        h={selectedTab === ContactMethods.Individual ? 280 : 342}
        pr={"sm"}
      >
        <Tabs value={selectedTab} color="var(--tertiary-color)">
          <Tabs.Panel value={ContactMethods.Individual}>
            {contacts.users?.length > 0 ? (
              <Checkbox.Group
                value={selectedContactIds}
                onChange={setSelectedContactIds}
              >
                {contacts.users.map((contact) => {
                  return <ContactSelectCard contact={contact} />;
                })}
              </Checkbox.Group>
            ) : (
              <Text>{translations["No contacts found"]}</Text>
            )}
          </Tabs.Panel>
          <Tabs.Panel value={ContactMethods.Group}>
            {groups?.length > 0 ? (
              <Checkbox.Group
                value={selectedGroupIds}
                onChange={setSelectedGroupIds}
              >
                {groups.map((group) => (
                  <ContactGroupSelectCard group={group} />
                ))}
              </Checkbox.Group>
            ) : (
              <Text>{translations["No group found"]}</Text>
            )}
          </Tabs.Panel>
        </Tabs>
      </ScrollArea>
      {selectedTab === ContactMethods.Individual &&
        contacts?.users?.length > 0 && (
          <ContactPagination
            pagination={pagination}
            setPagination={setPagination}
            totalPageCount={totalPageCount}
          />
        )}
    </Stack>
  );
};

const ContactSelectCard = ({ contact }) => {
  if (!contact) return;
  return (
    <Checkbox.Card
      value={contact.id}
      key={contact.id}
      bd={0}
      className={classes["contact-card"]}
      p={"xs"}
    >
      <Group wrap="nowrap" justify="space-between">
        <Group gap={"sm"}>
          <Avatar name={contact.name} />
          <Stack gap={2}>
            <Text fw={500} size="sm">
              {contact.name}
            </Text>
            <Text size="xs" c={"dimmed"}>
              {contact.phone}
            </Text>
          </Stack>
        </Group>
        <Checkbox.Indicator />
      </Group>
    </Checkbox.Card>
  );
};

const ContactGroupSelectCard = ({ group }) => {
  if (!group) return;
  return (
    <Checkbox.Card value={group.id} key={group.id} bd={0}>
      <Group wrap="nowrap" justify="space-between">
        <Group gap={"sm"}>
          <Avatar name={group.name} />
          <Stack gap={2}>
            <Text fw={500} size="sm">
              {group.name}
            </Text>
            <Text size="xs" c={"dimmed"}>
              {group._count.contacts} members
            </Text>
          </Stack>
        </Group>
        <Checkbox.Indicator />
      </Group>
    </Checkbox.Card>
  );
};

export default InboxContactsControl;
