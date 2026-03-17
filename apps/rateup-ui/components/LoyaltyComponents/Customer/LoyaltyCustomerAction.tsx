"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { useExtracted } from "next-intl";

import TanstackTable from "@/components/Table/TanstackTable";
import { formatDateWithTime } from "@/utils/dateTime";

const LoyaltyCustomerAction = ({ actions }) => {
  const columnHelper = createColumnHelper<LoyaltyAction>();
  const translations = useExtracted();

  const columns = [
    columnHelper.accessor((row) => row.name, {
      id: "name",
      header: () => <span>{translations("Action")}</span>,
    }),
    columnHelper.accessor((row) => row.points, {
      id: "points",
      header: translations("Points/Points per amount"),
    }),
    columnHelper.accessor((row) => row.amountSpent, {
      id: "amountSpent",
      header: translations("Amount Spent"),
    }),
    columnHelper.accessor(
      (row) =>
        row.amount
          ? Math.round((row.points / row.amount) * row.amountSpent)
          : row.points,
      {
        id: "totalPoints",
        header: translations("Total Points"),
      },
    ),
    columnHelper.accessor((row) => formatDateWithTime(row.createdAt), {
      id: "createdAt",
      header: translations("Date Completed"),
    }),
  ];
  return <TanstackTable columns={columns} data={actions} />;
};
export default LoyaltyCustomerAction;
