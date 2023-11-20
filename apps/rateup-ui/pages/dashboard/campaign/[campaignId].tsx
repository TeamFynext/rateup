import {
  Anchor,
  Button,
  Flex,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Title,
  Text,
  Switch,
  Badge,
  Modal,
  MantineProvider,
  Center,
  Loader,
} from "@mantine/core";
import { SearchInput } from ".";
import { useEffect, useState } from "react";
import { IconEdit, IconPlus } from "@tabler/icons-react";
import style from "./campaign.module.css";
import { useDisclosure } from "@mantine/hooks";
import AddParticipantModal from "./AddParticipantModal";
import { useRouter } from "next/router";
import {
  useCampaignById,
  useUpdateCampaignMutation,
} from "../../../backend/campaign/campaign.query";
import { useRouteParams } from "../../../context/RouteParamsContext";
import { renderBadge } from "../../../components/Card/CampaignCard";
import { CampaignStatus } from "../../../types/enums";
import CreateCampaignModal from "./CreateCampaignModal";
import { whatsappTheme } from "../../../config/mantineTheme";
import dayjs from "dayjs";

export default () => {
  const [searchText, setSearchText] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();
  const { campaignId } = router.query;
  const { update } = useRouteParams();

  const {
    data: campaignData,
    isLoading,
    refetch: refetchCampaign,
  } = useCampaignById(campaignId);

  const campaignInfo = {
    survey: campaignData?.surveyTeamMap.survey.title,
    template: campaignData?.waTemplate.data.name,
    team: campaignData?.team.name,
  };

  console.log("campaignData", campaignData);

  useEffect(() => {
    update({ campaignId: campaignData?.name });
  }, [campaignData?.name]);

  const participants = campaignData?.campaignParticipants;
  const filteredParticipants = searchText
    ? participants?.filter(
        (p) =>
          p?.contact?.name.toLowerCase().includes(searchText.toLowerCase()) ||
          p?.contact?.phone.includes(searchText),
      )
    : participants;

  return (
    <>
      <MantineProvider theme={whatsappTheme}>
        {isLoading && (
          <Center>
            <Loader />
          </Center>
        )}
        <Stack p={"md"} gap={"md"}>
          <Title>{campaignData?.name}</Title>
          <SimpleGrid cols={2}>
            <StartCampaignCard
              campaign={campaignData}
              refetchCampaign={refetchCampaign}
              participantCount={campaignData?.campaignParticipants.length}
            />
            <CampaignInfoCard
              campaignInfo={campaignInfo}
              campaign={campaignData?.data}
            />
          </SimpleGrid>
          <Group justify="center" gap={"xl"} mt={"lg"}>
            <Title order={2}>Participants</Title>
            <SearchInput
              placeholder={"Search Participants"}
              searchText={searchText}
              setSearchText={setSearchText}
            />
            <Button
              leftSection={<IconPlus />}
              radius={"xl"}
              size="md"
              onClick={open}
            >
              Add Participants
            </Button>
            <Anchor size="xl">
              <Title order={3}>Results</Title>
            </Anchor>
          </Group>
          {filteredParticipants?.length > 0 ? (
            <SimpleGrid cols={3}>
              {filteredParticipants?.map((participant) => (
                <ParticipantCard
                  participant={participant}
                  key={participant?.id}
                />
              ))}
            </SimpleGrid>
          ) : (
            <Flex justify={"center"} pt={"xl"}>
              <Stack align={"center"}>
                <Title c={"dimmed"} order={3}>
                  No Participants Found
                </Title>
                <Button
                  leftSection={<IconPlus />}
                  radius={"xl"}
                  size="md"
                  onClick={open}
                >
                  Add Participants
                </Button>
              </Stack>
            </Flex>
          )}
          <Modal opened={opened} onClose={close} centered size={"xl"}>
            <AddParticipantModal close={close} campaign={campaignData} />
          </Modal>
        </Stack>
      </MantineProvider>
    </>
  );
};

