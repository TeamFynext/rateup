import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Box,
  Button,
  ColorInput,
  Flex,
  Group,
  Menu,
  rem,
  SegmentedControl,
  Stack,
  Tabs,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconSearch,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react";
import { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { useContactGroup } from "@/backend/campaign/contactGroup/contactGroup.query";
import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import {
  useGetContactTags,
  useUpdateContactTagsMutation,
} from "@/backend/whatsapp/settings/waSettings.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { ContactMenu } from "@/components/Card/ContactCard";
import ContactAction from "@/components/Contacts/ContactAction";
import {
  CONTACT_SORT,
  contactColumn,
  contactGroupColumn,
} from "@/components/Contacts/utils/utils";
import {
  ContainedMultiSelect,
  ContainedTagInput,
} from "@/components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "@/components/input/TeamSelector";
import Heading from "@/components/styled/Heading/Heading";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import ContactTable from "@/components/Table/ContactTable";
import { PAGE_SIZE } from "@/utils/constants";
import { showLoadingToast } from "@/utils/notifications";

import styles from "./contacts.module.css";

export enum ContactTabs {
  GROUPS = "groups",
  CONTACTS = "All Contacts",
  SETTINGS = "settings",
}

// Zod schemas for validation
const tagSchema = z.object({
  name: z.string().min(1, "Tag name required"),
  color: z.string().min(1, "Color required"),
});
const tagsFormSchema = z.object({
  contactTags: z.array(tagSchema),
  contactGroupTags: z.array(tagSchema),
});

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useDebouncedState("", 200);
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const [sorting, setSorting] = useState<SortingState>([CONTACT_SORT]);
  const [sortingGroup, setSortingGroup] = useState<SortingState>([
    CONTACT_SORT,
  ]);
  const [columnFilters, setColumnFilters] =
    useDebouncedState<ColumnFiltersState>([], 200);
  const [columnFiltersGroup, setColumnFiltersGroup] =
    useDebouncedState<ColumnFiltersState>([], 200);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const router = useRouter();
  const { tab = ContactTabs.GROUPS } = router.query as { tab: string };
  let activeTab = tab?.toString() as ContactTabs;

  const {
    isPending: isLoadingContacts,
    data: contactData,
    refetch: refetchContacts,
    isRefetching,
    isError,
  } = useContacts(pagination, searchTerm, sorting?.[0], columnFilters);

  const {
    isLoading: isLoadingContactgroup,
    data: contactGroupData,
    refetch: refetchGroups,
    isRefetching: isRefetchingGroups,
    isError: isErrorGroup,
  } = useContactGroup();
  const { isPending, data: cTags } = useGetContactTags();
  const translations = useTranslations();
  const contactGroups =
    selectedTeamID == "all" || !selectedTeamID
      ? contactGroupData?.filter(
          (group) =>
            !searchTerm ||
            group?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      : contactGroupData
          ?.filter((group) => group?.teamId === selectedTeamID)
          ?.filter(
            (group) =>
              !searchTerm ||
              group?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
          );

  const column = useMemo(
    () => [
      ...contactColumn(cTags?.contactTags ?? []),
      {
        header: "Action",
        accessorFn: (row) => row,
        enableSorting: false,
        enableColumnFilter: false,
        id: "action",
        cell: (info) => (
          <ContactMenu
            contact={info.getValue()}
            tags={cTags?.contactTags?.map((tag) => tag?.name)}
            groupId={""}
          />
        ),
      },
    ],
    [cTags],
  );

  const columnGroup = useMemo(() => contactGroupColumn, []);
  const contactMemoData = useMemo(
    () => contactData?.users ?? [],
    [contactData?.users],
  );
  if (isError || isErrorGroup)
    return (
      <ErrorComponent refetch={isError ? refetchContacts : refetchGroups} />
    );
  return (
    <Stack className={styles["contacts-page-root-div"]}>
      <Tabs value={activeTab} color="var(--tertiary-color)" keepMounted={false}>
        <Flex justify="space-between" align={"center"} wrap={"wrap"} gap={10}>
          <SegmentedControl
            data={Object.values(ContactTabs)}
            value={activeTab}
            onChange={(value) =>
              router.push(`/dashboard/contacts?tab=${value}`)
            }
            color={"var(--mantine-color-rateup-blue-filled)"}
            radius={"md"}
            defaultValue={activeTab}
            tt={"capitalize"}
          />
          {activeTab !== ContactTabs.SETTINGS && (
            <TextInput
              leftSection={<IconSearch size="17.6px" stroke={1.5} />}
              radius="xl"
              size="md"
              placeholder={
                activeTab == ContactTabs.CONTACTS
                  ? translations("Search contact")
                  : translations("Search contact groups")
              }
              rightSectionWidth={60}
              defaultValue={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              flex={1}
              maw={500}
              m={"auto"}
            />
          )}

          {activeTab === ContactTabs.CONTACTS && (
            <FilterSelect
              setFilterByTag={setColumnFilters}
              filterByTag={columnFilters}
              contactArray={contactGroups?.map((data) => ({
                value: data?.id,
                label: data?.name,
              }))}
            />
          )}
          {activeTab === ContactTabs.GROUPS && (
            <TeamSelector
              value={selectedTeamID}
              onChange={setSelectedTeamID}
              enableAll={true}
            />
          )}
          <ContactActionMenu groups={contactGroupData} />
        </Flex>
        <Box className={styles["panels-container"]}>
          <Tabs.Panel value={ContactTabs.CONTACTS} h={"100%"}>
            <PaperLayout p={0} h={"100%"}>
              <ContactTable
                columns={column}
                data={contactMemoData ?? []}
                tags={cTags}
                refetch={refetchContacts}
                pagination={pagination}
                setPagination={setPagination}
                totalCount={contactData?.totalCount}
                setSorting={setSorting}
                sorting={sorting}
                columnFilters={columnFilters}
                setColumnFilters={setColumnFilters}
                isPending={isLoadingContacts || isRefetching || isPending}
              />
            </PaperLayout>
          </Tabs.Panel>
          <Tabs.Panel value={ContactTabs.GROUPS} h={"100%"}>
            <PaperLayout p={0} h={"100%"}>
              <ContactTable
                columns={columnGroup}
                data={contactGroups}
                tags={cTags}
                tab={activeTab}
                refetch={refetchGroups}
                setSorting={setSortingGroup}
                sorting={sortingGroup}
                columnFilters={columnFiltersGroup}
                setColumnFilters={setColumnFiltersGroup}
                detailBtn
                isPending={
                  isLoadingContactgroup || isRefetchingGroups || isPending
                }
              />
            </PaperLayout>
          </Tabs.Panel>
          <Tabs.Panel value={ContactTabs.SETTINGS}>
            <ContactSettings cTags={cTags} />
          </Tabs.Panel>
        </Box>
      </Tabs>
    </Stack>
  );
}

export const ContactSettings = ({ cTags, hideGroup = false }) => {
  const translations = useTranslations();
  const updateContactTagsMutation = useUpdateContactTagsMutation();
  // Form setup
  const form = useForm<z.infer<typeof tagsFormSchema>>({
    initialValues: {
      contactTags: [],
      contactGroupTags: [],
    },
    validate: zodResolver(tagsFormSchema),
  });

  useEffect(() => {
    form.setValues({
      contactTags: cTags?.contactTags ?? [],
      contactGroupTags: cTags?.contactGroupTags ?? [],
    });
  }, [cTags]);

  return (
    <PaperLayout p="xl">
      <form
        onSubmit={form.onSubmit((values) => {
          updateContactTagsMutation.mutate({
            tags: values.contactTags,
            groupTags: values.contactGroupTags,
          });
          showLoadingToast(
            translations("Contact tags updated successfully"),
            "c-tags",
            true,
            translations("Loading"),
          );
        })}
        style={{ width: "100%" }}
      >
        <Stack align="start" gap="md">
          <Title size="h4">{translations("Contact Settings")}</Title>

          <Box mb="md">
            <Title size="h5" mb="xs">
              {translations("Contact Tags")}
            </Title>
            <Stack gap="xs">
              {form.values.contactTags.map((tag, index) => (
                <Flex key={index} align="center" gap="sm">
                  <TextInput
                    {...form.getInputProps(`contactTags.${index}.name`)}
                    placeholder={translations("Tag name")}
                    style={{ flex: 1 }}
                  />
                  <ColorInput
                    {...form.getInputProps(`contactTags.${index}.color`)}
                  />
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => {
                      form.removeListItem("contactTags", index);
                    }}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Flex>
              ))}
              <Button
                variant="outline"
                leftSection={<IconUserPlus size={16} />}
                onClick={() =>
                  form.insertListItem("contactTags", {
                    name: "",
                    color: "#3B82F6",
                  })
                }
              >
                {translations("Add New Tag")}
              </Button>
              {form.errors.contactTags && (
                <Box c="red" fz="sm">
                  {form.errors.contactTags}
                </Box>
              )}
            </Stack>
          </Box>

          <Box mb="md" hidden={hideGroup}>
            <Title size="h5" mb="xs">
              {translations("Contact Group Tags")}
            </Title>
            <Stack gap="xs">
              {form.values.contactGroupTags.map((tag, index) => (
                <Flex key={index} align="center" gap="sm">
                  <TextInput
                    {...form.getInputProps(`contactGroupTags.${index}.name`)}
                    placeholder={translations("Tag name")}
                    style={{ flex: 1 }}
                  />
                  <ColorInput
                    {...form.getInputProps(`contactGroupTags.${index}.color`)}
                  />
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => {
                      form.removeListItem("contactGroupTags", index);
                    }}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Flex>
              ))}
              <Button
                variant="outline"
                leftSection={<IconUserPlus size={16} />}
                onClick={() =>
                  form.insertListItem("contactGroupTags", {
                    name: "",
                    color: "#3bf68c",
                  })
                }
              >
                {translations("Add New Group Tag")}
              </Button>
              {form.errors.contactGroupTags && (
                <Box c="red" fz="sm">
                  {form.errors.contactGroupTags}
                </Box>
              )}
            </Stack>
          </Box>

          <RateupButtonPrimary title={translations("Update")} type="submit" />
        </Stack>
      </form>
    </PaperLayout>
  );
};

