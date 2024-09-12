import { useRouter } from "next/router";

import { Box, Title } from "@mantine/core";
import { createColumnHelper } from "@tanstack/react-table";
import dayjs from "dayjs";

import useTranslations from "@/dictionaries/useTranslation";

import { useRewardEvents } from "../../../../../backend/loyalty/campaign/campaignRewardEvent/care.query";
import { useCampaign } from "../../../../../backend/loyalty/campaign/loyaltyCampaign.query";
import PaperLayout from "../../../../../components/styled/Layouts/PaperLayout";
import TanstackTable from "../../../../../components/Table/TanstackTable";
import { LoyaltyCampaignType } from "../../../../../types/enums";
import styles from "./event-history.module.css";

export default function CampaignEventsPage() {
  return (
    <PaperLayout
      className={styles["campaign-events-page-div"]}
      p={0}
      h={"100%"}
    >
      <CampaignEventsTable />
    </PaperLayout>
  );
}

export function CampaignEventsTable() {
  const { translations } = useTranslations();
  const router = useRouter();
  const lcampaignId = router.query.campaignId as string;
  const { data: campaign } = useCampaign(lcampaignId);
  const { data: events } = useRewardEvents(lcampaignId);

  if (!events || !campaign) return;

  const defaultColumns = generateColumns(campaign);
  return (
    <TanstackTable
      className={styles["tanstack-table"]}
      columns={defaultColumns}
      data={events}
      toggleOffContent={
        <Title order={3}>{translations["Recent Events"]}</Title>
      }
    />
  );
}

function generateColumns(campaign: LoyaltyCampaign) {
  const columnHelper = createColumnHelper<LoyaltyCampaignRewardEvent>();
  const defaultColumns = [
    columnHelper.accessor((row) => row.id, {
      id: "id",
      header: "ID",
    }),
    columnHelper.accessor(
      (row) => dayjs(row.createdAt).format("DD/MM/YYYY hh:mm A"),
      {
        id: "date",
        header: "date",
      },
    ),
  ];
  if (campaign.type !== LoyaltyCampaignType.Transaction) {
    defaultColumns.push(
      columnHelper.accessor((row) => row.referrer.phone, {
        id: "referrer",
        header: "Referrer",
      }),
    );
  }
  defaultColumns.push(
    columnHelper.accessor((row) => row.customer.phone, {
      id: "customer",
      header: "Customer",
    }),
  );

  if (campaign.type !== LoyaltyCampaignType.Referral) {
    defaultColumns.push(
      columnHelper.accessor((r) => r.transactionAmount.toString(), {
        id: "ta",
        header: "TransactionAmount",
      }),
    );
  }

  return defaultColumns;
}
