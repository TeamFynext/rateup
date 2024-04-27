import {
  ActionIcon,
  Badge,
  Button,
  Flex,
  Group,
  MantineProvider,
  Modal,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit, IconPlus, IconRefresh } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { SearchInput } from ".";
import {
  useCampaignById,
  useStartCampaign,
  useUpdateCampaignMutation,
} from "../../../backend/campaign/campaign.query";
import AddParticipantModal from "../../../components/Campaign/AddParticipantModal";
import CreateCampaignModal from "../../../components/Campaign/CreateCampaignModal";
import { renderBadge } from "../../../components/Card/CampaignCard";
import { contactParticipentDetailColumn } from "../../../components/Contacts/utils/utils";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import TanstackTable from "../../../components/Table/TanstackTable";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { whatsappTheme } from "../../../config/mantineTheme";
import { useRouteParams } from "../../../context/RouteParamsContext";
import { CampaignStatus } from "../../../types/enums";
import style from "./campaign.module.css";

const CampaignById = () => {
  const [searchText, setSearchText] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();
  const { campaignId } = router.query;
  const { update } = useRouteParams();

  const {
    data: campaignData,
    isPending,
    isFetching,
    refetch: refetchCampaign,
  } = useCampaignById(campaignId);

  const campaignInfo = {
    template: campaignData?.waTemplate?.data.name,
    team: campaignData?.team.name,
  };

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
  if (isPending) return <RateupLoader h="90dvh" />;

  const column: ColumnDef<any>[] = contactParticipentDetailColumn;

  return (
    <>
      <MantineProvider theme={whatsappTheme}>
        <Stack p={"md"} gap={"md"}>
          <Group>
            <Title>{campaignData?.name}</Title>
            <Tooltip label="Refresh data">
              <ActionIcon
                variant="light"
                aria-label="refresh"
                onClick={() => refetchCampaign()}
              >
                <IconRefresh
                  className={isFetching ? style.rotateInfinitely : undefined}
                  style={{ width: "90%", height: "90%" }}
                  stroke={1.5}
                />
              </ActionIcon>
            </Tooltip>
          </Group>

          <SimpleGrid cols={2}>
            <StartCampaignCard
              campaign={campaignData}
              refetchCampaign={refetchCampaign}
              participantCount={campaignData?.campaignParticipants.length}
            />
            <CampaignInfoCard
              campaignInfo={campaignInfo}
              campaign={campaignData}
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
          </Group>
          <PaperLayout px={0}>
            <TanstackTable
              columns={column}
              data={filteredParticipants}
              btnTitle="Add"
              toggle={open}
              disableFuzzyFnCustom={true}
            />
          </PaperLayout>
          <Modal opened={opened} onClose={close} centered size={"xl"}>
            <AddParticipantModal close={close} campaign={campaignData} />
          </Modal>
        </Stack>
      </MantineProvider>
    </>
  );
};
export default CampaignById;
const StartCampaignCard = ({ campaign, refetchCampaign, participantCount }) => {
  const [startCampaign, setStartCampaign] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (campaign) {
      setStartCampaign(campaign?.status === CampaignStatus.ACTIVE);
    }
  }, [campaign]);

  const updateCampaign = useUpdateCampaignMutation(
    campaign?.id,
    campaign?.teamId,
  );
  const startCampMutation = useStartCampaign(campaign?.id, campaign?.teamId);
  const handleStartCampaign = (newStartCampaign) => {
    if (newStartCampaign === true) {
      startCampMutation.mutate(campaign?.id);
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
    if (!participantCount) {
      setErrorMsg("No participants found");
      return;
    }
    if (errorMsg) setErrorMsg("");
    setStartCampaign((prev) => {
      const newStartCampaign = !prev;
      handleStartCampaign(newStartCampaign);
      return newStartCampaign;
    });
  };

  return (
    <>
      <PaperLayout p={"lg"} radius={"md"}>
        <Stack gap={"xl"}>
          <Flex justify={"center"} mb={"lg"}>
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
              error={errorMsg}
            />
          </Flex>
          <Group justify="space-between">
            <Stack gap={0}>
              <Title order={5} c={"#149A8A"}>
                Status
              </Title>
              <Text c="dimmed">
                {campaign?.startedAt
                  ? `Started at ${dayjs(campaign?.startedAt).format(
                      "DD/MM/YYYY hh:mm A",
                    )}`
                  : null}
              </Text>
              <Badge
                variant={renderBadge(campaign?.status).variant}
                color={renderBadge(campaign?.status).color}
                size="lg"
                radius={"md"}
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
      </PaperLayout>
    </>
  );
};

const CampaignInfoCard = ({ campaignInfo, campaign }) => {
  const [openedEditModal, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  return (
    <>
      <PaperLayout p="lg" radius={"md"}>
        <Stack gap={"xl"}>
          <Group justify="space-between" mb={"lg"}>
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
            {campaignInfo?.template && (
              <Stack gap={"xs"}>
                <Title order={6}>Selected Template</Title>
                <Badge
                  variant="default"
                  classNames={{ root: style.input, label: style.badgeLabel }}
                  size={"xl"}
                  radius={"md"}
                  miw={200}
                >
                  {campaignInfo?.template}
                </Badge>
              </Stack>
            )}
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
      </PaperLayout>
    </>
  );
};
