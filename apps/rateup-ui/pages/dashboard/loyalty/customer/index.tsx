import { useMemo, useState } from "react";

import {
  ActionIcon,
  Anchor,
  Flex,
  Group,
  Menu,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconDotsVertical, IconTrash } from "@tabler/icons-react";
import { createColumnHelper } from "@tanstack/react-table";

import { LoyaltyActionType } from "@/types/enums";
import { useLCAction } from "@/backend/loyalty/loyalty.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import RefreshButton from "@/components/Button/RefreshButton";
import RateupLoader from "@/components/Loaders/RateupLoader";
import LoyaltyManualCustomerActionModal from "@/components/loyalty/actions/PointsIssuance";
import ReferralAction from "@/components/loyalty/ReferralAction";
import { LASelector, LCSelector } from "@/components/loyalty/utils";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import styles from "@/components/Survey/SurveyTheme/components/PageSelector/PageSelector.module.css";
import useTranslations from "@/dictionaries/useTranslation";
import { formatDate, formatDateWithTime } from "@/utils/dateTime";

import {
  useDeleteLoyaltyCustomerMutation,
  useLoyaltyCustomers,
} from "../../../../backend/loyalty/customer/customer.query";
import PaperLayout from "../../../../components/styled/Layouts/PaperLayout";
import TanstackTable from "../../../../components/Table/TanstackTable";
import Redeems from "../redeem";

enum LoyaltyCustomerPageTabs {
  Customers = "Customers",
  Redeems = "Redeems",
}

export default function LoyaltyCustomersPage() {
  const { translations } = useTranslations();
  const [opened, { open, close }] = useDisclosure(false);
  const [referModalOpened, { open: openReferModal, close: closeReferModal }] =
    useDisclosure(false);
  const [activeTab, setActiveTab] = useState(LoyaltyCustomerPageTabs.Customers);
  const {
    data: subscription,
    isLoading: isSubscriptionLoading,
    refetch,
  } = useSubscription();

  if (isSubscriptionLoading) return <RateupLoader />;

  if (
    !subscription?.features?.loyalty?.active ||
    !subscription?.features?.loyalty?.customer?.active
  )
    return <ErrorComponent refetch={refetch} />;

  return (
    <Tabs
      classNames={styles}
      value={activeTab}
      onChange={(value) => setActiveTab(value as LoyaltyCustomerPageTabs)}
    >
      <Flex justify={"center"}>
        <Tabs.List justify="center">
          {Object.values(LoyaltyCustomerPageTabs).map((tab) => (
            <Tabs.Tab px={"xl"} py={"sm"} value={tab}>
              {tab}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Flex>
      <Tabs.Panel value={LoyaltyCustomerPageTabs.Customers} mt={"sm"}>
        <Stack>
          <Group>
            <RateupButtonBlue title="Points Issuance" onClick={open} />
            <RateupButtonBlue title="Refer" onClick={openReferModal} />
          </Group>
          <LoyaltyCustomers />
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value={LoyaltyCustomerPageTabs.Redeems} mt={"sm"}>
        <Redeems />
      </Tabs.Panel>
      <LoyaltyManualCustomerActionModal opened={opened} close={close} />
      <ReferralAction opened={referModalOpened} close={closeReferModal} />
    </Tabs>
  );
}

function LoyaltyCustomers() {
  const [openedActions, { open: openActions, close: closeActions }] =
    useDisclosure(false);
  const [openedRedeems, { open: openRedeems, close: closeRedeems }] =
    useDisclosure(false);
  const [customerActions, setCustomerActions] = useState([]);
  const [customerRedeems, setCustomerRedeems] = useState([]);
  const { data: customers, isPending } = useLoyaltyCustomers();

  const columns = generateColumns(
    openActions,
    openRedeems,
    setCustomerActions,
    setCustomerRedeems,
  );

  return (
    <PaperLayout h={"65vh"}>
      <TanstackTable columns={columns} data={customers} isPending={isPending} />
      <FormModalLayout
        opened={openedActions}
        onClose={closeActions}
        title=""
        centered
        size="lg"
      >
        <LoyaltyCustomerAction actions={customerActions} />
      </FormModalLayout>
      <FormModalLayout
        opened={openedRedeems}
        onClose={closeRedeems}
        title=""
        centered
        size="lg"
      >
        <LoyaltyCustomerRedeems redeems={customerRedeems} />
      </FormModalLayout>
    </PaperLayout>
  );
}

function generateColumns(
  openActions,
  openRedeems,
  setCustomerActions,
  setCustomerRedeems,
) {
  const columnHelper = createColumnHelper<LoyaltyCustomerTable>();

  const defaultColumns = useMemo(
    () => [
      columnHelper.accessor((row) => row.customerInfo, {
        id: "customerInfo",
        header: () => <span>Customer Info</span>,
        cell: ({ getValue }) => {
          return (
            <Stack w={200} gap={0}>
              <Text fw={"bold"} size="sm">
                {getValue().name}
              </Text>
              <Text size="sm">{getValue().phone}</Text>
              <Text size="sm">
                Joined On - {formatDate(getValue().createdAt)}
              </Text>
            </Stack>
          );
        },
      }),
      ...Object.entries(LoyaltyActionType).map(([key, value]) =>
        columnHelper.accessor((row) => row[value], {
          id: key,
          header: () => <span>{value}</span>,
          cell: ({ getValue }) => {
            return (
              <Anchor
                onClick={() => {
                  setCustomerActions(getValue());
                  openActions();
                }}
                key={key}
              >
                {getValue().length}
              </Anchor>
            );
          },
        }),
      ),
      columnHelper.accessor((row) => row.totalPoints, {
        id: "totalPoints",
        header: "Total Points",
      }),
      columnHelper.accessor((row) => row.balancePoints, {
        id: "balancePoints",
        header: "Balance Points",
      }),
      columnHelper.accessor((row) => row.redeems, {
        id: "redeems",
        header: "Redeems",
        cell: ({ getValue }) => {
          return (
            <>
              <Anchor
                onClick={() => {
                  setCustomerRedeems(getValue());
                  openRedeems();
                }}
              >
                {getValue().length}
              </Anchor>
            </>
          );
        },
      }),
      columnHelper.accessor((row) => row, {
        id: "action",
        header: () => <span></span>,
        cell: ({ getValue }) => {
          return <CustomerMenu row={getValue()} />;
        },
      }),
    ],
    [],
  );

  return defaultColumns;
}
const CustomerMenu = ({ row }) => {
  const [opened, { open, close }] = useDisclosure(false);
  const { translations } = useTranslations();
  const deleteMut = useDeleteLoyaltyCustomerMutation();
  const handleDelete = () => {
    deleteMut.mutate(row.id, {
      onSettled: () => {
        close();
      },
    });
  };

  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="subtle">
          <IconDotsVertical size={"1rem"} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={"1rem"} />}
          onClick={() => {
            open();
          }}
        >
          {translations["Delete"]}
        </Menu.Item>
      </Menu.Dropdown>
      <ConfirmationModal
        confirmLabel={translations["Delete"]}
        headerTitle={translations["Delete"]}
        headerLabel={translations["Are you sure to delete this"]}
        onClose={close}
        opened={opened}
        onConfirm={() => handleDelete()}
        closeLabel={translations["Cancel"]}
        forDeleteFunctionality
        deleteQuotion={""}
        key={row?.id}
      />
    </Menu>
  );
};
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
    columnHelper.accessor((row) => formatDateWithTime(row.createdAt), {
      id: "createdAt",
      header: "Date Completed",
    }),
  ];
  return <TanstackTable columns={columns} data={actions} />;
};

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
