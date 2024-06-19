import { Stack, Title } from "@mantine/core";
import { createColumnHelper } from "@tanstack/react-table";
import { useRouter } from "next/router";
import { useCampaignParticipants } from "../../../../../backend/loyalty/campaign/loyaltyCampaign.query";
import RateupLoader from "../../../../../components/Loaders/RateupLoader";
import TanstackTable from "../../../../../components/Table/TanstackTable";
import PaperLayout from "../../../../../components/styled/Layouts/PaperLayout";

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
    <Stack h={"100%"}>
      <Title>Participants</Title>
      <PaperLayout p={0} flex={1}>
        <TanstackTable columns={defaultColumns} data={participants} />
      </PaperLayout>
    </Stack>
  );
}
