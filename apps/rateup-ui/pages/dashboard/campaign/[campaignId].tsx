import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  MantineProvider,
  Modal,
  MultiSelect,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit, IconRefresh } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { SearchInput } from ".";
import {
  useCampaignById,
  useSendCampaign,
  useUpdateCampaignMutation,
} from "../../../backend/campaign/campaign.query";
import AddParticipantModal from "../../../components/Campaign/AddParticipantModal";
import CreateCampaignModal from "../../../components/Campaign/CreateCampaignModal";
import { renderBadge } from "../../../components/Card/CampaignCard";
import {
  WhatsappTableType,
  contactParticipentDetailColumn,
} from "../../../components/Contacts/utils/utils";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import ContactTable from "../../../components/Table/ContactTable";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { whatsappTheme } from "../../../config/mantineTheme";
import { useRouteParams } from "../../../context/RouteParamsContext";
import {
  CampaignParticipantStatus,
  CampaignStatus,
} from "../../../types/enums";
import { Campaign } from "../../../types/global";
import { getCampaignParticipantStatusLabel } from "../../../utils/enums";
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
        <Stack>
          <Group>
            <Title order={2}>{campaignData?.name}</Title>
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
          <Group justify="space-between" gap={"xl"}>
            <Title order={2}>Participants</Title>
            <SearchInput
              placeholder={"Search Participants"}
              searchText={searchText}
              setSearchText={setSearchText}
            />
            <Box w={50} h={50} />
          </Group>
          <PaperLayout px={0}>
            <ContactTable
              columns={column}
              data={filteredParticipants}
              btnTitle="Add"
              toggle={open}
              topHeight={440}
              tab={WhatsappTableType.PARTICIPANTS}
              groupId={campaignData?.id}
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

interface StartCampaignCardProps {
  campaign: Campaign;
  refetchCampaign: () => void;
  participantCount: number;
}
const StartCampaignCard = ({
  campaign,
  refetchCampaign,
  participantCount,
}: StartCampaignCardProps) => {
  const [startCampaign, setStartCampaign] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resendModalOpened, { open, close }] = useDisclosure(false);

  useEffect(() => {
    if (campaign) {
      setStartCampaign(campaign?.status === CampaignStatus.ACTIVE);
    }
  }, [campaign]);

  const updateCampaign = useUpdateCampaignMutation(
    campaign?.id,
    campaign?.teamId,
  );
  const startCampMutation = useSendCampaign(campaign?.id, campaign?.teamId);
  const handleStartCampaign = (newStartCampaign) => {
    if (newStartCampaign === true) {
      // sending to all participants
      startCampMutation.mutate({
        sendToStatuses: Object.values(CampaignParticipantStatus),
      });
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
    if (!participantCount && !startCampaign) {
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

  if (!campaign) return null;

  useEffect(() => {
    if (participantCount) setErrorMsg("");
  }, [participantCount]);
  return (
    <>
      <PaperLayout radius={"md"}>
        <Stack gap={"xs"}>
          <Group justify={"space-between"}>
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
            <Button
              variant="outline"
              radius={"xl"}
              disabled={!participantCount}
              onClick={open}
            >
              Resend Campaign To
            </Button>
          </Group>
          <Group justify="space-between">
            <Group>
              <Badge
                variant={renderBadge(campaign?.status).variant}
                color={renderBadge(campaign?.status).color}
                size="lg"
                radius={"md"}
              >
                {campaign?.status}
              </Badge>
              <Text c="dimmed">
                {campaign?.startedAt
                  ? `Started at ${dayjs(campaign?.startedAt).format(
                      "DD/MM/YYYY hh:mm A",
                    )}`
                  : null}
              </Text>
            </Group>
            <Group>
              <Title order={3} c={"#149a8a"}>
                {participantCount}
              </Title>
              <Title order={6} c={"#149a8a"}>
                Participants
              </Title>
            </Group>
          </Group>
        </Stack>
        <ResendCampaignModal
          campaign={campaign}
          close={close}
          opened={resendModalOpened}
        />
      </PaperLayout>
    </>
  );
};

const CampaignInfoCard = ({ campaignInfo, campaign }) => {
  const [openedEditModal, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  return (
    <>
      <PaperLayout radius={"md"}>
        <Stack gap={"xs"}>
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
            {campaignInfo?.template && (
              <Group>
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
              </Group>
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

interface ResendCampaignModalProps {
  campaign: Campaign;
  close: () => void;
  opened: boolean;
}
function ResendCampaignModal({
  campaign,
  close,
  opened,
}: ResendCampaignModalProps) {
  const form = useForm({
    initialValues: {
      statuses: [CampaignParticipantStatus.FAILED],
    },
    validate: {
      statuses: (value) => {
        if (!value.length) {
          return "Select at least one status";
        }
        return true;
      },
    },
  });
  const sendMutation = useSendCampaign(campaign.id, campaign.teamId);

  function handleResendClick() {
    sendMutation.mutate(
      { sendToStatuses: form.values.statuses },
      {
        onSuccess: () => {
          close();
        },
      },
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={close}
      size={"lg"}
      centered
      title="Resend Campaign To"
    >
      <Stack gap={"xl"} mt={"xl"}>
        <MultiSelect
          label="Select status of participants to resend campaign to"
          placeholder="Select statuses"
          data={Object.values(CampaignParticipantStatus).map((status) => ({
            value: status,
            label: getCampaignParticipantStatusLabel(status),
          }))}
          {...form.getInputProps("statuses")}
        />
        <Button onClick={handleResendClick}>Resend</Button>
      </Stack>
    </Modal>
  );
}