export const FilterSelect = ({ setFilterByTag, filterByTag, contactArray }) => {
  const translations = useTranslations();
  return (
    <ContainedMultiSelect
      data={[{ group: "Groups", items: contactArray ?? [] }]}
      defaultValue={filterByTag}
      onChange={(e) => {
        setFilterByTag((prev) => {
          if (e.length === 0) {
            return prev.filter((item) => item.id !== "filterGroupName");
          }
          return [...prev, { id: "filterGroupName", value: e.join(",") }];
        });
      }}
      placeholder={translations("Filter contacts")}
    />
  );
};
export enum ContactAcions {
  DELETE_CONTACTS = "Delete Contacts",
  ADD_CONTACTS_TO_GROUP = "Add Contacts to Group",
  DELETE_GROUPS = "Delete Groups",
}

const ContactActionMenu = ({ groups }) => {
  const [
    actionModalOpened,
    { open: openActionModal, close: closeActionModal },
  ] = useDisclosure(false);
  const [action, setSelectedAction] = useState<ContactAcions>(null);
  const translations = useTranslations();
  return (
    <Stack px="sm" pr={0}>
      <Menu
        position="bottom-end"
        offset={4}
        withArrow
        arrowPosition="side"
        transitionProps={{ transition: "rotate-right", duration: 150 }}
      >
        <Menu.Target>
          <Button
            variant="outline"
            color="dark.2"
            radius="lg"
            size="xs"
            rightSection={<IconChevronDown size="16px" />}
            style={{ maxWidth: "fit-content" }}
          >
            {translations("More")}
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            onClick={() => {
              setSelectedAction(ContactAcions.ADD_CONTACTS_TO_GROUP);
              openActionModal();
            }}
            leftSection={
              <IconUserPlus style={{ width: rem(14), height: rem(14) }} />
            }
          >
            {translations("Add Contacts to Group")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <ContactAction
        opened={actionModalOpened}
        close={closeActionModal}
        allGroups={groups}
        action={action}
      />
    </Stack>
  );
};
