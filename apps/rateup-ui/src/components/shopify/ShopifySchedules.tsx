import { IconEye } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { ShopifyProduct } from "@/backend/appsIntegration/shopify/shopify.api";
import type { WaTemplate } from "@/backend/whatsapp/whatsapp.api";
import { ActiveStatusBadge } from "@/components/app&services/Shopify.tsx";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import type { ShopifyIntegration, ShopifySchedule, ShopifySurvey } from "@/types/global";
import { shopifyEventData } from "@/utils/constants.ts";
import { formatIsoDateStringWithTime } from "@/utils/dateTime.ts";

import RefreshButton from "../Button/RefreshButton.tsx";

interface ScheduleRowData {
  id: string;
  phone: string;
  scheduleTime: string | null;
  sentAt: string | null;
  status: string;
  actionStatus: any;
  apiStatus: string;
  createdAt: string | null;
  history: ShopifySchedule;
  event_details: ShopifySurvey | undefined;
}

interface EventDetailsCellProps {
  eventDetails: ShopifySurvey | undefined;
  onOpen: (event: ShopifySurvey | undefined) => void;
  translations: any;
}

const EventDetailsCell = ({ eventDetails, onOpen, translations }: EventDetailsCellProps) => (
  <Button
    variant="secondary"
    size="xs"
    onClick={(e) => {
      e.stopPropagation();
      onOpen(eventDetails);
    }}
  >
    <IconEye data-icon="inline-start" />
    {translations("view")}
  </Button>
);

interface HistoryCellProps {
  schedule: ShopifySchedule | null;
  onOpen: (schedule: ShopifySchedule | null) => void;
  translations: any;
}

const HistoryCell = ({ schedule, onOpen, translations }: HistoryCellProps) => (
  <Button
    variant="secondary"
    size="xs"
    onClick={(e) => {
      e.stopPropagation();
      onOpen(schedule);
    }}
  >
    <IconEye data-icon="inline-start" />
    {translations("view")}
  </Button>
);

const ShopifySchedules = ({
  shopifyProducts,
  shopifyInfo,
  waTemplates,
  teams,
}: {
  shopifyProducts: ShopifyProduct[];
  shopifyInfo: ShopifyIntegration;
  waTemplates: WaTemplate[];
  teams: TeamData[];
}) => {
  const schedules = shopifyInfo.credential.shopifySurveys.flatMap((s) => s.schedules);
  const [selectedShopifySurveyEvent, setSelectedShopifySurveyEvent] =
    useState<ShopifySurvey | null>(null);
  const [opened, setOpened] = useState(false);
  const [historyOpened, setHistoryOpened] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ShopifySchedule | null>(null);
  const { t: translations } = useTranslation();

  const templateAndteam = {
    templateName: waTemplates?.find((t) => t.id === selectedShopifySurveyEvent?.waTemplateId)?.data
      ?.name,
    teamName: teams?.find((t) => t.id === selectedShopifySurveyEvent?.teamId)?.name,
    product: selectedShopifySurveyEvent?.isProductSpecific
      ? shopifyProducts?.find(
          (product) => product.id.toString() === selectedShopifySurveyEvent.productId,
        )?.title
      : undefined,
  };

  const sortedSchedules = [...(schedules ?? [])].toSorted((a, b) =>
    dayjs(b.createdAt).diff(dayjs(a.createdAt)),
  );
  const rows = sortedSchedules.map((schedule) => ({
    id: schedule.webhookId || schedule.phone + schedule.createdAt,
    phone: schedule.phone,
    scheduleTime: formatIsoDateStringWithTime(schedule.scheduledAt),
    sentAt: schedule.sentAt ? formatIsoDateStringWithTime(schedule.sentAt) : "----",
    status: schedule.status ?? "----",
    actionStatus: schedule.actionStatus,
    apiStatus: schedule.apiStatus ?? "----",
    createdAt: formatIsoDateStringWithTime(schedule.createdAt),
    history: schedule,
    event_details: shopifyInfo.credential.shopifySurveys?.find((s) =>
      s.schedules.find((sc) => sc.webhookId === schedule.webhookId),
    ),
  }));

  const columns: ColumnDef<ScheduleRowData>[] = [
    {
      id: "phone",
      header: createSortableHeader(translations("Customer Phone Number")),
      cell: ({ row }) => row.original.phone,
    },
    {
      id: "scheduleTime",
      header: createSortableHeader(translations("Scheduled At")),
      cell: ({ row }) => row.original.scheduleTime,
    },
    {
      id: "sentAt",
      header: createSortableHeader(translations("Sent At")),
      cell: ({ row }) => row.original.sentAt,
    },
    {
      id: "status",
      header: createSortableHeader(translations("Status")),
      cell: ({ row }) => row.original.status,
    },
    {
      id: "eventDetails",
      header: () => "Event Details",
      cell: ({ row }) => (
        <EventDetailsCell
          eventDetails={row.original.event_details}
          onOpen={(event) => setSelectedShopifySurveyEvent(event ?? null)}
          translations={translations}
        />
      ),
    },
    {
      id: "history",
      header: () => "History",
      cell: ({ row }) => (
        <HistoryCell
          schedule={row.original.history}
          onOpen={(schedule) => {
            setSelectedSchedule(schedule);
            setHistoryOpened(true);
          }}
          translations={translations}
        />
      ),
    },
    {
      id: "createdAt",
      header: createSortableHeader("Created At"),
      cell: ({ row }) => row.original.createdAt,
    },
  ];

  return (
    <div className="mt-4 flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{translations("Schedules")}</h3>
        <RefreshButton queryKeys={["shopifySchedules"]} />
      </div>
      <DataTable columns={columns} data={rows} />
      <EventDetailsModal
        opened={opened}
        close={() => setOpened(false)}
        shopifySurvey={selectedShopifySurveyEvent}
        templateAndTeam={templateAndteam}
      />
      <ScheduleHistoryModal
        opened={historyOpened}
        schedule={selectedSchedule}
        close={() => setHistoryOpened(false)}
      />
    </div>
  );
};

