import { createColumnHelper } from "@tanstack/react-table";
import { useLoyaltyCustomers } from "../../../../backend/loyalty/customer/customer.query";
import TanstackTable from "../../../../components/Table/TanstackTable";
import { Paper, Title } from "@mantine/core";

export default function LoyaltyCampaignCustomersPage() {
  return (
    <Paper>
      <Title>Participants</Title>
      <LoyaltyCampaignCustomers />
    </Paper>
  );
}

function LoyaltyCampaignCustomers() {
  const { data: customers } = useLoyaltyCustomers();

  if (!customers) return;
  const columns = generateColumns();

  return <TanstackTable columns={columns} data={customers} />;
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
