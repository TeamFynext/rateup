import { useEffect, useState } from "react";
import Link from "next/link";

import { useGetShopifySchedules } from "@/backend/shopify/shopify.query";
import { ActiveStatusBadge } from "@/pages/dashboard/apps&services/shopify";
import { shopifyEventData } from "@/utils/constants";
import { formatIsoDateStringWithTime } from "@/utils/dateTime";
import { Anchor, Group, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconEye } from "@tabler/icons-react";

import { RateupButtonSecondary } from "../Button/RateupButtons";
import RefreshButton from "../Button/RefreshButton";
import FormModalLayout from "../Modal/FormModalLayout";
import PaperLayout from "../styled/Layouts/PaperLayout";
import TableLayoutSecondary from "../styled/Table/TableLayoutSecondary";

const ShopifySchedules = ({ shopifyProducts }) => {
  const { data: schedules, isPending } = useGetShopifySchedules();
  const [selectedShopifySurveyEvent, setSelectedShopifySurveyEvent] =
    useState(null);
  const [opened, { open, close }] = useDisclosure(false);

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
        scheduleTime: formatIsoDateStringWithTime(schedule.scheduledTime),
        status: schedule.status,
        createdAt: formatIsoDateStringWithTime(schedule.createdAt),
        event_details: {
          ...schedule.shopifySurvey,
          product: schedule.shopifyProducts?.isProductSpecific
            ? schedule.shopifyProducts?.find(
                (product) =>
                  product.id.toString() === schedule.shopifySurvey.productId,
              )?.title
            : undefined,
        },
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
      />
    </Stack>
  );
};

const EventDetailsModal = ({ opened, close, shopifySurvey }) => {
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
            href={`/dashboard/whatsapp/templates/${shopifySurvey?.waTemplate.id}`}
            component={Link}
          >
            {shopifySurvey?.waTemplate.data.name}
          </Anchor>
        </Text>
        <Text>
          Scheduled To: Send {shopifySurvey?.sendAfter} after event happened
        </Text>
        <Text>Team : {shopifySurvey?.team.name}</Text>
        {shopifySurvey?.isProductSpecific && (
          <Text>Sent Only if {shopifySurvey.product} found</Text>
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
