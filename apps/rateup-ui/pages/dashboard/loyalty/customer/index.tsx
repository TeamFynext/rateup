import { createColumnHelper } from "@tanstack/react-table";
import { useLoyaltyCustomers } from "../../../../backend/loyalty/customer/customer.query";
import TanstackTable from "../../../../components/Table/TanstackTable";
import { Box, Paper, Stack, Title } from "@mantine/core";
import PaperLayout from "../../../../components/styled/Layouts/PaperLayout";
import styles from "./customer.module.css";

export default function LoyaltyCampaignCustomersPage() {
  return (
    <Stack h={"100%"}>
      <Title>Participants</Title>
      <LoyaltyCampaignCustomers />
    </Stack>
  );
}

function LoyaltyCampaignCustomers() {
  const { data: customers } = useLoyaltyCustomers();

  if (!customers) return;
  const columns = generateColumns();

  return (
    <PaperLayout p={0} flex={1} mah={800}>
      <TanstackTable columns={columns} data={customers} />
    </PaperLayout>
  );
}

function generateColumns() {
  const columnHelper = createColumnHelper<LoyaltyCustomer>();

  const defaultColumns = [
    columnHelper.accessor((row) => row.name, {
      id: "name",
      header: () => <span>Name</span>,
    }),
    columnHelper.accessor((row) => row.phone, {
      id: "phone",
      header: () => <span>Phone</span>,
    }),
    columnHelper.accessor((row) => row.points, {
      id: "points",
      header: "Points",
    }),
  ];

  return defaultColumns;
}
