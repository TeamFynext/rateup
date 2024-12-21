import { useMemo } from "react";

import { createColumnHelper } from "@tanstack/react-table";

import TanstackTable from "@/components/Table/TanstackTable";
import { formatDateWithTime } from "@/utils/dateTime";

const LoyaltyCustomerRedeems = ({ redeems }) => {
  const columnHelper = createColumnHelper<LoyaltyRedeem>();

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.reward.name, {
        id: "rewardName",
        header: () => <span>Reward</span>,
      }),
      columnHelper.accessor((row) => row.reward.points, {
        id: "points",
        header: "Requird Points",
      }),
      columnHelper.accessor((row) => formatDateWithTime(row.createdAt), {
        id: "createdAt",
        header: "Redeemed On",
      }),
    ],
    [],
  );
  return <TanstackTable columns={columns} data={redeems} />;
};

export default LoyaltyCustomerRedeems;
