import {
  ActionIcon,
  Badge,
  Button,
  Group,
  MantineProvider,
  Modal,
  MultiSelect,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import { IconRefresh, IconSend } from "@tabler/icons-react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
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
  CONTACT_SORT,
  WhatsappTableType,
  contactParticipentDetailColumn,
} from "../../../components/Contacts/utils/utils";
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
import styles from "./campaign.module.css";
import ErrorComponent from "../../../components/404/ErrorComponent";

export enum CampaignParticipantsTabs {
  INFO = "info",
  PARTICIPANTS = "participants",
}

const CampaignById = () => {
  const [searchText, setSearchText] = useDebouncedState("", 200);
  const [opened, { open, close }] = useDisclosure(false);
  const [sorting, setSorting] = useState<SortingState>([CONTACT_SORT]);
  const [columnFilters, setColumnFilters] =
    useDebouncedState<ColumnFiltersState>([], 200);
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
  if (isError)
    return (
      <Stack h={"90dvh"}>
        <ErrorComponent refetch={refetchCampaign} />
      </Stack>
    );
  const column: ColumnDef<any>[] = contactParticipentDetailColumn;

  return (
    <MantineProvider theme={whatsappTheme}>
      <Stack className={styles["campaign-id-page-root-div"]}>
        <Title order={2} tt={"uppercase"}>
          {isPending || isFetching ? (
            <Skeleton h={35} w={300} />
          ) : (
            campaignData?.name
          )}
        </Title>
        <Group>
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
          <StartCampaignCard
            campaign={campaignData}
            refetchCampaign={refetchCampaign}
            participantCount={campaignData?.campaignParticipants.length}
          />
          {activeTab === CampaignParticipantsTabs.PARTICIPANTS && (
            <SearchInput
              placeholder={"Search Participants"}
              searchText={searchText}
              setSearchText={setSearchText}
            />
          )}
        </Group>

        <Tabs
          value={activeTab}
          color="var(--tertiary-color)"
          className={styles["tab-panels-container"]}
        >
          <Tabs.Panel value={CampaignParticipantsTabs.INFO}>
            <StartCampaignCardRightSection
              campaign={campaignData}
              refetchCampaign={refetchCampaign}
              campaignInfo={campaignInfo}
            />
            <CampaignInfoCard
              participantCount={campaignData?.campaignParticipants.length}
              stats={campaignData?.stats}
              flowId={campaignData?.flowId}
            />
          </Tabs.Panel>
          <Tabs.Panel value={CampaignParticipantsTabs.PARTICIPANTS} h={"100%"}>
            <PaperLayout p={0} h={"100%"} mah={800}>
              <ContactTable
                columns={column}
                data={filteredParticipants}
                btnTitle="Add"
                toggle={open}
                tab={WhatsappTableType.PARTICIPANTS}
                groupId={campaignData?.id}
                refetch={refetchCampaign}
                setSorting={setSorting}
                sorting={sorting}
                columnFilters={columnFilters}
                setColumnFilters={setColumnFilters}
                isPending={isPending || isFetching}
              />
            </PaperLayout>
            <Modal
              opened={opened}
              onClose={close}
              centered
              size={"xl"}
              radius={"lg"}
              title={
                <Title order={2} pl={"md"}>
                  Add Participants
                </Title>
              }
            >
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

  useEffect(() => {
    if (participantCount) setErrorMsg("");
  }, [participantCount]);

  if (!campaign) return null;

  return (
    <>
      <Button
        variant="outline"
        radius={"xl"}
        disabled={!participantCount}
        onClick={startCampaign ? open : handleChange}
        rightSection={<IconSend size={16} />}
      >
        {startCampaign ? "Resend" : "Send"}
      </Button>
      <ResendCampaignModal
        campaign={campaign}
        close={close}
        opened={resendModalOpened}
      />
    </>
  );
};
const StartCampaignCardRightSection = ({
  campaign,
  refetchCampaign,
  campaignInfo,
}) => {
  if (!campaign) return null;
  return (
    <PaperLayout radius={"md"}>
      <Group justify="space-between">
        <CreateCampaignModal
          isEdit={true}
          campaign={campaign}
          close={() => {}}
        />
        <Group>
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
    </PaperLayout>
  );
};
const CampaignInfoCard = ({ participantCount, stats, flowId }) => {
  const statsArray = [
    { label: "Participants", count: participantCount },
    { label: "Pending", count: stats?.countPending },
    { label: "Sent", count: stats?.countSent },
    { label: "Delivered", count: stats?.countDelivered },
    { label: "Read", count: stats?.countRead },
    { label: "Failed", count: stats?.countFailed, color: "red" },
    // { label: "Responded", count: responseCount ?? 0 },
  ];
  if (flowId) {
    statsArray.push({ label: "Completed", count: stats?.countCompleted });
  }
  return (
    <SimpleGrid cols={3} m={"xl"}>
      {statsArray.map((item) => (
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
