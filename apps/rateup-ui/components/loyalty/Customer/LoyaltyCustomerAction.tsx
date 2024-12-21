import { createColumnHelper } from "@tanstack/react-table";

import TanstackTable from "@/components/Table/TanstackTable";
import { formatDateWithTime } from "@/utils/dateTime";

const LoyaltyCustomerAction = ({ actions }) => {
  const columnHelper = createColumnHelper<LoyaltyAction>();

  const columns = [
    columnHelper.accessor((row) => row.name, {
      id: "name",
      header: () => <span>Action Name</span>,
    }),
    columnHelper.accessor((row) => row.points, {
      id: "points",
      header: "Points/Points per amount",
    }),
    columnHelper.accessor((row) => row.amountSpent, {
      id: "amountSpent",
      header: "Amount Spent",
    }),
    columnHelper.accessor(
      (row) => Math.round((row.points / row.amount) * row.amountSpent),
      {
        id: "totalPoints",
        header: "TotalPoints",
      },
    ),
    columnHelper.accessor((row) => formatDateWithTime(row.createdAt), {
      id: "createdAt",
      header: "Date Completed",
    }),
  ];
  return <TanstackTable columns={columns} data={actions} />;
};
export default LoyaltyCustomerAction;
