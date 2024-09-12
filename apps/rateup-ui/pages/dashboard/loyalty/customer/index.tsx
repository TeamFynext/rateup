import { Box, Paper, Stack, Title } from "@mantine/core";
import { createColumnHelper } from "@tanstack/react-table";

import useTranslations from "@/dictionaries/useTranslation";

import { useLoyaltyCustomers } from "../../../../backend/loyalty/customer/customer.query";
import PaperLayout from "../../../../components/styled/Layouts/PaperLayout";
import TanstackTable from "../../../../components/Table/TanstackTable";
import styles from "./customer.module.css";

export default function LoyaltyCampaignCustomersPage() {
  const { translations } = useTranslations();
  return (
    <Stack h={"100%"}>
      <Title>{translations["Participants"]}</Title>
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
