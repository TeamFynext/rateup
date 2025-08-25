import { useMemo, useState } from "react";
import { useRouter } from "next/router";

import {
  Anchor,
  Box,
  Center,
  Flex,
  Portal,
  Stack,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import {
  ColumnFiltersState,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { ContactGroupType, LoyaltyActionType } from "@/types/enums";
import { useContactGroup } from "@/backend/campaign/contactGroup/contactGroup.query";
import {
  useGetContactTags,
  useUpdateContactTagsMutation,
} from "@/backend/whatsapp/settings/waSettings.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import {
  CONTACT_SORT,
  loyaltyGroupColumn,
} from "@/components/Contacts/utils/utils";
import {
  ContainedMultiSelect,
  ContainedTagInput,
} from "@/components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "@/components/input/TeamSelector";
import { CustomerMenu } from "@/components/LoyaltyComponents/Customer/LCustomerCard";
import LCustomerPage from "@/components/LoyaltyComponents/Customer/LCustomerPage";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import TabsListComp from "@/components/Survey/Tabs/TabsList";
import ContactTable from "@/components/Table/ContactTable";
import { formatDate } from "@/utils/dateTime";
import { showLoadingToast } from "@/utils/notifications";

import { ContactSettings } from "../../contacts";
import Redeems from "../redeem";
import styles from "./contacts.module.css";

export enum CustomerTabs {
  CUSTOMERS = "customers",
  GROUPS = "groups",
  REDEEMS = "redeems",
  SETTINGS = "settings",
}
export default function Contacts() {
  const [searchTerm, setSearchTerm] = useDebouncedState("", 200);
  const router = useRouter();
  const { tab = CustomerTabs.CUSTOMERS } = router.query as { tab: string };
  const [activeTab, setActiveTab] = useState(tab?.toString() as CustomerTabs);
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const [contactTags, setContactTags] = useState([]);
  const [sortingGroup, setSortingGroup] = useState<SortingState>([
    CONTACT_SORT,
  ]);
  const [columnFiltersGroup, setColumnFiltersGroup] =
    useDebouncedState<ColumnFiltersState>([], 200);
  const {
    isLoading: isLoadingContactgroup,
    data: contactGroupData,
    refetch: refetchGroups,
    isRefetching: isRefetchingGroups,
    isError: isErrorGroup,
  } = useContactGroup(ContactGroupType.LOYALTY);
  const { isPending, data: cTags } = useGetContactTags();
  const updateContactTagsMutation = useUpdateContactTagsMutation();
  const translations = useTranslations();
  const contactGroups =
    selectedTeamID == "all" || !selectedTeamID
      ? contactGroupData
      : contactGroupData?.filter((group) => group?.teamId === selectedTeamID);

  const columnGroup = useMemo(() => loyaltyGroupColumn, []);
  return (
    <Stack>
      <Center>
        <TabsListComp
          value={activeTab}
          onChange={setActiveTab}
          tabs={Object.values(CustomerTabs)}
        />
      </Center>
      <Tabs value={activeTab} color="var(--tertiary-color)" keepMounted={false}>
        <Flex justify="space-between" align={"center"} wrap={"wrap"} gap={10}>
          {[CustomerTabs.GROUPS].includes(activeTab) && (
            <TextInput
              leftSection={<IconSearch size="17.6px" stroke={1.5} />}
              radius="xl"
              size="md"
              placeholder={`${translations("Search")} ${activeTab}`}
              rightSectionWidth={60}
              defaultValue={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              flex={1}
              maw={500}
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
          <Tabs.Panel value={CustomerTabs.CUSTOMERS} h={"75vh"}>
            <LCustomerPage />
          </Tabs.Panel>
          <Tabs.Panel value={CustomerTabs.GROUPS} h={"75vh"}>
            <PaperLayout p={0} h={"100%"}>
              {isErrorGroup ? (
                <ErrorComponent refetch={refetchGroups} />
              ) : (
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
                  contactGroupType={ContactGroupType.LOYALTY}
                />
              )}
            </PaperLayout>
          </Tabs.Panel>
          <Tabs.Panel value={CustomerTabs.REDEEMS} h={"100%"}>
            <Redeems />
          </Tabs.Panel>
          <Tabs.Panel value={CustomerTabs.SETTINGS}>
            <ContactSettings cTags={cTags} hideGroup={true} />
          </Tabs.Panel>
        </Box>
      </Tabs>
    </Stack>
  );
}

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

export function generateColumns(
  openActions,
  openRedeems,
  setCustomerActions,
  setCustomerRedeems,
) {
  const columnHelper = createColumnHelper<LoyaltyCustomerTable>();
  const translations = useTranslations();

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
        header: () => <span>{translations("Customer Info")}</span>,
        cell: ({ getValue }) => {
          return (
            <Stack w={200} gap={0}>
              <Text fw={"bold"} size="sm">
                {getValue()?.name}
              </Text>
              <Text size="sm">{getValue()?.phone}</Text>
              <Text size="sm">
                Joined On - {formatDate(getValue()?.createdAt)}
              </Text>
            </Stack>
          );
        },
      }),
      columnHelper.accessor((row) => row.referralCodes?.join(","), {
        id: "referralCode",
        header: translations("Referral Code"),
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
        header: translations("Total Points"),
      }),
      columnHelper.accessor((row) => row.balancePoints, {
        id: "balancePoints",
        header: "Balance Points",
      }),
      columnHelper.accessor((row) => row.redeems, {
        id: "redeems",
        header: translations("Redeems"),
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
        header: () => translations("Action"),
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
