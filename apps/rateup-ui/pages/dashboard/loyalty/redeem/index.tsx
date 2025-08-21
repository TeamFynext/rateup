import { useState } from "react";
import { useRouter } from "next/router";

import { Badge, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { createColumnHelper } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { useGetLoyaltyRedeems } from "@/backend/loyalty/redeems/redeems.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import RateupLoader from "@/components/Loaders/RateupLoader";
import UpdateRedeemStatusModal from "@/components/LoyaltyComponents/Redeem/UpdateRedeemStatusModal";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import TanstackTable from "@/components/Table/TanstackTable";
import { formatDateWithTime } from "@/utils/dateTime";

export default function Redeems() {
  const { data: redeems, isPending } = useGetLoyaltyRedeems();
  const {
    data: subscription,
    isLoading: isSubscriptionLoading,
    refetch,
  } = useSubscription();

  const [
    redeemUpdateStOpened,
    { open: openStatusUpdate, close: closeStatusUpdate },
  ] = useDisclosure(false);
  const [redeem, setRedeem] = useState(null);

  const columns = generateColumns(openStatusUpdate, setRedeem);

  if (isSubscriptionLoading) return <RateupLoader />;

  if (!subscription?.features?.loyalty?.active)
    return <ErrorComponent refetch={refetch} />;

  return (
    <Stack>
      <Group></Group>
      <PaperLayout h={"80vh"}>
        <TanstackTable
          columns={columns}
          data={redeems ?? []}
          isPending={isPending}
        />
      </PaperLayout>
      <UpdateRedeemStatusModal
        opened={redeemUpdateStOpened}
        close={closeStatusUpdate}
        redeem={redeem}
      />
    </Stack>
  );
}

type Redeem = {
  customer: {
    Contact: {
      name: string;
      phone: string;
    };
  };
  reward: LoyaltyReward;
  status: string;
  createdAt: Date;
  code: string;
};

function generateColumns(open, setRedeem) {
  const columnHelper = createColumnHelper<Redeem>();
  const router = useRouter();
  const translations = useTranslations();

  const defaultColumns = [
    columnHelper.accessor((row) => row.customer.Contact.name, {
      id: "name",
      header: () => <span>{translations("Name")}</span>,
    }),
    columnHelper.accessor((row) => row.customer.Contact.phone, {
      id: "phone",
      header: translations("Phone"),
    }),
    columnHelper.accessor((row) => row.code, {
      id: "code",
      header: translations("Redeem Code"),
    }),
    columnHelper.accessor((row) => row.reward, {
      id: "rewardName",
      header: translations("Reward"),
      cell: ({ getValue }) => {
        return (
          <Text
            size="sm"
            onClick={() => {
              router.push(`/dashboard/loyalty/rewards/${getValue().id}`);
            }}
          >
            {getValue().name}
          </Text>
        );
      },
    }),
    columnHelper.accessor((row) => row.reward.points, {
      id: "points",
      header: translations("Required Points"),
    }),
    columnHelper.accessor((row) => row, {
      id: "status",
      header: translations("Status"),
      cell: ({ getValue }) => {
        return (
          <Badge
            color={getRedeemsStatusColor(getValue().status)}
            variant={"light"}
            onClick={() => {
              setRedeem(getValue());
              open();
            }}
          >
            {getValue().status}
          </Badge>
        );
      },
    }),
    columnHelper.accessor((row) => formatDateWithTime(row.createdAt), {
      id: "createdAt",
      header: translations("Redeemed On"),
    }),
  ];

  return defaultColumns;
}

export enum RedeemStatus {
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  ISSUED = "ISSUED",
  CLAIMED = "CLAIMED",
}

export function getRedeemsStatusColor(status) {
  switch (status) {
    case RedeemStatus.COMPLETED:
      return "green";
    case RedeemStatus.FAILED:
      return "red";
    case RedeemStatus.ISSUED:
      return "yellow";
    case RedeemStatus.CLAIMED:
      return "cyan";
    default:
      return "var(--tertiary-color)";
  }
}
