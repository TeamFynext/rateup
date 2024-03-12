import { Box } from "@mantine/core";
import { useRouter } from "next/router";
import TanstackTable from "../../../../../components/Table/TanstackTable";
import { useRewardEvents } from "../../../../../backend/loyalty/campaign/campaignRewardEvent/care.query";
import { createColumnHelper } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useCampaign } from "../../../../../backend/loyalty/campaign/loyaltyCampaign.query";
import { LoyaltyCampaignType } from "../../../../../types/enums";

export default function CampaignEventsPage() {
  return (
    <Box>
      <CampaignEventsTable />
    </Box>
  );
}

export function CampaignEventsTable() {
  const router = useRouter();
  const lcampaignId = router.query.campaignId as string;
  const { data: campaign } = useCampaign(lcampaignId);
  const { data: events } = useRewardEvents(lcampaignId);

  if (!events || !campaign) return;

  const defaultColumns = generateColumns(campaign);
  return <TanstackTable columns={defaultColumns} data={events} />;
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
