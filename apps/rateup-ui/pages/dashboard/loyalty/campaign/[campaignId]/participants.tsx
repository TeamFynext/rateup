import { useRouter } from "next/router";

import { Stack, Title } from "@mantine/core";
import { createColumnHelper } from "@tanstack/react-table";

import useTranslations from "@/dictionaries/useTranslation";

import { useCampaignParticipants } from "../../../../../backend/loyalty/campaign/loyaltyCampaign.query";
import RateupLoader from "../../../../../components/Loaders/RateupLoader";
import PaperLayout from "../../../../../components/styled/Layouts/PaperLayout";
import TanstackTable from "../../../../../components/Table/TanstackTable";

export default function CampaignParticipantsPage() {
  const router = useRouter();
  const lcampaignId = router.query.campaignId as string;
  const { data: participants } = useCampaignParticipants(lcampaignId);
  const { translations } = useTranslations();
  const columnHelper = createColumnHelper<LoyaltyCustomer>();

  const defaultColumns = [
    columnHelper.accessor((row) => row.name, {
      id: "name",
      header: () => <span>{translations["Name"]}</span>,
    }),
    columnHelper.accessor((row) => row.phone, {
      id: "phone",
      header: () => <span>{translations["Phone"]}</span>,
    }),
    columnHelper.accessor((row) => row.points, {
      id: "points",
      header: "Points",
    }),
  ];

  if (!participants) return <RateupLoader />;
  return (
    <Stack h={"100%"}>
      <Title>{translations["Participants"]}</Title>
      <PaperLayout p={0} flex={1}>
        <TanstackTable columns={defaultColumns} data={participants} />
      </PaperLayout>
    </Stack>
  );
}
