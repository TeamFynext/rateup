import { useState } from "react";
import Link from "next/link";

import { Anchor, Group, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconEye } from "@tabler/icons-react";

import {
  ShopifyIntegration,
  ShopifySchedule,
  ShopifySurvey,
} from "@/types/global";
import { WaTemplate } from "@/backend/whatsapp/whatsapp.api";
import { ActiveStatusBadge } from "@/pages/dashboard/apps&services/shopify";
import { shopifyEventData } from "@/utils/constants";
import { formatIsoDateStringWithTime } from "@/utils/dateTime";

import { RateupButtonSecondary } from "../Button/RateupButtons";
import RefreshButton from "../Button/RefreshButton";
import FormModalLayout from "../Modal/FormModalLayout";
import PaperLayout from "../styled/Layouts/PaperLayout";
import TableLayoutSecondary from "../styled/Table/TableLayoutSecondary";

const ShopifySchedules = ({
  shopifyProducts,
  shopifyInfo,
  waTemplates,
  teams,
}: {
  shopifyProducts: any[];
  shopifyInfo: ShopifyIntegration;
  waTemplates: WaTemplate[];
  teams: TeamData[];
}) => {
  const schedules = shopifyInfo.credential.shopifySurveys.flatMap(
    (s) => s.schedules,
  );
  const [selectedShopifySurveyEvent, setSelectedShopifySurveyEvent] =
    useState<ShopifySurvey>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const templateAndteam = {
    templateName: waTemplates?.find(
      (t) => t.id === selectedShopifySurveyEvent?.waTemplateId,
    )?.data?.name,
    teamName: teams?.find((t) => t.id === selectedShopifySurveyEvent?.teamId)
      ?.name,
    product: selectedShopifySurveyEvent?.isProductSpecific
      ? shopifyProducts?.find(
          (product) =>
            product.id.toString() === selectedShopifySurveyEvent.productId,
        )?.title
      : undefined,
  };

  const columns = [
    { key: "phone", value: "Customer Phone Number" },
    { key: "scheduleTime", value: "Scheduled At" },
    { key: "status", value: "Status" },
    {
      key: "event_details",
      value: "Event Details",
      renderCell: (value) => (
        <RateupButtonSecondary
          variant="light"
          title="view"
          size="xs"
          onClick={() => {
            setSelectedShopifySurveyEvent(value);
            open();
          }}
          leftIcon={<IconEye size={"1rem"} />}
        />
      ),
    },
    { key: "createdAt", value: "Created At" },
  ];

  const rows = schedules
    ? schedules.map((schedule) => ({
        phone: schedule.phone,
        scheduleTime: formatIsoDateStringWithTime(schedule.scheduleTime),
        status: schedule.status,
        createdAt: formatIsoDateStringWithTime(schedule.createdAt),
        event_details: shopifyInfo.credential.shopifySurveys?.find((s) =>
          s.schedules.find((sc) => sc.webhookId === schedule.webhookId),
        ),
      }))
    : [];

  return (
    <Stack p={"sm"} mt={"lg"}>
      <Group>
        <Title order={3}>Schedules</Title>
        <RefreshButton queryKeys={["shopifySchedules"]} />
      </Group>
      <PaperLayout>
        <TableLayoutSecondary columns={columns} rows={rows} maxHeight={500} />
      </PaperLayout>

      <EventDetailsModal
        opened={opened}
        close={close}
        shopifySurvey={selectedShopifySurveyEvent}
        templateAndTeam={templateAndteam}
      />
    </Stack>
  );
};

const EventDetailsModal = ({
  opened,
  close,
  shopifySurvey,
  templateAndTeam,
}) => {
  return (
    <FormModalLayout opened={opened} onClose={close} title="" centered>
      <Stack>
        <Title order={4}>
          Event :{" "}
          {
            shopifyEventData.find(
              (event) => event.value == shopifySurvey?.event,
            )?.label
          }
        </Title>
        <Text>
          WhatsApp Template :{" "}
          <Anchor
            href={`/dashboard/whatsapp/templates/${shopifySurvey?.waTemplateId}`}
            component={Link}
          >
            {templateAndTeam?.templateName}
          </Anchor>
        </Text>
        <Text>
          Scheduled To: Send {shopifySurvey?.sendAfter} after event happened
        </Text>
        <Text>Team : {templateAndTeam?.teamName}</Text>
        {shopifySurvey?.isProductSpecific && (
          <Text>Sent Only if {templateAndTeam?.product} found</Text>
        )}
        <Text>
          Status : <ActiveStatusBadge active={shopifySurvey?.active} />
        </Text>
        <Text>
          Created At : {formatIsoDateStringWithTime(shopifySurvey?.createdAt)}{" "}
        </Text>
      </Stack>
    </FormModalLayout>
  );
};

export default ShopifySchedules;