const StartCampaignCard = ({ campaign, refetchCampaign, participantCount }) => {
  const [startCampaign, setStartCampaign] = useState(false);

  useEffect(() => {
    if (campaign) {
      setStartCampaign(campaign?.status === CampaignStatus.ACTIVE);
    }
  }, [campaign]);

  const updateCampaign = useUpdateCampaignMutation(
    campaign?.id,
    campaign?.teamId,
  );

  const handleStartCampaign = (newStartCampaign) => {
    if (newStartCampaign === true) {
      updateCampaign.mutate(
        { data: { status: CampaignStatus.ACTIVE }, campaignId: campaign?.id },
        { onSuccess: ({ data: response }) => refetchCampaign() },
      );
    } else {
      updateCampaign.mutate(
        {
          data: { status: CampaignStatus.INACTIVE },
          campaignId: campaign?.id,
        },
        { onSuccess: () => refetchCampaign() },
      );
    }
  };

  const handleChange = () => {
    setStartCampaign((prev) => {
      const newStartCampaign = !prev;
      handleStartCampaign(newStartCampaign);
      return newStartCampaign;
    });
  };

  return (
    <>
      <Paper shadow="xl" p={"lg"} radius={"md"}>
        <Stack>
          <Flex justify={"center"}>
            <Switch
              checked={startCampaign}
              label={startCampaign ? "End Campaign" : "Start Campaign"}
              styles={{
                label: {
                  color: "#149A8A",
                  fontWeight: "bold",
                  fontSize: "20px",
                },
              }}
              onChange={handleChange}
            />
          </Flex>
          <Group justify="space-between">
            <Stack gap={0}>
              <Title order={5} c={"#149A8A"}>
                Status
              </Title>
              <Text c="dimmed">
                {dayjs(campaign?.startedAt).format("DD/MM/YYYY HH:MM a")}
              </Text>
              <Badge
                variant={renderBadge(campaign?.status).variant}
                color={renderBadge(campaign?.status).color}
              >
                {campaign?.status}
              </Badge>
            </Stack>
            <Stack gap={0} align={"center"}>
              <Title order={3} c={"#149a8a"}>
                {participantCount}
              </Title>
              <Title order={6} c={"#149a8a"}>
                Participants
              </Title>
            </Stack>
          </Group>
        </Stack>
      </Paper>
    </>
  );
};

const CampaignInfoCard = ({ campaignInfo, campaign }) => {
  const [openedEditModal, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  return (
    <>
      <Paper shadow="xl" p="lg" radius={"md"}>
        <Stack>
          <Group justify="space-between">
            <Group>
              <Title order={3}>Campaign Info</Title>
              <Button
                variant="outline"
                leftSection={<IconEdit />}
                radius={"xl"}
                onClick={openEditModal}
              >
                Edit
              </Button>
            </Group>
            <Badge variant="outline" size="xl">
              {campaignInfo?.team}
            </Badge>
          </Group>
          <Group justify="space-between">
            <Stack gap={0}>
              <Title order={6}>Selected Survey</Title>
              <Badge
                variant="default"
                classNames={{ root: style.input, label: style.badgeLabel }}
                size={"xl"}
                radius={"md"}
              >
                {campaignInfo?.survey}
              </Badge>
            </Stack>
            <Stack gap={0}>
              <Title order={6}>Selected Template</Title>
              <Badge
                variant="default"
                classNames={{ root: style.input, label: style.badgeLabel }}
                size={"xl"}
                radius={"md"}
              >
                {campaignInfo?.template}
              </Badge>
            </Stack>
          </Group>
        </Stack>
        <Modal
          opened={openedEditModal}
          onClose={closeEditModal}
          size={"lg"}
          centered
        >
          <CreateCampaignModal
            isEdit={true}
            close={closeEditModal}
            campaign={campaign}
          />
        </Modal>
      </Paper>
    </>
  );
};

const ParticipantCard = ({ participant }) => {
  return (
    <>
      <Paper shadow="xl" p="lg" radius={"md"}>
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={4}>{participant?.contact?.name}</Title>
            <Text c={"dimmed"}>{participant?.contact?.phone}</Text>
          </Stack>
          <Badge
            variant={renderBadge(participant?.status).variant}
            color={renderBadge(participant?.status).color}
            radius={"md"}
            size="xl"
          >
            {participant?.status}
          </Badge>
        </Group>
      </Paper>
    </>
  );
};
