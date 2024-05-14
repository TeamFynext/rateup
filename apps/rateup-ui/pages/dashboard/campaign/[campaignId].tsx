import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  MantineProvider,
  Modal,
  MultiSelect,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconRefresh, IconSend } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
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
import { lexend600 } from "../../../utils/fonts";
import style from "./campaign.module.css";

export enum CampaignParticipantsTabs {
  INFO = "info",
  PARTICIPANTS = "participants",
}

const CampaignById = () => {
  const [searchText, setSearchText] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();
  const { campaignId } = router.query;
  const { update } = useRouteParams();
  const { tab = CampaignParticipantsTabs.INFO } = router.query as {
    tab: string;
  };
  let activeTab = tab?.toString() as CampaignParticipantsTabs;

  const {
    data: campaignData,
    isPending,
    isFetching,
    isError,
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
  if (isError)
    return (
      <Group>
        <Text>Error occured refresh data</Text>
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
    );
  const column: ColumnDef<any>[] = contactParticipentDetailColumn;

  return (
    <MantineProvider theme={whatsappTheme}>
      <Stack mx={"xl"}>
        <Title order={2} tt={"uppercase"}>
          {campaignData?.name}
        </Title>
        <Group justify="space-between">
          <SegmentedControl
            data={Object.values(CampaignParticipantsTabs)}
            value={activeTab}
            onChange={(value) =>
              router.push(
                `/dashboard/campaign/${router?.query?.campaignId}?tab=${value}`,
              )
            }
            color={"var(--mantine-color-whatsapp-green-filled)"}
            radius={"md"}
            defaultValue={activeTab}
            tt={"capitalize"}
            miw={200}
          />
          {activeTab === CampaignParticipantsTabs.PARTICIPANTS && (
            <SearchInput
              placeholder={"Search Participants"}
              searchText={searchText}
              setSearchText={setSearchText}
            />
          )}

          <Box w={50} h={50} />
        </Group>
        <Tabs value={activeTab} color="var(--tertiary-color)">
          <Tabs.Panel value={CampaignParticipantsTabs.INFO}>
            <StartCampaignCard
              campaign={campaignData}
              refetchCampaign={refetchCampaign}
              participantCount={campaignData?.campaignParticipants.length}
              campaignInfo={campaignInfo}
            />
            <CampaignInfoCard
              participantCount={campaignData?.campaignParticipants.length}
              campaginParticipants={campaignData?.campaignParticipants}
              responseCount={campaignData?.responseCount}
            />
          </Tabs.Panel>
          <Tabs.Panel value={CampaignParticipantsTabs.PARTICIPANTS}>
            <PaperLayout px={0}>
              <ContactTable
                columns={column}
                data={filteredParticipants}
                btnTitle="Add"
                toggle={open}
                topHeight={310}
                tab={WhatsappTableType.PARTICIPANTS}
                groupId={campaignData?.id}
              />
            </PaperLayout>
            <Modal opened={opened} onClose={close} centered size={"xl"}>
              <AddParticipantModal close={close} campaign={campaignData} />
            </Modal>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </MantineProvider>
  );
};
export default CampaignById;

interface StartCampaignCardProps {
  campaign: Campaign;
  refetchCampaign: () => void;
  participantCount: number;
  campaignInfo;
}
const StartCampaignCard = ({
  campaign,
  refetchCampaign,
  participantCount,
  campaignInfo,
}: StartCampaignCardProps) => {
  const [startCampaign, setStartCampaign] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resendModalOpened, { open, close }] = useDisclosure(false);
  const [openedEditModal, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);

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

  useEffect(() => {
    if (participantCount) setErrorMsg("");
  }, [participantCount]);

  if (!campaign) return null;

  return (
    <PaperLayout radius={"md"}>
      <Stack>
        <Group justify="space-between">
          <CreateCampaignModal
            isEdit={true}
            close={closeEditModal}
            campaign={campaign}
          />
          <Group>
            <Button
              variant="outline"
              radius={"xl"}
              disabled={!participantCount}
              onClick={startCampaign ? open : handleChange}
              rightSection={<IconSend size={16} />}
            >
              {startCampaign ? "Resend" : "Send"}
            </Button>
            <Tooltip label="Refresh data">
              <ActionIcon
                variant="light"
                aria-label="refresh"
                onClick={() => refetchCampaign()}
              >
                <IconRefresh
                  style={{ width: "90%", height: "90%" }}
                  stroke={1.5}
                />
              </ActionIcon>
            </Tooltip>
            <Badge variant="outline" size="xl">
              {campaignInfo?.team}
            </Badge>
          </Group>
        </Group>
      </Stack>
      <ResendCampaignModal
        campaign={campaign}
        close={close}
        opened={resendModalOpened}
      />
    </PaperLayout>
  );
};

const CampaignInfoCard = ({
  participantCount,
  responseCount,
  campaginParticipants,
}) => {
  let stats = campaginParticipants?.[0]?.WaMessageCampaginParticipantMap;
  // Initialize counts
  let countRead = 0;
  let countSent = 0;
  let countFailed = 0;
  let countDelivered = 0;
  let countPending = 0;
  let countError = 0;

  campaginParticipants?.forEach((participants) => {
    if (participants?.status === CampaignParticipantStatus.PENDING)
      countPending++;
    else if (participants?.status === CampaignParticipantStatus.FAILED)
      countError++;
  });
  stats?.forEach((item) => {
    const stats = item?.waMessage?.stats;

    // Increment counts based on the presence of data
    if (stats.read) countRead++;
    if (stats.sent) countSent++;
    if (stats.failed) countFailed++;
    if (stats.delivered) countDelivered++;
  });

  return (
    <SimpleGrid cols={3} m={"xl"}>
      {[
        { label: "Participants", count: participantCount },
        { label: "Pending", count: countPending },
        { label: "Sent", count: countSent },
        { label: "Delivered", count: countDelivered },
        { label: "Read", count: countRead },
        // { label: "Responded", count: responseCount ?? 0 },
        { label: "Failed", count: countFailed + countError, color: "red" },
      ].map((item) => (
        <Stack key={item.label} gap={0} align="center">
          <Text ff={lexend600.style.fontFamily} fz={30}>
            {item.count}
          </Text>
          <Badge
            variant="light"
            radius={"md"}
            color={item.color}
            fullWidth
            p={"lg"}
          >
            {item.label}
          </Badge>
        </Stack>
      ))}
    </SimpleGrid>
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
}: Readonly<ResendCampaignModalProps>) {
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