const EventDetailsModal = ({
  opened,
  close,
  shopifySurvey,
  templateAndTeam,
}: {
  opened: boolean;
  close: () => void;
  shopifySurvey: ShopifySurvey | null;
  templateAndTeam: {
    templateName?: string;
    teamName?: string;
    product?: string;
  };
}) => {
  const { t: translations } = useTranslation();
  return (
    <Dialog open={opened} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {translations("Event :")}{" "}
            {shopifyEventData.find((event) => event.value == shopifySurvey?.event)?.label}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          <p>
            {translations("WhatsApp Template :")}{" "}
            <Link
              to={`/dashboard/whatsapp/templates/${shopifySurvey?.waTemplateId}`}
              className="text-primary underline"
            >
              {templateAndTeam?.templateName}
            </Link>
          </p>
          <p>
            {translations("Scheduled To Send")} : {translations("After a delay of")}{" "}
            {shopifySurvey?.timeDelay} {translations("minutes")}
          </p>
          <p>
            {translations("Team : ")}
            {templateAndTeam?.teamName}
          </p>
          {shopifySurvey?.isProductSpecific && (
            <p>
              {translations("Sent Only if")} {templateAndTeam?.product} {translations("found")}
            </p>
          )}
          <p>
            {translations("Status : ")}
            <ActiveStatusBadge active={shopifySurvey?.active} />
          </p>
          <p>
            {translations("Created At : ")}
            {formatIsoDateStringWithTime(shopifySurvey?.createdAt)}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ScheduleHistoryModal = ({
  schedule,
  opened,
  close,
}: {
  schedule: ShopifySchedule | null;
  opened: boolean;
  close: () => void;
}) => {
  const sortedHistory = [...(schedule?.history ?? [])].toSorted((a, b) =>
    dayjs(b.createdAt).diff(dayjs(a.createdAt)),
  );
  const rows = sortedHistory.map((s, idx) => ({
    id: `history-${idx}`,
    createdAt: formatIsoDateStringWithTime(s.createdAt),
    scheduledAt: formatIsoDateStringWithTime(s.scheduledAt),
    sentAt: formatIsoDateStringWithTime(s.sentAt),
    status: s.status,
  }));

  type HistoryRow = (typeof rows)[0];

  const columns: ColumnDef<HistoryRow>[] = [
    {
      id: "createdAt",
      header: createSortableHeader("Created At"),
      cell: ({ row }) => row.original.createdAt,
    },
    {
      id: "scheduledAt",
      header: createSortableHeader("Scheduled At"),
      cell: ({ row }) => row.original.scheduledAt,
    },
    {
      id: "sentAt",
      header: createSortableHeader("Sent At"),
      cell: ({ row }) => row.original.sentAt,
    },
    {
      id: "status",
      header: createSortableHeader("Status"),
      cell: ({ row }) => row.original.status,
    },
  ];

  return (
    <Dialog open={opened} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-175">
        <DialogHeader>
          <DialogTitle>Schedule History</DialogTitle>
        </DialogHeader>
        <DataTable columns={columns} data={rows} />
      </DialogContent>
    </Dialog>
  );
};

export default ShopifySchedules;
