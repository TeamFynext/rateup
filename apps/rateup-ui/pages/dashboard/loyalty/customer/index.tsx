import { useMemo, useState } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Anchor,
  Box,
  Flex,
  Group,
  Menu,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import { IconDotsVertical, IconSearch, IconTrash } from "@tabler/icons-react";
import {
  ColumnFiltersState,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";

import { ContactGroupType, LoyaltyActionType } from "@/types/enums";
import { useContactGroup } from "@/backend/campaign/contactGroup/contactGroup.query";
import {
  useGetContactTags,
  useUpdateContactTagsMutation,
} from "@/backend/whatsapp/settings/waSettings.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import CreateContactModal from "@/components/Contacts/CreateContactModal";
import {
  CONTACT_SORT,
  loyaltyGroupColumn,
} from "@/components/Contacts/utils/utils";
import {
  ContainedMultiSelect,
  ContainedTagInput,
} from "@/components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "@/components/input/TeamSelector";
import LoyaltyCustomerAction from "@/components/LoyaltyComponents/Customer/LoyaltyCustomerAction";
import LoyaltyCustomerRedeems from "@/components/LoyaltyComponents/Customer/LoyaltyCustomerRedeems";
import LoyaltyUtilityMenu from "@/components/LoyaltyComponents/Customer/LoyaltyUtilityMenu";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import ContactTable from "@/components/Table/ContactTable";
import useTranslations from "@/dictionaries/useTranslation";
import { PAGE_SIZE } from "@/utils/constants";
import { formatDate } from "@/utils/dateTime";
import { showLoadingToast } from "@/utils/notifications";

import {
  useDeleteLoyaltyCustomerMutation,
  useImportCSVCustomerMutation,
  useLoyaltyCustomers,
} from "../../../../backend/loyalty/customer/customer.query";
import Redeems from "../redeem";
import styles from "./contacts.module.css";

export enum CustomerTabs {
  GROUPS = "groups",
  CUSTOMERS = "customers",
  REDEEMS = "redeems",
  SETTINGS = "settings",
}
export default function Contacts() {
  const [searchTerm, setSearchTerm] = useDebouncedState("", 200);
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const [contactTags, setContactTags] = useState([]);
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
  const { tab = CustomerTabs.GROUPS } = router.query as { tab: string };
  let activeTab = tab?.toString() as CustomerTabs;

  const {
    isLoading: isLoadingContactgroup,
    data: contactGroupData,
    refetch: refetchGroups,
    isRefetching: isRefetchingGroups,
    isError: isErrorGroup,
  } = useContactGroup(ContactGroupType.LOYALTY);
  const { isPending, data: cTags } = useGetContactTags();
  const updateContactTagsMutation = useUpdateContactTagsMutation();
  const { translations } = useTranslations();
  const contactGroups =
    selectedTeamID == "all" || !selectedTeamID
      ? contactGroupData
      : contactGroupData?.filter((group) => group?.teamId === selectedTeamID);
  const [openedActions, { open: openActions, close: closeActions }] =
    useDisclosure(false);
  const [openedRedeems, { open: openRedeems, close: closeRedeems }] =
    useDisclosure(false);
  const [customerActions, setCustomerActions] = useState([]);
  const [customerRedeems, setCustomerRedeems] = useState([]);
  const {
    data: customers,
    isPending: isPendingCustomer,
    isError,
    refetch,
  } = useLoyaltyCustomers(pagination, searchTerm, sorting?.[0], columnFilters);
  const [opened, { open, close }] = useDisclosure(false);

  const customersColumn = generateColumns(
    openActions,
    openRedeems,
    setCustomerActions,
    setCustomerRedeems,
  );
  const importCSVCustomerMutation = useImportCSVCustomerMutation();

  const columnGroup = useMemo(() => loyaltyGroupColumn, []);
  return (
    <Stack className={styles["contacts-page-root-div"]}>
      <Tabs value={activeTab} color="var(--tertiary-color)" keepMounted={false}>
        <Flex justify="space-between" align={"center"} wrap={"wrap"} gap={10}>
          <Group gap={"xs"}>
            <LoyaltyUtilityMenu />
            <SegmentedControl
              data={Object.values(CustomerTabs)}
              value={activeTab}
              onChange={(value) =>
                router.push(`/dashboard/loyalty/customer?tab=${value}`)
              }
              color={"var(--mantine-color-rateup-blue-filled)"}
              radius={"md"}
              defaultValue={activeTab}
              tt={"capitalize"}
            />
          </Group>
          {[CustomerTabs.CUSTOMERS, CustomerTabs.GROUPS].includes(
            activeTab,
          ) && (
            <TextInput
              leftSection={<IconSearch size="17.6px" stroke={1.5} />}
              radius="xl"
              size="md"
              placeholder={`Search ${activeTab}`}
              rightSectionWidth={60}
              defaultValue={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              flex={1}
              maw={500}
              m={"auto"}
            />
          )}

          {activeTab === CustomerTabs.CUSTOMERS && (
            <FilterSelect
              setFilterByTag={setColumnFilters}
              filterByTag={columnFilters}
              contactArray={contactGroups?.map((data) => ({
                value: data?.id,
                label: data?.name,
              }))}
            />
          )}
          {activeTab === CustomerTabs.GROUPS && (
            <TeamSelector
              value={selectedTeamID}
              onChange={setSelectedTeamID}
              enableAll={true}
            />
          )}
          {/* <ContactActionMenu groups={contactGroupData} /> */}
        </Flex>
        <Box className={styles["panels-container"]}>
          <Tabs.Panel value={CustomerTabs.CUSTOMERS} h={"100%"}>
            <PaperLayout p={0} h={"100%"}>
              {isError ? (
                <ErrorComponent refetch={refetch} />
              ) : (
                <ContactTable
                  columns={customersColumn}
                  data={customers ?? []}
                  cTags={cTags?.contactTags}
                  refetch={refetch}
                  pagination={pagination}
                  setPagination={setPagination}
                  totalCount={customers?.[0]?.totalCount}
                  setSorting={setSorting}
                  sorting={sorting}
                  columnFilters={columnFilters}
                  setColumnFilters={setColumnFilters}
                  isPending={isPendingCustomer}
                  toggle={open}
                  btnTitle={translations["Create"]}
                />
              )}
            </PaperLayout>
          </Tabs.Panel>
          <Tabs.Panel value={CustomerTabs.GROUPS} h={"100%"}>
            <PaperLayout p={0} h={"100%"}>
              {isErrorGroup ? (
                <ErrorComponent refetch={refetchGroups} />
              ) : (
                <ContactTable
                  columns={columnGroup}
                  data={contactGroups}
                  cTags={cTags?.contactTags}
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
                  contactGroupType={ContactGroupType.LOYALTY}
                />
              )}
            </PaperLayout>
          </Tabs.Panel>
          <Tabs.Panel value={CustomerTabs.REDEEMS} h={"100%"}>
            <Redeems />
          </Tabs.Panel>
          <Tabs.Panel value={CustomerTabs.SETTINGS}>
            <PaperLayout p="xl">
              <Stack align="start">
                <ContainedTagInput
                  placeholder={translations["Type field name and press enter"]}
                  label={
                    translations[
                      "Enter the Field name you want to add along with the existing fields in Csv Import."
                    ]
                  }
                  w={"25rem"}
                  onChange={setContactTags}
                  defaultValue={cTags?.contactTags}
                />
                <RateupButtonPrimary
                  title={translations["Update"]}
                  onClick={() => {
                    updateContactTagsMutation.mutate({
                      tags: contactTags,
                    });
                    showLoadingToast(
                      translations["Contact tags updated successfully"],
                      "c-tags",
                      true,
                      translations["Loading"],
                    );
                  }}
                />
              </Stack>
            </PaperLayout>
          </Tabs.Panel>
          <FormModalLayout
            onClose={close}
            opened={opened}
            title={translations["Add members"]}
            size="xl"
            centered
          >
            <CreateContactModal
              contactClose={close}
              close={close}
              cTags={cTags?.contactTags}
              importCSVContactMutation={importCSVCustomerMutation}
              type={ContactGroupType.LOYALTY}
            />
          </FormModalLayout>
          <FormModalLayout
            opened={openedActions}
            onClose={closeActions}
            title=""
            centered
            size="lg"
          >
            <LoyaltyCustomerAction actions={customerActions} />
          </FormModalLayout>
          <FormModalLayout
            opened={openedRedeems}
            onClose={closeRedeems}
            title=""
            centered
            size="lg"
          >
            <LoyaltyCustomerRedeems redeems={customerRedeems} />
          </FormModalLayout>
        </Box>
      </Tabs>
    </Stack>
  );
}

export const FilterSelect = ({ setFilterByTag, filterByTag, contactArray }) => {
  const { translations } = useTranslations();
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
      placeholder={translations["Filter contacts"]}
    />
  );
};
export enum ContactAcions {
  DELETE_CONTACTS = "Delete Contacts",
  ADD_CONTACTS_TO_GROUP = "Add Contacts to Group",
  DELETE_GROUPS = "Delete Groups",
}

export function generateColumns(
  openActions,
  openRedeems,
  setCustomerActions,
  setCustomerRedeems,
) {
  const columnHelper = createColumnHelper<LoyaltyCustomerTable>();

  const defaultColumns = useMemo(
    () => [
      // {
      //   id: "select",
      //   enableSorting: false,
      //   maxSize: 10,
      //   header: ({ table }) => (
      //     <IndeterminateCheckbox
      //       {...{
      //         checked: table.getIsAllRowsSelected(),
      //         indeterminate: table.getIsSomeRowsSelected(),
      //         onChange: table.getToggleAllRowsSelectedHandler(),
      //       }}
      //     />
      //   ),
      //   cell: ({ row }) => (
      //     <div className="px-1">
      //       <IndeterminateCheckbox
      //         {...{
      //           checked: row.getIsSelected(),
      //           disabled: !row.getCanSelect(),
      //           indeterminate: row.getIsSomeSelected(),
      //           onChange: row.getToggleSelectedHandler(),
      //         }}
      //         onClick={(e) => e.stopPropagation()}
      //       />
      //     </div>
      //   ),
      // },
      columnHelper.accessor((row) => row, {
        id: "customerInfo",
        header: () => <span>Customer Info</span>,
        cell: ({ getValue }) => {
          return (
            <Stack w={200} gap={0}>
              <Text fw={"bold"} size="sm">
                {getValue().name}
              </Text>
              <Text size="sm">{getValue().phone}</Text>
              <Text size="sm">
                Joined On - {formatDate(getValue().createdAt)}
              </Text>
            </Stack>
          );
        },
      }),
      columnHelper.accessor((row) => row.referralCodes?.join(","), {
        id: "referralCode",
        header: "Referral Code",
      }),
      ...Object.entries(LoyaltyActionType).map(([key, value]) =>
        columnHelper.accessor((row) => row[value], {
          id: key,
          header: () => <span>{value}</span>,
          cell: ({ getValue }) => {
            return (
              <Anchor
                onClick={() => {
                  setCustomerActions(getValue());
                  openActions();
                }}
                key={key}
              >
                {getValue()?.length}
              </Anchor>
            );
          },
        }),
      ),
      columnHelper.accessor((row) => row.totalPoints, {
        id: "totalPoints",
        header: "Total Points",
      }),
      columnHelper.accessor((row) => row.balancePoints, {
        id: "balancePoints",
        header: "Balance Points",
      }),
      columnHelper.accessor((row) => row.redeems, {
        id: "redeems",
        header: "Redeems",
        cell: ({ getValue }) => {
          return (
            <>
              <Anchor
                onClick={() => {
                  setCustomerRedeems(getValue());
                  openRedeems();
                }}
              >
                {getValue()?.length}
              </Anchor>
            </>
          );
        },
      }),

      columnHelper.accessor((row) => row, {
        header: () => "Action",
        enableSorting: false,
        enableColumnFilter: false,
        id: "action",
        cell: ({ getValue }) => {
          return <CustomerMenu row={getValue()} />;
        },
      }),
    ],
    [],
  );

  return defaultColumns;
}
const CustomerMenu = ({ row }) => {
  const [opened, { open, close }] = useDisclosure(false);
  const { translations } = useTranslations();
  const deleteMut = useDeleteLoyaltyCustomerMutation();
  const handleDelete = () => {
    deleteMut.mutate(row.id, {
      onSettled: () => {
        close();
      },
    });
  };

  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="subtle">
          <IconDotsVertical size={"1rem"} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={"1rem"} />}
          onClick={() => {
            open();
          }}
        >
          {translations["Delete"]}
        </Menu.Item>
      </Menu.Dropdown>
      <ConfirmationModal
        confirmLabel={translations["Delete"]}
        headerTitle={translations["Delete"]}
        headerLabel={translations["Are you sure to delete this"]}
        onClose={close}
        opened={opened}
        onConfirm={() => handleDelete()}
        closeLabel={translations["Cancel"]}
        forDeleteFunctionality
        deleteQuotion={""}
        key={row?.id}
      />
    </Menu>
  );
};
