import React, { useEffect, useState } from "react";

import {
  ActionIcon,
  Divider,
  Grid,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import {
  IconArrowNarrowDown,
  IconChevronLeft,
  IconChevronRight,
  IconCircle1,
  IconHandClick,
  IconStarFilled,
  IconUserCircle,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useLoyaltyDashboardData } from "@/backend/loyalty/dashboard/dashboard.api";
import ErrorComponent from "@/components/404/ErrorComponent";
import RateupLoader from "@/components/Loaders/RateupLoader";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";

const ICONS = [
  IconHandClick,
  IconUserCircle,
  IconStarFilled,
  IconStarFilled,
  IconCircle1,
  IconCircle1,
  IconCircle1,
];

const DashboardLoyalty = () => {
  const { data, isPending, isError, refetch } = useLoyaltyDashboardData();
  if (isPending) return <RateupLoader />;
  if (isError) return <ErrorComponent refetch={refetch} />;
  return (
    <Stack p={"xs"}>
      <SummaryCards data={data.summaryData} icons={ICONS} />
      <PaperLayout mt={"xl"} bg={"var(--light-blue-5)"} radius={20}>
        <Grid p={"lg"}>
          <TopPerformedActions data={data.topActionsData} />
          <Grid.Col span={0.2} />
          <OverallActions data={data.overallActionsData} />
        </Grid>
      </PaperLayout>
      <SimpleGrid
        cols={{
          base: 1,
          md: 2,
        }}
        flex={1}
      >
        <PaperLayout mt={"xl"} bg={"var(--grey-color-5)"} radius={20} flex={1}>
          <TopPerformers data={data.topPerformersData} />
        </PaperLayout>
        <PaperLayout mt={"xl"} bg={"var(--grey-color-5)"} radius={20} flex={1}>
          <TopRedeemedRewards data={data.topRedeemedRewardsData} />
        </PaperLayout>
      </SimpleGrid>
    </Stack>
  );
};

const SummaryCards = ({ data, icons }) => (
  <SimpleGrid
    cols={{
      base: 1,
      xs: 2,
      sm: 3,
      md: 4,
      lg: 4,
      xl: 5,
    }}
  >
    {data.map((item, i) => (
      <PaperLayout
        key={item.id}
        flex={1}
        style={{ borderRadius: "12px" }}
        bg={[3, 4, 5].includes(i) ? "var(--grey-color-5)" : ""}
        c={[3, 4, 5].includes(i) ? "var(--grey-color-7)" : ""}
      >
        <Group justify="space-between" gap={0}>
          <Text fw={500}>{item.title}</Text>
          <Group gap={0} pos={"relative"}>
            {React.createElement(icons[i], {
              color: "var(--shade-of-blue-14)",
            })}
            {[3, 5].includes(i) && (
              <IconArrowNarrowDown
                color="var(--shade-of-blue-14)"
                style={{ right: "-16px", position: "absolute" }}
              />
            )}
          </Group>
        </Group>
        <Text ta={"center"} fz={"h1"} fw={600} c={"var(--shade-of-blue-14)"}>
          {item.value}
        </Text>
      </PaperLayout>
    ))}
  </SimpleGrid>
);

const TableHeader = ({ headers }) => (
  <Table.Thead style={{ borderBottom: "1px solid var(--grey-color-4-5)" }}>
    <Table.Tr c={"var(--grey-color-6)"}>
      {headers.map((header, index) => (
        <Table.Th key={index} fw={400}>
          {header}
        </Table.Th>
      ))}
    </Table.Tr>
  </Table.Thead>
);

const TableRow = ({ rowData, renderRow }) => (
  <Table.Tbody>
    {rowData.map((data, index) => (
      <Table.Tr key={index}>{renderRow(data)}</Table.Tr>
    ))}
  </Table.Tbody>
);

const SectionHeader = ({ icon: Icon, title }) => (
  <Group gap={4} p={"sm"}>
    <Icon color="var(--shade-of-blue-14)" />
    <Text fz="lg" fw={500} c={"var(--shade-of-blue-14)"}>
      {title}
    </Text>
  </Group>
);

const TopPerformedActions = ({ data }) => (
  <Grid.Col
    span={{
      base: 12,
      lg: 4,
    }}
    bg={"var(--mantine-color-body)"}
    style={{
      borderRadius: "12px",
    }}
  >
    <SectionHeader icon={IconHandClick} title="Top Performed Actions" />
    <Divider />
    <Table.ScrollContainer minWidth={300} h={400}>
      <Table withRowBorders={false} stickyHeader>
        <TableHeader headers={["Action", "Participants", "Points"]} />
        <TableRow
          rowData={data}
          renderRow={(action) => (
            <>
              <Table.Td maw={200}>
                <Text fw={400} truncate={"end"}>
                  {action.name.title}
                </Text>
                <Text
                  fz={12}
                  c={
                    action.name.type === "Direct Purchase"
                      ? "var(--pink)"
                      : "var(--shade-of-blue-18)"
                  }
                >
                  {action.name.type}
                </Text>
              </Table.Td>
              <Table.Td>{action.participants}</Table.Td>
              <Table.Td>{action.points}</Table.Td>
            </>
          )}
        />
      </Table>
    </Table.ScrollContainer>
  </Grid.Col>
);

const TopPerformers = ({ data }) => (
  <Stack
    gap={0}
    bg={"var(--mantine-color-body)"}
    style={{
      borderRadius: "12px",
    }}
    p={"sm"}
  >
    <Group gap={4} justify="space-between" mb={"sm"}>
      <SectionHeader icon={IconUserCircle} title="Top Performers" />
      {/* <Select
        placeholder="Select"
        defaultValue="Highest Total Actions"
        allowDeselect={false}
        data={[
          "Highest Total Actions",
          "Lowest Total Actions",
          "Highest Recent Actions",
          "Lowest Recent Actions",
        ]}
      /> */}
    </Group>
    <Divider />
    <Table.ScrollContainer minWidth={300} h={500}>
      <Table withRowBorders={false} stickyHeader>
        <TableHeader
          headers={["Name", "Total Actions", "Recent Actions (Last 7 days)"]}
        />
        <TableRow
          rowData={data}
          renderRow={(action) => (
            <>
              <Table.Td w={200}>
                <Text fw={400} truncate={"end"} c={"var(--shade-of-blue-14)"}>
                  {action.name}
                </Text>
              </Table.Td>
              <Table.Td>{action.total_actions}</Table.Td>
              <Table.Td
                c={action.recent_actions > 0 ? "var(--wa-green)" : "red"}
                fw={500}
              >
                {action.recent_actions > 0
                  ? `+${action.recent_actions}`
                  : action.recent_actions}
              </Table.Td>
            </>
          )}
        />
      </Table>
    </Table.ScrollContainer>
  </Stack>
);

type TopRedeemedRewardsProps = {
  data: { name: string; times_redeemed: number; required_points: number }[];
};

const TopRedeemedRewards = ({ data }: TopRedeemedRewardsProps) => (
  <Stack
    gap={0}
    bg={"var(--mantine-color-body)"}
    style={{
      borderRadius: "12px",
    }}
    p={"sm"}
  >
    <SectionHeader icon={IconStarFilled} title="Top Redeemed Rewards" />
    <Divider mt={"sm"} />
    <Table.ScrollContainer minWidth={300} h={500}>
      <Table withRowBorders={false} stickyHeader>
        <TableHeader headers={["Name", "Times Redeemed", "Required Points"]} />
        <TableRow
          rowData={data}
          renderRow={(action) => (
            <>
              <Table.Td w={200}>
                <Text fw={400} truncate={"end"}>
                  {action.name}
                </Text>
              </Table.Td>
              <Table.Td>{action.times_redeemed}</Table.Td>
              <Table.Td>{action.required_points}</Table.Td>
            </>
          )}
        />
      </Table>
    </Table.ScrollContainer>
  </Stack>
);

const PaginatedBarChart = ({ chartData, title, total }) => {
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(0);
  const [actionFilter, setActionFilter] = useState("All Actions");
  const [timeFilter, setFimeFilter] = useState("Daily");

  const handleNextPage = () => {
    if ((currentPage + 1) * ITEMS_PER_PAGE < chartData.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const paginatedData = chartData
    .slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)
    ?.filter(
      (data) => actionFilter === "All Actions" || data?.type === actionFilter,
    );
  return (
    <>
      <Group justify="space-between">
        <Stack gap={0} p={"sm"}>
          <Text fz="16px" c={"var(--grey-color-6)"} fw={500}>
            {title}
          </Text>
          <Text fz={"h2"} c={"var(--shade-of-blue-14)"} fw={600}>
            {total}
          </Text>
        </Stack>
        <Group>
          <Select
            w={165}
            placeholder="Action Filter"
            defaultValue="All Actions"
            allowDeselect={false}
            data={["All Actions", "Direct Purchase", "Referral Purchase"]}
            onChange={setActionFilter}
          />
          <Select
            w={140}
            placeholder="Time Filter"
            defaultValue="Daily"
            allowDeselect={false}
            data={["Daily", "Weekly", "monthly"]}
            variant="filled"
            c={"black"}
            onChange={setFimeFilter}
            styles={{
              input: {
                background: "black",
                color: "white",
              },
            }}
          />
        </Group>
      </Group>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={paginatedData}
          margin={{
            top: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tickFormatter={(value) => dayjs(value).format("MMM D")}
          />
          <YAxis tickCount={10} />
          <Tooltip />
          <Bar
            dataKey="totalActions"
            fill="var(--shade-of-blue-14)"
            maxBarSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
      <Group justify="center" gap={"xl"}>
        <ActionIcon
          radius={"xl"}
          bg={"black"}
          onClick={handlePreviousPage}
          disabled={currentPage === 0}
        >
          <IconChevronLeft />
        </ActionIcon>
        <ActionIcon
          radius={"xl"}
          bg={"black"}
          onClick={handleNextPage}
          disabled={(currentPage + 1) * ITEMS_PER_PAGE >= chartData.length}
        >
          <IconChevronRight />
        </ActionIcon>
      </Group>
    </>
  );
};

const OverallActions = ({ data }) => (
  <Grid.Col
    span={{
      base: 12,
      lg: 7.8,
    }}
    bg={"var(--mantine-color-body)"}
    style={{
      borderRadius: "12px",
    }}
  >
    <PaginatedBarChart
      chartData={data}
      title="Overall Actions Performed"
      total={data?.length}
    />
  </Grid.Col>
);

export default DashboardLoyalty;
