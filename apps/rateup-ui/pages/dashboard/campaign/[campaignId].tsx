import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  MantineProvider,
  Modal,
  MultiSelect,
  Progress,
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
import { useForm } from "@mantine/form";
import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import {
  IconEye,
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
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { z } from "zod/v4";

import { useCampaignParticipants } from "@/backend/campaign/campaignParticipants/campaignParticipants.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import useTranslations from "@/dictionaries/useTranslation";
import { PAGE_SIZE } from "@/utils/constants";

import { SearchInput } from ".";
import {
  useCampaignById,
  useCampaignResponseDownloadById,
  useCampaignStatsById,
  useSendCampaign,
} from "../../../backend/campaign/campaign.query";
import ErrorComponent from "../../../components/404/ErrorComponent";
import AddParticipantModal from "../../../components/Campaign/AddParticipantModal";
import CreateCampaignModal from "../../../components/Campaign/CreateCampaignModal";
import { renderBadge } from "../../../components/Card/CampaignCard";
import {
  CONTACT_SORT,
  contactParticipentDetailColumn,
  WhatsappTableType,
} from "../../../components/Contacts/utils/utils";
import { ContainedDateTimePickerInput } from "../../../components/input/ContainedInput/ContainedInput";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import ContactTable from "../../../components/Table/ContactTable";
import { whatsappTheme } from "../../../config/mantineTheme";
import { useRouteParams } from "../../../context/RouteParamsContext";
import {
  CampaignParticipantStatus,
  CampaignStatus,
} from "../../../types/enums";
import { Campaign } from "../../../types/global";
import { getErrorMessage } from "../../../utils";
import { getCampaignParticipantStatusLabel } from "../../../utils/enums";
import { showErrorToast, showLoadingToast } from "../../../utils/notifications";
import styles from "./campaign.module.css";

dayjs.extend(timezone);

export enum CampaignParticipantsTabs {
  INFO = "info",
  PARTICIPANTS = "participants",
}

const CampaignById = () => {
  const [searchText, setSearchText] = useDebouncedState("", 200);
  const [opened, { open, close }] = useDisclosure(false);
  const { translations } = useTranslations();
  const [sorting, setSorting] = useState<SortingState>([CONTACT_SORT]);
  const [columnFilters, setColumnFilters] =
    useDebouncedState<ColumnFiltersState>([], 200);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE[0],
  });
  const router = useRouter();
  const { campaignId } = router.query;
  const { update } = useRouteParams();
  const { tab = CampaignParticipantsTabs.INFO } = router.query as {
    tab: string;
  };
  let activeTab = tab?.toString() as CampaignParticipantsTabs;
  const mut = useCampaignResponseDownloadById();

  const {
    data: campaignData,
    isPending,
    isError,
    isRefetching,
    refetch: refetchCampaign,
  } = useCampaignById(campaignId);

  const {
    data: filteredParticipants,
    isPending: isPendingParticipant,
    isError: isParticipantsError,
    isRefetching: isRefetchingParticipants,
    refetch: refetchParticipants,
  } = useCampaignParticipants(
    campaignId,
    pagination,
    searchText,
    sorting,
    columnFilters,
  );

  const {
    data: campaignStats,
    isPending: isPendingStats,
    isError: isStatsError,
    isRefetching: isRefetchingStats,
    refetch: refetchStats,
  } = useCampaignStatsById(campaignId);

  const campaignInfo = {
    template: campaignData?.templateData?.name,
    team: campaignData?.teamName,
  };

  const column: ColumnDef<any>[] = contactParticipentDetailColumn;
  const sendMutation = useSendCampaign(campaignData?.id, campaignData?.teamId);

  useEffect(() => {
    if (campaignData) update({ campaignId: campaignData?.name });
  }, [campaignData, update]);

  const dynamicVariables = useMemo(
    () =>
      campaignData?.templateData?.components?.find(
        (data) => data.example?.body_text,
      )?.example?.body_text?.[0],
    [campaignData?.templateData?.components],
  );
  const refetch = () => {
    refetchCampaign();
    refetchStats();
  };

  if (isError || isParticipantsError || isStatsError)
    return <ErrorComponent refetch={refetchCampaign} />;
  return (
    <MantineProvider theme={whatsappTheme}>
      <Stack className={styles["campaign-id-page-root-div"]}>
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
            participantCount={filteredParticipants?.totalCount}
            sendMutation={sendMutation}
            queueCount={campaignStats?.queueCount}
            totalCount={filteredParticipants?.totalCount}
          />
          {activeTab === CampaignParticipantsTabs.PARTICIPANTS && (
            <SearchInput
              placeholder={translations["Search Participants"]}
              searchText={searchText}
              setSearchText={setSearchText}
            />
          )}
          <RateupButtonPrimary
            title="Delivery Report"
            onClick={() => {
              mut.mutate(campaignId);
              showLoadingToast("Generating report", "delivery-report");
            }}
          />
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
            campaignData?.errorMessage ??
              translations["Error Sending campaign"],
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
              refetchCampaign={refetch}
              campaignInfo={campaignInfo}
              isPending={isPending}
              dynamicVariables={dynamicVariables}
            />
            <CampaignInfoCard
              participantCount={filteredParticipants?.totalCount}
              stats={campaignStats}
              flowId={campaignData?.flowId}
              isPending={
                isPendingParticipant ||
                isRefetchingParticipants ||
                isPendingStats ||
                isRefetchingStats
              }
            />
          </Tabs.Panel>
          <Tabs.Panel value={CampaignParticipantsTabs.PARTICIPANTS} h={"100%"}>
            <PaperLayout p={0} h={"100%"} mah={800}>
              <ContactTable
                columns={column}
                data={filteredParticipants?.participants}
                btnTitle="Add"
                toggle={open}
                tab={WhatsappTableType.PARTICIPANTS}
                groupId={campaignData?.id}
                refetch={refetchParticipants}
                setSorting={setSorting}
                sorting={sorting}
                columnFilters={columnFilters}
                setColumnFilters={setColumnFilters}
                isPending={isPendingParticipant}
                setPagination={setPagination}
                pagination={pagination}
                totalCount={filteredParticipants?.searchCount}
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
                  {translations["Add Participants"]}
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
  queueCount: number;
  totalCount: number;
}
enum SentCampaignEnum {
  NOW = "NOW",
  LATER = "LATER",
}
const StartCampaignCard = ({
  campaign,
  participantCount,
  sendMutation,
  queueCount = 0,
  totalCount = 0,
}: StartCampaignCardProps) => {
  const [errorMsg, setErrorMsg] = useState("");
  const { translations } = useTranslations();
  const [opened, { toggle, close }] = useDisclosure(false);
  const startCampaign = campaign?.status === CampaignStatus.ACTIVE || false;
  const schema = z
    .object({
      campaignSentAt: z.date().nullable(),
      sentCampaignChoice: z.nativeEnum(SentCampaignEnum),
      statuses: z.array(z.nativeEnum(CampaignParticipantStatus)).optional(),
    })
    .check((ctx) => {
      const { value: values } = ctx;
      if (startCampaign && values.statuses?.length === 0) {
        ctx.issues.push({
          path: ["statuses"],
          code: "custom",
          message: translations["Select at least one status"],
          input: "",
        });
      }
    });
  const form = useForm({
    initialValues: {
      campaignSentAt: null,
      statuses: [CampaignParticipantStatus.FAILED],
      sentCampaignChoice: SentCampaignEnum.NOW,
    },
    validate: zod4Resolver(schema),
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
          translations["Error in campaign senting data"],
      );
      return;
    }
    if (!participantCount && !startCampaign) {
      setErrorMsg(translations["No participants found"]);
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
      {campaign?.status !== CampaignStatus.SCHEDULED && (
        <Button
          variant="outline"
          radius={"xl"}
          disabled={!participantCount}
          onClick={toggle}
          rightSection={<IconSend size={16} />}
        >
          {startCampaign ? translations["Resend"] : translations["Send"]}
        </Button>
      )}

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
      {queueCount > 0 && (
        <Stack gap={0} align="center">
          <Tooltip label={queueCount + " participants in queue"}>
            <Progress value={100 - (queueCount / totalCount) * 100} w={100} />
          </Tooltip>
        </Stack>
      )}
      {queueCount > 0 &&
        ![CampaignStatus.DEQUEUING, CampaignStatus.QUEUING].includes(
          campaign?.status,
        ) && (
          <Tooltip label={translations["cancel schedule"]}>
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
  dynamicVariables,
}) => {
  const { translations } = useTranslations();
  const router = useRouter();
  if (isPending) return <Skeleton w={"100%"} h={147} />;
  if (!campaign) return null;
  return (
    <PaperLayout radius={"md"}>
      <Group justify="space-between">
        <CreateCampaignModal
          isEdit={true}
          campaign={campaign}
          close={() => {}}
          dynamicVariables={dynamicVariables}
        />
        <Stack>
          <Group>
            <Tooltip label={translations["Refresh data"]}>
              <ActionIcon
                variant="light"
                aria-label={translations["refresh"]}
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
          {campaignInfo?.flowId && (
            <RateupButtonPrimary
              title="View Responses"
              rightIcon={<IconEye size={14} />}
              size="xs"
              variant="light"
              onClick={() =>
                router.push(
                  `whatsapp/flows/v${campaignInfo.flowVersion ?? 1}/${campaignInfo.flowId}}?tab=Result`,
                )
              }
            />
          )}
        </Stack>
      </Group>
    </PaperLayout>
  );
};
const CampaignInfoCard = ({ participantCount, stats, flowId, isPending }) => {
  const { translations } = useTranslations();
  const statsArray = [
    { label: translations["Participants"], count: participantCount },
    { label: translations["Pending"], count: stats?.countPending },
    { label: translations["Sent"], count: stats?.countSent },
    { label: translations["Delivered"], count: stats?.countDelivered },
    { label: translations["Read"], count: stats?.countRead },
    { label: translations["Failed"], count: stats?.countFailed, color: "red" },
    // { label: "Responded", count: responseCount ?? 0 },
  ];
  if (flowId) {
    statsArray.push({
      label: translations["Completed"],
      count: stats?.countCompleted,
    });
  }
  return (
    <SimpleGrid cols={{ base: 2, lg: 3 }} m={"xl"}>
      {statsArray.map((item) => (
        <Stack key={item.label} gap={0} align="center">
          {isPending ? (
            <Skeleton w={20} h={25} my={"xs"} />
          ) : (
            <Text fw={600} fz={30}>
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
  const { translations } = useTranslations();
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={translations["Campaign Sent Settings"]}
      centered
      onSubmit={handleCampaign}
      buttonTitle={
        form.getValues()?.sentCampaignChoice === SentCampaignEnum.LATER
          ? translations["Schedule Campaign"]
          : translations["Sent Campaign Now"]
      }
    >
      <Stack style={{ minHeight: "200px" }}>
        <Radio.Group
          label={startCampaign ? translations["Resent"] : translations["Sent"]}
          withAsterisk
          {...form.getInputProps("sentCampaignChoice", {
            type: "radio",
          })}
        >
          <Group>
            <Radio
              checked
              label={translations["Now"]}
              value={SentCampaignEnum.NOW}
            />
            <Radio
              label={translations["Schedule Later"]}
              value={SentCampaignEnum.LATER}
            />
          </Group>
        </Radio.Group>

        {form.getValues()?.sentCampaignChoice === SentCampaignEnum.LATER && (
          <Stack>
            <ContainedDateTimePickerInput
              valueFormat="DD MMM YYYY - hh mm A"
              dropdownType="modal"
              placeholder={translations["Date"]}
              label={translations["Sent Campaign At"]}
              withAsterisk
              {...form.getInputProps("campaignSentAt")}
              minDate={new Date()}
            />
            <Text c="red" size="xs">
              {translations["*Time will be rounded to nearest hours."]}
            </Text>
          </Stack>
        )}
        {startCampaign && (
          <MultiSelect
            label={
              translations[
                "Select status of participants to resend campaign to"
              ]
            }
            placeholder={translations["Select statuses"]}
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
