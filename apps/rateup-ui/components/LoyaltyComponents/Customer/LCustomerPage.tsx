import React, { useEffect, useState } from "react";

import {
  Box,
  Group,
  ScrollArea,
  ScrollAreaAutosize,
  SimpleGrid,
  Stack,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useDebouncedState, useListState } from "@mantine/hooks";
import {
  IconCalendar,
  IconTrendingUp,
  IconUserFilled,
} from "@tabler/icons-react";

import { useLoyaltyCustomers } from "@/backend/loyalty/customer/customer.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import ContactPagination from "@/components/Contacts/ContactPagination";
import { ContainedSelection } from "@/components/input/ContainedInput/ContainedInput";
import RateupLoader from "@/components/Loaders/RateupLoader";
import NothingFound from "@/components/NothingFound/NothingFound";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import useTranslations from "@/dictionaries/useTranslation";
import { SearchInput } from "@/pages/dashboard/campaign";
import { PAGE_SIZE } from "@/utils/constants";

import { CustomerStatsCard } from "../utils";
import LCustomerCard from "./LCustomerCard";
import LoyaltyUtilityMenu from "./LoyaltyUtilityMenu";
import classes from "./Style.module.css";

enum SortMenu {
  LatestFirst = "Latest First",
  OldestFirst = "Oldest First",
  HighestPoints = "Highest Points",
  LowestPoints = "Lowest Points",
  A_Z = "A - Z",
  Z_A = "Z - A",
}

enum CustomerStats {
  TotalCustomer = "Total Customers",
  NewCustomers = "New Customers",
  ActiveCustomers = "Active Customers",
  InactiveCustomers = "Inactive Customers",
  CustomerGrowth = "Customer Growth",
}

export function CustomerStatsIcon(stats: CustomerStats) {
  switch (stats) {
    case CustomerStats.TotalCustomer:
      return (
        <IconUserFilled
          color="white"
          style={{
            backgroundColor: "var(--tertiary-color)",
            borderRadius: "50%",
            padding: 2,
          }}
        />
      );
    case CustomerStats.NewCustomers:
      return (
        <IconUserFilled
          color="lightBlue"
          style={{
            backgroundColor: "cadetblue",
            borderRadius: "50%",
            padding: 2,
          }}
        />
      );
    case CustomerStats.ActiveCustomers:
      return (
        <IconUserFilled
          color="green"
          style={{
            backgroundColor: "var(--sucess-green)",
            borderRadius: "50%",
            padding: 2,
          }}
        />
      );
    case CustomerStats.InactiveCustomers:
      return (
        <IconUserFilled
          color="grey"
          style={{
            backgroundColor: "var(--gift-grey-2)",
            borderRadius: "50%",
            padding: 2,
          }}
        />
      );
    case CustomerStats.CustomerGrowth:
      return <IconTrendingUp color="green" />;
  }
}

function getSortValue(id) {
  switch (id) {
    case SortMenu.HighestPoints:
    case SortMenu.LowestPoints:
      return "totalEarnedPoints";
    case SortMenu.LatestFirst:
    case SortMenu.OldestFirst:
      return "createdAt";
    case SortMenu.A_Z:
    case SortMenu.Z_A:
      return "Contact.name";
  }
}

const LCustomerPage = () => {
  const [searchTerm, setSearchTerm] = useDebouncedState("", 200);
  const { translations } = useTranslations();
  const [date, setDate] = useState<Date | null>(null);
  const [sorting, setSorting] = useState({
    value: SortMenu.LatestFirst,
    sort: {
      id: getSortValue(SortMenu.LatestFirst),
      desc: true,
    },
  });
  const [filters, setFilters] = useListState([]);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const {
    data: customerData,
    isPending: isPendingCustomer,
    isLoading,
    isRefetching,
    isError,
    refetch,
  } = useLoyaltyCustomers(pagination, searchTerm, sorting.sort, filters);

  const customers = customerData?.customers;

  const totalStats = Object.values(CustomerStats).map((c) => ({
    name: c,
    icon: CustomerStatsIcon(c),
    count: customerData?.stats?.[c] ?? "NA",
  }));

  useEffect(() => {
    if (date) {
      const filterCopy = [...filters];
      let flag = false;
      filterCopy?.forEach((f) => {
        if (f.id === "createdAt") {
          f.value = date;
          flag = true;
        }
      });
      if (!flag) filterCopy.push({ id: "createdAt", value: date });

      setFilters.setState(filterCopy);
    } else setFilters.setState(filters?.filter((f) => f.id !== "createdAt"));
  }, [date]);

  const totalPageCount = customers?.[0]?.totalCount
    ? customers?.[0]?.totalCount / pagination.pageSize
    : 0;

  if (isPendingCustomer || isLoading || isRefetching) return <RateupLoader />;
  if (isError) return <ErrorComponent refetch={refetch} />;

  return (
    <Stack h={"87vh"}>
      <PaperLayout bg={"var(--grey-color-5)"} p={"xs"}>
        <SimpleGrid cols={5}>
          {totalStats?.map((s) => (
            <CustomerStatsCard
              key={s?.name}
              stats={s}
              onClick={() => {}}
              isSelected={false}
            />
          ))}
        </SimpleGrid>
      </PaperLayout>
      <PaperLayout p={0} flex={1}>
        <Stack justify="space-between">
          <Group bg={"var(--light-blue-5)"} justify="space-between" p={"xs"}>
            <Group>
              <LoyaltyUtilityMenu />
              <SearchInput
                searchText={searchTerm}
                setSearchText={setSearchTerm}
                placeholder={translations["Search"]}
              />
            </Group>
            <Group>
              <DateInput
                leftSection={<IconCalendar />}
                value={date}
                onChange={setDate}
                clearable
              />
              <ContainedSelection
                data={Object.values(SortMenu)}
                value={sorting?.value}
                onChange={(value) =>
                  setSorting({
                    value: value as SortMenu,
                    sort: {
                      id: getSortValue(value),
                      desc: [
                        SortMenu.LatestFirst,
                        SortMenu.HighestPoints,
                        SortMenu.Z_A,
                      ].includes(value as SortMenu),
                    },
                  })
                }
              />
            </Group>
          </Group>
          <Box h={"49vh"} p={0}>
            {customers?.length === 0 ? (
              <NothingFound text={translations["No customer found"]} />
            ) : (
              <ScrollAreaAutosize h={"100%"}>
                <SimpleGrid cols={4} p={"sm"}>
                  {customers?.map((c) => (
                    <LCustomerCard key={c?.id} customer={c} />
                  ))}
                </SimpleGrid>
              </ScrollAreaAutosize>
            )}
          </Box>
          <Stack px={"xs"} pb="xs">
            <ContactPagination
              pagination={pagination}
              setPagination={setPagination}
              totalPageCount={totalPageCount}
            />
          </Stack>
        </Stack>
      </PaperLayout>
    </Stack>
  );
};

export default LCustomerPage;
