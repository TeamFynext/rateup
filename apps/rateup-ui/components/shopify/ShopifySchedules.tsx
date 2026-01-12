"use client";

import { useState } from "react";
import Link from "next/link";

import { Anchor, Badge, Group, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconEye } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import {
  ShopifyIntegration,
  ShopifySchedule,
  ShopifySurvey,
} from "@/types/global";
import { ActiveStatusBadge } from "@/app/dashboard/apps&services/shopify/page";
import { WaTemplate } from "@/backend/whatsapp/whatsapp.api";
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
  const [historyOpened, { open: openHistory, close: closeHistory }] =
    useDisclosure(false);
  const [selectedSchedule, setSelectedSchedule] =
    useState<ShopifySchedule>(null);
  const translations = useTranslations();
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
    { key: "phone", value: translations("Customer Phone Number") },
    { key: "scheduleTime", value: translations("Scheduled At") },
    { key: "sentAt", value: translations("Sent At") },
    { key: "status", value: translations("Status") },
    {
      key: "event_details",
      value: "Event Details",
      renderCell: (value) => (
        <RateupButtonSecondary
          variant="light"
          title={translations("view")}
          size="xs"
          onClick={() => {
            setSelectedShopifySurveyEvent(value);
            open();
          }}
          leftIcon={<IconEye size={"1rem"} />}
        />
      ),
    },
    {
      key: "history",
      value: "History",
      renderCell: (value) => (
        <RateupButtonSecondary
          variant="light"
          title={translations("view")}
          size="xs"
          onClick={() => {
            setSelectedSchedule(value);
            openHistory();
          }}
          leftIcon={<IconEye size={"1rem"} />}
        />
      ),
    },
    { key: "createdAt", value: "Created At" },
  ];

  const rows = schedules
    ? schedules
        .sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)))
        .map((schedule) => ({
          phone: schedule.phone,
          scheduleTime: formatIsoDateStringWithTime(schedule.scheduledAt),
          sentAt: schedule.sentAt
            ? formatIsoDateStringWithTime(schedule.sentAt)
            : "----",
          status: schedule.status ?? "----",
          actionStatus: schedule.actionStatus,
          apiStatus: schedule.apiStatus ?? "----",
          createdAt: formatIsoDateStringWithTime(schedule.createdAt),
          history: schedule,
          event_details: shopifyInfo.credential.shopifySurveys?.find((s) =>
            s.schedules.find((sc) => sc.webhookId === schedule.webhookId),
          ),
        }))
    : [];

  return (
    <Stack p={"sm"} mt={"lg"}>
      <Group>
        <Title order={3}>{translations("Schedules")}</Title>
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
      <ScheduleHistoryModal
        opened={historyOpened}
        schedule={selectedSchedule}
        close={closeHistory}
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
  const translations = useTranslations();
  return (
    <FormModalLayout opened={opened} onClose={close} title="" centered>
      <Stack>
        <Title order={4}>
          {translations("Event :")}{" "}
          {
            shopifyEventData.find(
              (event) => event.value == shopifySurvey?.event,
            )?.label
          }
        </Title>
        <Text>
          {translations("WhatsApp Template :")}{" "}
          <Anchor
            href={`/dashboard/whatsapp/templates/${shopifySurvey?.waTemplateId}`}
            component={Link}
          >
            {templateAndTeam?.templateName}
          </Anchor>
        </Text>
        <Text>
          {translations("Scheduled To Send")} :{" "}
          {translations("After a delay of")} {shopifySurvey?.timeDelay}{" "}
          {translations("minutes")}
        </Text>
        <Text>
          {translations("Team : ")}
          {templateAndTeam?.teamName}
        </Text>
        {shopifySurvey?.isProductSpecific && (
          <Text>
            {translations("Sent Only if")} {templateAndTeam?.product}{" "}
            {translations("found")}
          </Text>
        )}
        <Text>
          {translations("Status : ")}
          <ActiveStatusBadge active={shopifySurvey?.active} />
        </Text>
        <Text>
          {translations("Created At : ")}
          {formatIsoDateStringWithTime(shopifySurvey?.createdAt)}{" "}
        </Text>
      </Stack>
    </FormModalLayout>
  );
};

const ScheduleHistoryModal = ({
  schedule,
  opened,
  close,
}: {
  schedule: ShopifySchedule;
  opened: boolean;
  close: () => void;
}) => {
  const columns = [
    { key: "createdAt", value: "Created At" },
    { key: "scheduledAt", value: "Scheduled At" },
    { key: "sentAt", value: "Sent At" },
    { key: "status", value: "Status" },
  ];

  const rows =
    schedule && schedule.history
      ? schedule.history
          .sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)))
          .map((s) => ({
            createdAt: formatIsoDateStringWithTime(s.createdAt),
            scheduledAt: formatIsoDateStringWithTime(s.scheduledAt),
            sentAt: formatIsoDateStringWithTime(s.sentAt),
            status: s.status,
          }))
      : [];
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={"Schedule History"}
      size="lg"
      centered
    >
      <TableLayoutSecondary columns={columns} rows={rows} />
    </FormModalLayout>
  );
};

export default ShopifySchedules;
