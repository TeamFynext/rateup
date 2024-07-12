import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  MantineProvider,
  Modal,
  MultiSelect,
  Radio,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import {
  IconInfoCircle,
  IconRefresh,
  IconSend,
  IconX,
} from "@tabler/icons-react";
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
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import { ContainedDateTimePickerInput } from "../../../components/input/ContainedInput/ContainedInput";
import { z } from "zod";
import { showErrorToast } from "../../../utils/notifications";
import { renderBadge } from "../../../components/Card/CampaignCard";
import { getErrorMessage } from "../../../utils";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(timezone);

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
    isError,
    isRefetching,
    refetch: refetchCampaign,
  } = useCampaignById(campaignId);

  const campaignInfo = {
    template: campaignData?.waTemplate?.data.name,
    team: campaignData?.team.name,
  };

  const participants = campaignData?.campaignParticipants;
  const filteredParticipants = searchText
    ? participants?.filter(
        (p) =>
          p?.contact?.name.toLowerCase().includes(searchText.toLowerCase()) ||
          p?.contact?.phone.includes(searchText),
      )
    : participants;

  const column: ColumnDef<any>[] = contactParticipentDetailColumn;
  const sendMutation = useSendCampaign(campaignData?.id, campaignData?.teamId);

  useEffect(() => {
    if (campaignData) update({ campaignId: campaignData?.name });
  }, [campaignData, update]);

  if (isError)
    return (
      <Stack h={"90dvh"}>
        <ErrorComponent refetch={refetchCampaign} />
      </Stack>
    );
  return (
    <MantineProvider theme={whatsappTheme}>
      <Stack className={styles["campaign-id-page-root-div"]}>
        <Title order={2} tt={"uppercase"}>
          {isPending || isRefetching ? (
            <Skeleton h={35} w={300} />
          ) : (
            campaignData?.name
          )}
        </Title>
        <Group mih={42}>
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
            participantCount={campaignData?.campaignParticipants.length}
            sendMutation={sendMutation}
          />
          {activeTab === CampaignParticipantsTabs.PARTICIPANTS && (
            <SearchInput
              placeholder={"Search Participants"}
              searchText={searchText}
              setSearchText={setSearchText}
            />
          )}
        </Group>
        <Alert
          variant="filled"
          color="red"
          icon={<IconInfoCircle />}
          display={
            campaignData?.errorMessage || sendMutation.isError
              ? "block"
              : "none"
          }
        >
          {getErrorMessage(
            sendMutation.error?.response,
            campaignData?.errorMessage ?? "Error Sending campaign",
          )}
        </Alert>

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
              isPending={isPending}
            />
            <CampaignInfoCard
              participantCount={campaignData?.campaignParticipants.length}
              stats={campaignData?.stats}
              flowId={campaignData?.flowId}
              isPending={isPending || isRefetching}
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
                isPending={isPending || isRefetching}
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
  participantCount: number;
  sendMutation;
}
enum SentCampaignEnum {
  NOW = "NOW",
  LATER = "LATER",
}
const StartCampaignCard = ({
  campaign,
  participantCount,
  sendMutation,
}: StartCampaignCardProps) => {
  const [errorMsg, setErrorMsg] = useState("");
  const [opened, { toggle, close }] = useDisclosure(false);
  const startCampaign = campaign?.status === CampaignStatus.ACTIVE || false;
  const schema = z
    .object({
      campaignSentAt: z.date().nullable(),
      sentCampaignChoice: z.nativeEnum(SentCampaignEnum),
      statuses: z.array(z.nativeEnum(CampaignParticipantStatus)).optional(),
    })
    .superRefine((values, ctx) => {
      if (startCampaign && values.statuses?.length === 0) {
        ctx.addIssue({
          path: ["statuses"],
          code: z.ZodIssueCode.custom,
          message: "Select at least one status",
        });
      }
    });
  const form = useForm({
    initialValues: {
      campaignSentAt: null,
      statuses: [CampaignParticipantStatus.FAILED],
      sentCampaignChoice: SentCampaignEnum.NOW,
    },
    validate: zodResolver(schema),
    onValuesChange: (values) => {
      if (
        values.sentCampaignChoice === SentCampaignEnum.NOW &&
        values.campaignSentAt
      ) {
        form.setFieldValue("campaignSentAt", null);
      } else if (
        values.sentCampaignChoice === SentCampaignEnum.LATER &&
        !values.campaignSentAt
      ) {
        form.setFieldValue(
          "campaignSentAt",
          new Date(
            new Date(new Date().setMinutes(0, 0, 0)).setDate(
              new Date().getDate() + 1,
            ),
          ),
        );
      }
    },
  });

  const handleCampaign = () => {
    const { hasErrors, errors } = form.validate();
    if (hasErrors) {
      showErrorToast(
        (Object.values(errors)?.[0] as string) ??
          "Error in campaign senting data",
      );
      return;
    }
    if (!participantCount && !startCampaign) {
      setErrorMsg("No participants found");
      return;
    }
    if (errorMsg) setErrorMsg("");
    let values = form.getValues();
    if (!startCampaign) {
      values.statuses = Object.values(CampaignParticipantStatus);
    }
    sendMutation.mutate(values, {
      onSettled: () => {
        close();
      },
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
        onClick={toggle}
        rightSection={<IconSend size={16} />}
      >
        {startCampaign ? "Resend" : "Send"}
      </Button>
      <Badge
        variant="light"
        p={"md"}
        color={renderBadge(campaign?.status).color}
      >
        {campaign?.status}{" "}
        {campaign?.campaignSentAt && (
          <>
            {dayjs(campaign?.campaignSentAt).format("YYYY-MM-DD hh:mm A")}{" "}
            {dayjs.tz.guess()}
          </>
        )}{" "}
      </Badge>

      {campaign?.status === CampaignStatus.SCHEDULED && (
        <Tooltip label={"cancel schedule"}>
          <ActionIcon
            size={"sm"}
            variant="light"
            onClick={() => {
              sendMutation.mutate({
                status: CampaignStatus.INACTIVE,
                statuses: [CampaignParticipantStatus.FAILED],
              });
            }}
          >
            <IconX size={18} />
          </ActionIcon>
        </Tooltip>
      )}

      <SendCampaignModal
        close={close}
        opened={opened}
        startCampaign={startCampaign}
        form={form}
        handleCampaign={handleCampaign}
      />
    </>
  );
};
const StartCampaignCardRightSection = ({
  campaign,
  refetchCampaign,
  campaignInfo,
  isPending,
}) => {
  if (isPending) return <Skeleton w={"100%"} h={147} />;
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
const CampaignInfoCard = ({ participantCount, stats, flowId, isPending }) => {
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
    <SimpleGrid cols={{ base: 2, lg: 3 }} m={"xl"}>
      {statsArray.map((item) => (
        <Stack key={item.label} gap={0} align="center">
          {isPending ? (
            <Skeleton w={20} h={25} my={"xs"} />
          ) : (
            <Text ff={lexend600.style.fontFamily} fz={30}>
              {item.count}
            </Text>
          )}

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

interface SendCampaignModalProps {
  close: () => void;
  opened: boolean;
  startCampaign;
  form;
  handleCampaign;
}
function SendCampaignModal({
  close,
  opened,
  startCampaign,
  form,
  handleCampaign,
}: Readonly<SendCampaignModalProps>) {
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={"Campaign Sent Settings"}
      centered
      onSubmit={handleCampaign}
      buttonTitle={
        form.getValues()?.sentCampaignChoice === SentCampaignEnum.LATER
          ? "Schedule Campaign"
          : "Sent Campaign Now"
      }
    >
      <Stack style={{ minHeight: "200px" }}>
        <Radio.Group
          label={startCampaign ? "Resent" : "Sent"}
          withAsterisk
          {...form.getInputProps("sentCampaignChoice", {
            type: "radio",
          })}
        >
          <Group>
            <Radio checked label="Now" value={SentCampaignEnum.NOW} />
            <Radio label="Schedule Later" value={SentCampaignEnum.LATER} />
          </Group>
        </Radio.Group>

        {form.getValues()?.sentCampaignChoice === SentCampaignEnum.LATER && (
          <Stack>
            <ContainedDateTimePickerInput
              valueFormat="DD MMM YYYY - hh mm A"
              dropdownType="modal"
              placeholder={"Date"}
              label={"Sent Campaign At"}
              withAsterisk
              {...form.getInputProps("campaignSentAt")}
              minDate={new Date()}
            />
            <Text c="red" size="xs">
              *Time will be rounded to nearest hours.
            </Text>
          </Stack>
        )}
        {startCampaign && (
          <MultiSelect
            label="Select status of participants to resend campaign to"
            placeholder="Select statuses"
            data={Object.values(CampaignParticipantStatus).map((status) => ({
              value: status,
              label: getCampaignParticipantStatusLabel(status),
            }))}
            {...form.getInputProps("statuses")}
          />
        )}
      </Stack>
    </FormModalLayout>
  );
}
