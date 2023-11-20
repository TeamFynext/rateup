import { Badge, Group, Paper, Stack, Title, Text } from "@mantine/core";
import { useTeamsByUser } from "../../backend/team/team.query";
import { CampaignParticipantStatus, CampaignStatus } from "../../types/enums";
import { useRouter } from "next/router";
import dayjs from "dayjs";

const CampaignCard = ({ campaign }) => {
  const router = useRouter();
  const { data: teamsData } = useTeamsByUser();
  const teamObj = teamsData?.data?.find((team) => {
    return team?.id === campaign?.teamId;
  });

  return (
    <>
      <Paper
        shadow={"xl"}
        p={"md"}
        radius={"md"}
        style={{
          cursor: "pointer",
        }}
        onClick={() => {
          router.push(`campaign/${campaign?.id}`);
        }}
      >
        <Stack gap={"md"}>
          <Title order={3}>{campaign?.name}</Title>
          <Group justify={"space-between"}>
            <Group gap={1}>
              <Title order={3} c="#149a8a">
                {campaign?._count.campaignParticipants}
              </Title>
              <Text c="dimmed">responses</Text>
            </Group>
            <Badge
              color={renderBadge(campaign?.status).color}
              variant={renderBadge(campaign?.status).variant}
              radius={"sm"}
              size={"lg"}
              styles={{
                label: { textTransform: "capitalize" },
              }}
            >
              {campaign?.status}
            </Badge>
          </Group>
          <Group justify={"space-between"}>
            <Text c="dimmed">
              created on {dayjs(campaign?.createdAt).format("DD-MM-YYYY")}
            </Text>
            <Badge variant="outline" size="lg">
              {teamObj?.name}
            </Badge>
          </Group>
        </Stack>
      </Paper>
    </>
  );
};

export const renderBadge = (badgeType) => {
  switch (badgeType) {
    case CampaignStatus.ACTIVE:
    case CampaignParticipantStatus.SENT:
      return { variant: "light", color: "#149A8A" };
    case CampaignStatus.INACTIVE:
    case CampaignParticipantStatus.FAILED:
      return { variant: "light", color: "red" };
    case CampaignStatus.COMPLETED:
      return { variant: "filled", color: "#149A8A" };
    default:
      return { variant: "filled", color: "#149A8A" };
  }
};

export default CampaignCard;
