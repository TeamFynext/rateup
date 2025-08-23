import React, { useState } from "react";

import { ActionIcon, Badge, Group, Menu, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconDotsVertical, IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { ActiveStatusBadge } from "pages/dashboard/apps&services/shopify";

import { IntegratedApps } from "@/types/enums";
import { ShopifyIntegration, ShopifySurvey } from "@/types/global";
import { useUpdateIntegrationMutation } from "@/backend/appsIntegration/integration.query";
import { useGetLoyaltyActions } from "@/backend/loyalty/actions/actions.query";
import { WaTemplate } from "@/backend/whatsapp/whatsapp.api";

import { shopifyEventData } from "../../utils/constants";
import { formatIsoDateStringWithTime } from "../../utils/dateTime";
import { showLoadingToast } from "../../utils/notifications";
import { RateupButtonBlue } from "../Button/RateupButtons";
import RefreshButton from "../Button/RefreshButton";
import ConfirmationModal from "../Modal/ConfirmationModal";
import PaperLayout from "../styled/Layouts/PaperLayout";
import TableLayoutSecondary from "../styled/Table/TableLayoutSecondary";
import ScheduleSurveyModal from "./ScheduleSurveyModal";
import { getLabelsforConfirmModal } from "./ShopifySettings";

const ShopifySurveySchedules = ({
  shopifyInfo,
  shopifyProducts,
  setShopifyProducts,
  waTemplates,
  teams,
}: {
  shopifyInfo: ShopifyIntegration;
  shopifyProducts: any[];
  setShopifyProducts: React.Dispatch<React.SetStateAction<any[]>>;
  waTemplates: WaTemplate[];
  teams: TeamData[];
}) => {
  const translations = useTranslations();
  const columns = [
    { key: "event", value: "Event" },
    { key: "whatsapp_template", value: translations("WhatsApp Template") },
    { key: "loyaltyAction", value: translations("Loyalty Action") },
    { key: "loyaltyApiFeature", value: "Loyalty API" },
    { key: "isProductSpecific", value: translations("Product Specific") },
    { key: "product", value: translations("Product") },
    { key: "timeDelay", value: translations("Time Delay (in minutes)") },
    { key: "repeatInterval", value: translations("Repeat Interval") },
    {
      key: "status",
      value: translations("Status"),
      renderCell: (value) => <ActiveStatusBadge active={value} />,
    },
    {
      key: "team",
      value: translations("Team"),
      renderCell: (value) => <Badge variant="outline">{value}</Badge>,
    },
    { key: "createdAt", value: "Created At" },
    {
      key: "action",
      value: translations("Action"),
      renderCell: (row) => (
        <ActionMenu selectedRow={row} shopifyInfo={shopifyInfo} />
      ),
    },
  ];
  const [opened, { open, close }] = useDisclosure(false);
  const shopifySurveys = shopifyInfo?.credential?.shopifySurveys;
  const { data: loyaltyActions } = useGetLoyaltyActions();

  const rows = shopifySurveys
    ? shopifySurveys?.map((row) => {
        const waTemplate = waTemplates?.find((t) => t.id === row.waTemplateId);
        const team = teams?.find((t) => t.id === row.teamId);
        return {
          event: shopifyEventData.find((event) => row.event == event.value)
            ?.label,
          whatsapp_template: waTemplate?.data.name ?? "----",
          isProductSpecific: row.isProductSpecific ? "Yes" : "No",
          product: row.isProductSpecific
            ? shopifyProducts?.find(
                (product) => product.id.toString() === row.productId,
              )?.title
            : "----",
          timeDelay: row.timeDelay || "----",
          repeatInterval: row.repeatInterval.value
            ? `${row.repeatInterval.value} ${row.repeatInterval.unit}`
            : "----",
          status: row.active,
          team: team?.name,
          createdAt: formatIsoDateStringWithTime(row.createdAt),
          loyaltyAction:
            loyaltyActions?.find((a) => a.id === row.actionId)?.name ?? "----",
          action: row,
          loyaltyApiFeature: row.loyaltyApiFeature ?? "----",
        };
      })
    : [];

  return (
    <Stack p={"sm"}>
      <Group>
        <Title order={3}>{translations("WhatsApp Message scheduling")}</Title>
        <RefreshButton queryKeys={["shopifySurveySchedules"]} />
        <RateupButtonBlue
          title={translations("Schedule")}
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
        shopifyInfo={shopifyInfo}
        setShopifyProducts={setShopifyProducts}
      />
    </Stack>
  );
};

const ActionMenu = ({
  selectedRow,
  shopifyInfo,
}: {
  selectedRow: ShopifySurvey;
  shopifyInfo: ShopifyIntegration;
}) => {
  const updateIntegration = useUpdateIntegrationMutation(
    IntegratedApps.shopify,
  );
  const [opened, { open, close }] = useDisclosure(false);
  const [deleteCase, setDeleteCase] = useState(null);
  const translations = useTranslations();
  const updateSurveySchedule = () => {
    const allSchedules = shopifyInfo.credential.shopifySurveys.filter(
      (s) => s.event !== selectedRow.event,
    );
    const updateRow = {
      ...selectedRow,
      active: !selectedRow.active,
    };
    allSchedules.push(updateRow);
    showLoadingToast(
      translations("Updating survey schedules.."),
      "integration-update",
      true,
      "",
      "",
      false,
    );
    updateIntegration.mutate({
      credential: { ...shopifyInfo.credential, shopifySurveys: allSchedules },
    });
  };

  const handleDeleteShopifySurvey = (schedule) => {
    const allSchedules = shopifyInfo.credential.shopifySurveys.filter(
      (s) => s.event !== selectedRow.event,
    );
    showLoadingToast(
      translations("Deleting survey schedules.."),
      "integration-update",
      true,
      "",
      "",
      false,
    );
    updateIntegration.mutate({
      credential: { ...shopifyInfo.credential, shopifySurveys: allSchedules },
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
            setDeleteCase(
              getLabelsforConfirmModal(
                "ShopifySurvey",
                handleDeleteShopifySurvey,
              ),
            );
            open();
          }}
        >
          {translations("Delete")}
        </Menu.Item>
        <Menu.Item onClick={updateSurveySchedule}>
          {selectedRow.active
            ? translations("Deactivate")
            : translations("Activate")}
        </Menu.Item>
      </Menu.Dropdown>
      <ConfirmationModal
        confirmLabel={translations("Delete")}
        headerTitle={deleteCase?.headerTitle}
        headerLabel={deleteCase?.headerLabel}
        onClose={close}
        opened={opened}
        onConfirm={() => deleteCase?.confirmFunction(selectedRow)}
        closeLabel={translations("Cancel")}
        forDeleteFunctionality
        deleteQuotion={deleteCase?.deleteQuotion}
      />
    </Menu>
  );
};

export default ShopifySurveySchedules;
