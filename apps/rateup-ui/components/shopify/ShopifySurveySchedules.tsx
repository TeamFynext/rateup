import { useState } from "react";

import {
  ActionIcon,
  Badge,
  Group,
  Menu,
  Stack,
  Table,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconDotsVertical, IconPlus, IconTrash } from "@tabler/icons-react";
import { ActiveStatusBadge } from "pages/dashboard/apps&services/shopify";

import {
  useDeleteShopifySurveySchedule,
  useGetShopifySurveySchedules,
  useUpdateShopifySurveySchedule,
} from "../../backend/shopify/shopify.query";
import { shopifyEventData } from "../../utils/constants";
import { formatIsoDateStringWithTime } from "../../utils/dateTime";
import { showLoadingToast } from "../../utils/notifications";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import RefreshButton from "../Button/RefreshButton";
import ConfirmationModal from "../Modal/ConfirmationModal";
import PaperLayout from "../styled/Layouts/PaperLayout";
import TableLayoutSecondary from "../styled/Table/TableLayoutSecondary";
import ScheduleSurveyModal from "./ScheduleSurveyModal";
import { getLabelsforConfirmModal } from "./ShopifySettings";

const ShopifySurveySchedules = ({
  session,
  shopifyProducts,
  setShopifyProducts,
}) => {
  const columns = [
    { key: "event", value: "Event" },
    { key: "whatsapp_template", value: "WhatsApp Template" },
    { key: "isProductSpecific", value: "Product Specific" },
    { key: "product", value: "Product" },
    { key: "sendAfter", value: "Send After" },
    {
      key: "status",
      value: "Status",
      renderCell: (value) => <ActiveStatusBadge active={value} />,
    },
    {
      key: "team",
      value: "Team",
      renderCell: (value) => <Badge variant="outline">{value}</Badge>,
    },
    { key: "createdAt", value: "Created At" },
    {
      key: "action",
      value: "Action",
      renderCell: (row) => <ActionMenu selectedRow={row} />,
    },
  ];
  const [opened, { open, close }] = useDisclosure(false);
  const { data: shopifySurveys } = useGetShopifySurveySchedules();

  const rows = shopifySurveys
    ? shopifySurveys?.map((row) => ({
        event: shopifyEventData.find((event) => row.event == event.value)
          ?.label,
        whatsapp_template: row.waTemplate.data.name,
        isProductSpecific: row.isProductSpecific ? "Yes" : "No",
        product: row.isProductSpecific
          ? shopifyProducts?.find(
              (product) => product.id.toString() === row.productId,
            )?.title
          : "----",
        sendAfter: row.sendAfter,
        status: row.active,
        team: row.team.name,
        createdAt: formatIsoDateStringWithTime(row.createdAt),
        action: row,
      }))
    : [];

  return (
    <Stack p={"sm"}>
      <Group>
        <Title order={3}>Survey Delivery settings</Title>
        <RefreshButton queryKeys={["shopifySurveySchedules"]} />
        <RateupButtonBlue
          title="schedule survey"
          onClick={open}
          rightIcon={<IconPlus />}
        />
      </Group>
      <PaperLayout>
        <TableLayoutSecondary columns={columns} rows={rows} maxHeight={400} />
      </PaperLayout>
      <ScheduleSurveyModal
        opened={opened}
        close={close}
        session={session}
        setShopifyProducts={setShopifyProducts}
      />
    </Stack>
  );
};

const ActionMenu = ({ selectedRow }) => {
  const updateScheule = useUpdateShopifySurveySchedule();
  const deleteShopifySurvey = useDeleteShopifySurveySchedule();
  const [opened, { open, close }] = useDisclosure(false);
  const [deleteCase, setDeleteCase] = useState(null);
  const updateSurveySchedule = (scheduleId, data) => {
    showLoadingToast("Updating survey schedules..", "shopify-survey", true);
    updateScheule.mutate({ scheduleId, data });
  };

  const handleDeleteShopifySurvey = (schedule) => {
    showLoadingToast(
      "Deleting survey schedule",
      "shopify-survey",
      true,
      "Loading",
    );
    deleteShopifySurvey.mutate(schedule.id);
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
            setDeleteCase(
              getLabelsforConfirmModal(
                "ShopifySurvey",
                handleDeleteShopifySurvey,
              ),
            );
            open();
          }}
        >
          Delete
        </Menu.Item>
        <Menu.Item
          onClick={() =>
            updateSurveySchedule(selectedRow.id, {
              active: !selectedRow.active,
            })
          }
        >
          {selectedRow.active ? "Deactivate" : "Activate"}
        </Menu.Item>
      </Menu.Dropdown>
      <ConfirmationModal
        confirmLabel="Delete"
        headerTitle={deleteCase?.headerTitle}
        headerLabel={deleteCase?.headerLabel}
        onClose={close}
        opened={opened}
        onConfirm={deleteCase?.confirmFunction}
        closeLabel="Cancel"
        forDeleteFunctionality
        deleteQuotion={deleteCase?.deleteQuotion}
      />
    </Menu>
  );
};

export default ShopifySurveySchedules;
