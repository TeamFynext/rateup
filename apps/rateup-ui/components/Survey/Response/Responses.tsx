import { useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";

import { Box, Button, Flex, Group, Popover, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconDatabaseImport,
  IconFileDownload,
  IconRefresh,
  IconTableExport,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { Range } from "react-date-range";

import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import { DateRangePickerButton } from "@/components/reputationManagement/misc/DateRangePicker";

import { useCampaignFilterForFlows } from "../../../backend/campaign/campaign.query";
import { useQuestions } from "../../../backend/surveys/questions/questions.query";
import {
  useDeleteResponse,
  useDownloadExcelResponse,
  useExportContactResponses,
  useSyncResponseToGoogleSheet,
} from "../../../backend/surveys/response/response.query";
import SurveyContext from "../../../context/SurveyContext";
import { useUser } from "../../../context/UserContext";
import {
  IntegratedApps,
  PageType,
  QuestionType,
  SubscriptionFeaturePathName,
  SurveyType,
} from "../../../types/enums";
import { docsPath } from "../../../utils/constants";
import { TicketType } from "../../../utils/enums/ticket";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "../../../utils/notifications";
import { hasFeature } from "../../../utils/subscription/subscription";
import InfoButton from "../../Button/InfoButton";
import { RateupButtonSecondary } from "../../Button/RateupButtons";
import RefreshButton from "../../Button/RefreshButton";
import { useVisibleColumnStore } from "../../HomePage/pages/Pricing/store/RouteAndCartStore";
import {
  ContainedMultiSelect,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import RateupLoader from "../../Loaders/RateupLoader";
import ConfirmationModal from "../../Modal/ConfirmationModal";
import FormModalLayout from "../../Modal/FormModalLayout";
import NothingFound from "../../NothingFound/NothingFound";
import Heading from "../../styled/Heading/Heading";
import TanstackTable from "../../Table/TanstackTable";
import CreateTicketModal from "../../Tickets/CreateTicketModal";
import { useSurveyResponseColumns } from "./Columns";
import styles from "./Responses.module.css";

dayjs.extend(utc);
dayjs.extend(timezone);

const Responses = ({
  survey,
  responses,
  defaultLanguage,
  isLoading,
  selectedTeamId,
  subscription,
}) => {
  const surveyId = survey?.id;
  const { surveyTeamMapId, filterTeams } = useContext(SurveyContext);
  const [selectedRowId, setSelectedRowId] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const { user } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [
    createTicketOpened,
    { open: openTicketModal, close: closeTicketModal },
  ] = useDisclosure(false);
  const [selectedResponseId, setSelectedResponseId] = useState("");
  const [responseTeamId, setResponseTeamId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const syncResponseToGoogleSheet = useSyncResponseToGoogleSheet(surveyId);
  const { data: googleAccessToken } = useIntegrationByType(
    IntegratedApps.googlesheet,
  );
  const [alertModalOpened, { open: alertModalOpen, close: alertModalClose }] =
    useDisclosure(false);
  const [
    redirectModalOpened,
    { open: redirectModalOpen, close: redirectModalClose },
  ] = useDisclosure(false);
  const [openedExport, { toggle }] = useDisclosure(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [ranges, setRange] = useState<Range[]>([]);
  const router = useRouter();
  const hasContactQuestion =
    responses &&
    responses?.some((response) =>
      response?.responses?.some((res) => QuestionType.Contact === res.type),
    );
  const deleteResponse = useDeleteResponse(
    surveyId,
    surveyTeamMapId,
    close,
    setIsDeleting,
  );

  // TODO: find out why surveyId is an array
  if (Array.isArray(surveyId)) {
    throw new Error("surveyId is an array");
  }
  const {
    isPending: isQLoading,
    error: QError,
    data: questions,
  } = useQuestions(surveyId);

  const exportContactMutation = useExportContactResponses(surveyId);

  //The below filtering should be done in the backend
  const [campaignFlowFilter, setCampaignFlowFilter] = useState<
    {
      campaignId: string;
      campaignName: string;
      participantsContactIds: string[];
    }[]
  >([]);
  const {
    data: CFData,
    error: CFError,
    isLoading: CFLoading,
  } = useCampaignFilterForFlows(surveyId);
  function handleCampaignFlowFilter(responses) {
    if (campaignFlowFilter.length === 0) return responses;
    return responses.filter((response) =>
      campaignFlowFilter.some((campaign) =>
        campaign.participantsContactIds.includes(response.contactId),
      ),
    );
  }
  //
  const downloadExcelResponse = useDownloadExcelResponse();
  function handleExportContacts() {
    showLoadingToast(
      "Exporting Contact responses to Contacts...",
      "export-contacts",
      true,
    );
    exportContactMutation.mutate();
  }
  const handleExcelDownload = useCallback(() => {
    downloadExcelResponse.mutate({
      defaultLanguage,
      surveyId,
      visibleColumn: useVisibleColumnStore.getState().visibleColumn,
      title: survey?.title,
      tz: dayjs.tz.guess(),
      filterTeams,
      campaignIds: campaignFlowFilter?.map((data) => data.campaignId),
    });
  }, [
    campaignFlowFilter,
    defaultLanguage,
    downloadExcelResponse,
    filterTeams,
    survey?.title,
    surveyId,
  ]);

  useEffect(() => {
    setVerifyEmail("");
  }, [opened]);

  useEffect(() => {
    selectedResponseId && responseTeamId && openTicketModal();
  }, [selectedResponseId, responseTeamId]);

  useEffect(() => {
    !createTicketOpened && setSelectedResponseId("");
  }, [createTicketOpened]);

  const confirmDelete = () => {
    if (user?.email === verifyEmail) {
      notifications.show({
        id: "load-data",
        loading: true,
        title: "Deleting Response",
        message: `Hold on, response is getting deleted...`,
        autoClose: false,
        withCloseButton: false,
      });
      setIsDeleting(true);
      deleteResponse.mutate(selectedRowId);
    } else {
      notifications.show({
        id: "load-data",
        color: "red",
        title: "Error",
        message: "Incorrect email",
        icon: <IconX size="1rem" />,
        autoClose: 3000,
      });
    }
  };
  const columns = useSurveyResponseColumns({
    questions: !isQLoading
      ? questions
          .filter((q) => q.type !== QuestionType.InfoMessage)
          .filter((q) => (q.type in PageType ? false : true))
      : [],
    defaultLanguage,
    setSelectedRowId,
    open,
    setSelectedResponseId,
    setResponseTeamId,
    enableTicket:
      survey?.enableTickets &&
      hasFeature(subscription, SubscriptionFeaturePathName.Ticket),
    surveyId: survey?.id,
    typeWa:
      survey?.type === SurveyType.WhatsApp ||
      survey?.type === SurveyType.WaFlow,
  });

  const handleSyncGoogleSheet = () => {
    setIsSyncing(true);
    if (!googleAccessToken) {
      setIsSyncing(false);
      setAlertMsg("Please sync your Google account in the App & Services.");
      redirectModalOpen();
    } else {
      syncResponseToGoogleSheet.mutate(
        { surveyId },
        {
          onSuccess: () => {
            setIsSyncing(false);
            showSuccessToast(
              "Response synced to Google sheet successfully",
              "success",
              <IconCheck />,
            );
            toggle();
          },
          onError: (error: any) => {
            setIsSyncing(false);
            console.log(error);
            if (error.response.data?.error === "invalid_grant") {
              setAlertMsg(
                "Your access has been revoked. Please sign out and sign in again in the Apps & Services",
              );
              redirectModalOpen();
            } else {
              toggle();
              showErrorToast("Error in syncing response");
            }
          },
        },
      );
    }
  };

  useEffect(() => {
    if (refreshing) {
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    if (!responses || !responses?.length) return;
    if (ranges.length === 0) {
      const endDate = dayjs();
      let startDate = dayjs();
      responses
        ?.map((res) => dayjs(res.createdAt))
        .forEach((responseDate) => {
          if (responseDate.isBefore(startDate)) startDate = responseDate;
        });
      setRange([
        {
          startDate: startDate?.toDate(),
          endDate: endDate.toDate(),
          key: "selection",
        },
      ]);
    }
  }, [ranges, responses]);

  if (isQLoading || isLoading) return <RateupLoader />;
  if (QError) return <Text>An error has occurred</Text>;

  const responseCount = responses?.length;

  const filteredResponses = ranges[0]
    ? responses.filter((response) =>
        dayjs(response.createdAt).isBetween(
          ranges[0].startDate,
          ranges[0].endDate,
          "day",
          "[]",
        ),
      )
    : responses;

  return (
    <Stack className={styles["responses-root-div"]}>
      <CreateTicketModal
        createTicketOpened={createTicketOpened}
        openTicketModal={openTicketModal}
        closeTicketModal={closeTicketModal}
        selectedTeamId={responseTeamId}
        type={TicketType.SURVEY_RESPONSE}
        surveyResponseId={selectedResponseId}
      />

      <Group className={styles["total-responses-export-btn-container"]}>
        <Flex align={"center"}>
          <Heading subtitle={`Total Responses : ${responseCount}`} />
          <RefreshButton queryKeys={["allresponses"]} />
        </Flex>

        <DateRangePickerButton
          onChange={(r) => setRange(r ? [r["selection"]] : [])}
          ranges={ranges}
        />

        <Group>
          {CFData && CFData.length > 0 && (
            <ContainedMultiSelect
              placeholder="Filter By Campaign"
              onChange={(value) =>
                setCampaignFlowFilter(
                  CFData.filter((c) => value.includes(c.campaignId)),
                )
              }
              data={CFData.map(({ campaignName, campaignId }) => ({
                value: campaignId,
                label: campaignName,
              }))}
            />
          )}
          {!survey?.isEncrypted && (
            <Popover
              position="bottom-end"
              withArrow
              shadow="md"
              classNames={{
                dropdown: styles["filters-popover-dropdown-div"],
              }}
              opened={openedExport}
            >
              <Popover.Target>
                <Button
                  className={styles["export-btn"]}
                  leftSection={<IconTableExport />}
                  radius={"lg"}
                  fw={400}
                  onClick={toggle}
                >
                  Export
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack>
                  <RateupButtonSecondary
                    title={
                      survey.spreadSheetId
                        ? "Resync with Google Sheet"
                        : "Sync with Google Sheet"
                    }
                    onClick={() => {
                      if (survey.spreadSheetId) alertModalOpen();
                      else handleSyncGoogleSheet();
                    }}
                    leftIcon={
                      <IconRefresh
                        className={
                          isSyncing ? styles.rotateInfinitely : undefined
                        }
                        style={{ width: "90%", height: "90%" }}
                        stroke={1.5}
                      />
                    }
                  />
                  <RateupButtonSecondary
                    onClick={() => {
                      handleExcelDownload();
                      toggle();
                    }}
                    title={"Download Excel"}
                    radius={"lg"}
                    leftIcon={<IconFileDownload stroke={1.5} />}
                  />
                  {hasContactQuestion && (
                    <RateupButtonSecondary
                      onClick={handleExportContacts}
                      title={"Export Contacts"}
                      radius={"lg"}
                      leftIcon={<IconDatabaseImport stroke={1.5} />}
                    />
                  )}
                  <ConfirmationModal
                    opened={alertModalOpened}
                    onClose={alertModalClose}
                    headerTitle="Resync Google Sheet"
                    headerLabel="Are you sure you want to resync the response to sheet? All previous changes made to the sheet will be lost."
                    confirmLabel="Yes"
                    onConfirm={handleSyncGoogleSheet}
                  />
                  <ConfirmationModal
                    opened={redirectModalOpened}
                    onClose={redirectModalClose}
                    headerTitle="Sync Google Sheet"
                    headerLabel={alertMsg}
                    confirmLabel="Continue"
                    onConfirm={() => {
                      router.push("/dashboard/apps&services/googlesheet");
                    }}
                  />
                </Stack>
              </Popover.Dropdown>
            </Popover>
          )}
          <InfoButton docUrl={`${docsPath}/advancedFt/resultexport`} />
        </Group>
      </Group>

      {responseCount > 0 ? (
        <Box className={styles["responses-table-container"]}>
          <TanstackTable
            data={handleCampaignFlowFilter(filteredResponses)}
            columns={columns}
          />
          <FormModalLayout
            opened={opened}
            onClose={close}
            title="Delete Response"
            centered
            buttonTitle="Delete"
            includeCancelButton
            onSubmit={confirmDelete}
          >
            <Stack py={"sm"}>
              <Text>To proceed further, verify your email id.</Text>
              <ContainedTextField
                withAsterisk
                label="Verify email"
                placeholder="Enter your login email"
                required
                value={verifyEmail}
                onChange={(e) => setVerifyEmail(e.target.value)}
              />
              <Text c="red">
                Once deleted, response entry data will be lost.
              </Text>
            </Stack>
          </FormModalLayout>
        </Box>
      ) : (
        <NothingFound text="No responses yet" />
      )}
    </Stack>
  );
};

export default Responses;
