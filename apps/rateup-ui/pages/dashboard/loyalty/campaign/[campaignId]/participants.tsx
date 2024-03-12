import { useRouter } from "next/router";
import { useCampaignParticipants } from "../../../../../backend/loyalty/campaign/loyaltyCampaign.query";
import { Paper, Title } from "@mantine/core";
import RateupLoader from "../../../../../components/Loaders/RateupLoader";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import TanstackTable from "../../../../../components/Table/TanstackTable";

export default function CampaignParticipantsPage() {
  const router = useRouter();
  const lcampaignId = router.query.campaignId as string;
  const { data: participants } = useCampaignParticipants(lcampaignId);

  const columnHelper = createColumnHelper<LoyaltyCustomer>();

  const defaultColumns = [
    columnHelper.accessor((row) => row.name, {
      id: "name",
      header: () => <span>Name</span>,
    }),
    columnHelper.accessor((row) => row.phone, {
      id: "phone",
      header: () => <span>Phone</span>,
    }),
    columnHelper.accessor((row) => row.points, {
      id: "points",
      header: "Points",
    }),
  ];

  if (!participants) return <RateupLoader />;
  return (
    <Paper>
      <Title>Participants</Title>
      <TanstackTable columns={defaultColumns} data={participants} />
    </Paper>
  );
}
