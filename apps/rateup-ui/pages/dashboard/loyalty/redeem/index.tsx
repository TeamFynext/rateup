import { Badge, Group, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAward } from "@tabler/icons-react";
import { createColumnHelper } from "@tanstack/react-table";

import { useGetLoyaltyRedeems } from "@/backend/loyalty/redeems/redeems.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import RateupLoader from "@/components/Loaders/RateupLoader";
import ManualRedeemModal from "@/components/loyalty/reward/ManualRedeemModal";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import TanstackTable from "@/components/Table/TanstackTable";
import { formatDateWithTime } from "@/utils/dateTime";

export default function redeems() {
  const { data: redeems, isPending } = useGetLoyaltyRedeems();
  const {
    data: subscription,
    isLoading: isSubscriptionLoading,
    refetch,
  } = useSubscription();

  const [opened, { open, close }] = useDisclosure(false);

  const columns = generateColumns();

  if (isSubscriptionLoading) return <RateupLoader />;

  if (!subscription?.features?.loyalty?.active)
    return <ErrorComponent refetch={refetch} />;

  return (
    <Stack>
      <Group>
        {/* <Title>Redeems</Title> */}
        <RateupButtonBlue
          title="Redeem Reward"
          rightIcon={<IconAward />}
          onClick={open}
        />
      </Group>
      <PaperLayout h={"65vh"}>
        <TanstackTable columns={columns} data={redeems} isPending={isPending} />
      </PaperLayout>
      <ManualRedeemModal opened={opened} close={close} />
    </Stack>
  );
}

type Redeem = {
  customer: {
    name: string;
    phone: string;
  };
  reward: {
    name: string;
    points: number;
  };
  status: string;
  createdAt: Date;
};

function generateColumns() {
  const columnHelper = createColumnHelper<Redeem>();

  const defaultColumns = [
    columnHelper.accessor((row) => row.customer.name, {
      id: "name",
      header: () => <span>Name</span>,
    }),
    columnHelper.accessor((row) => row.customer.phone, {
      id: "phone",
      header: "Phone",
    }),
    columnHelper.accessor((row) => row.reward.name, {
      id: "rewardName",
      header: "Reward",
    }),
    columnHelper.accessor((row) => row.reward.points, {
      id: "points",
      header: "Required Points",
    }),
    columnHelper.accessor((row) => row.status, {
      id: "status",
      header: "Status",
      cell: ({ getValue }) => {
        return (
          <Badge color={getRedeemsStatusColor(getValue())} variant={"light"}>
            {getValue()}
          </Badge>
        );
      },
    }),
    columnHelper.accessor((row) => formatDateWithTime(row.createdAt), {
      id: "createdAt",
      header: "Redeemed On",
    }),
  ];

  return defaultColumns;
}

enum RedeemStatus {
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

function getRedeemsStatusColor(status) {
  switch (status) {
    case RedeemStatus.COMPLETED:
      return "green";
    case RedeemStatus.FAILED:
      return "red";
    default:
      return "var(--tertiary-color)";
  }
}
