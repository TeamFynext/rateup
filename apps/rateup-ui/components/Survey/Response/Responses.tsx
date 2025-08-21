import React, {
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/router";

import {
  Box,
  Button,
  Flex,
  Group,
  Popover,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { range, useDebouncedState, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconDatabaseImport,
  IconFileDownload,
  IconRefresh,
  IconTableExport,
  IconX,
} from "@tabler/icons-react";
import { ColumnFiltersState } from "@tanstack/react-table";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslations } from "next-intl";
import { Range } from "react-date-range";

import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { DateRangePickerButton } from "@/components/DateAndTime/DatePicker/DateRangePicker";
import { CalenderIconDateRangePicker } from "@/components/LoyaltyComponents/Customer/LCustomerActionView";

import { useCampaignFilterForFlows } from "../../../backend/campaign/campaign.query";
import { useQuestions } from "../../../backend/surveys/questions/questions.query";
import {
  useDeleteResponse,
  useDownloadExcelResponse,
  useExportContactResponses,
  useResponsesBySurvey,
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
import { docsPath, PAGE_SIZE } from "../../../utils/constants";
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
import { useResponseFilterStore } from "./store";

const Responses = ({ survey, defaultLanguage, subscription, questions }) => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const surveyId = survey?.id;
  const { surveyTeamMapId, filterTeams, filterTags } =
    useContext(SurveyContext);
  const [selectedRowId, setSelectedRowId] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const { user } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);
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
  const [ranges, setRange] = useState<Range[]>([
    {
      key: "selection",
    },
  ]);
  const [columnFilters, setColumnFilters] =
    useDebouncedState<ColumnFiltersState>([], 200);
  const router = useRouter();
  const [campaignIds, setSelectedCampaignIds] = useState([]);

  const { serverFilters, enableServerFilter, setServerFilters } =
    useResponseFilterStore();

  useEffect(() => {
    setServerFilters({});
  }, [survey]);

  const {
    data: responseData,
    isLoading,
    isRefetching,
    error,
    refetch: refetchResponse,
  } = useResponsesBySurvey(survey?.id, {
    page: pagination.pageIndex,
    limit: pagination.pageSize,
    surveyTeamMapIds: filterTeams,
    language: "",
    contactIds: [],
    campaignIds,
    dateRange:
      !ranges.length || !ranges[0]?.startDate || !ranges[0]?.endDate
        ? []
        : [ranges[0].startDate.toISOString(), ranges[0].endDate.toISOString()],
    ...serverFilters,
  });

  useEffect(() => {
    if (ranges.length === 0) {
      setRange([{ key: "selection" }]);
    }
  }, [ranges]);

  const hasContactQuestion = useMemo(
    () => questions.find((q) => q.type === QuestionType.Contact),
    [questions],
  );

  const deleteResponse = useDeleteResponse(
    surveyId,
    surveyTeamMapId,
    close,
    setIsDeleting,
  );
  const translations = useTranslations();
  // TODO: find out why surveyId is an array
  if (Array.isArray(surveyId)) {
    throw new Error(translations("surveyId is an array"));
  }

  const exportContactMutation = useExportContactResponses(surveyId);
  const {
    data: CFData,
    error: CFError,
    isLoading: CFLoading,
  } = useCampaignFilterForFlows(surveyId);
  const downloadExcelResponse = useDownloadExcelResponse();
  function handleExportContacts() {
    showLoadingToast(
      translations("Exporting Contact responses to Contacts..."),
      "export-contacts",
      true,
    );
    exportContactMutation.mutate();
  }
  const handleExcelDownload = useCallback(() => {
    downloadExcelResponse.mutate({
      defaultLanguage,
      surveyId,
      visibleColumn: Array.from(
        new Set(useVisibleColumnStore.getState().visibleColumn),
      ),
      title: survey?.title,
      tz: dayjs.tz.guess(),
      filterTeams,
      campaignIds,
      columnFilters,
      ranges: ranges?.[0],
    });
  }, [
    columnFilters,
    defaultLanguage,
    downloadExcelResponse,
    filterTeams,
    ranges,
    survey?.title,
    surveyId,
    campaignIds,
  ]);

  useEffect(() => {
    selectedResponseId && responseTeamId && openTicketModal();
  }, [selectedResponseId, responseTeamId]);

  useEffect(() => {
    !createTicketOpened && setSelectedResponseId("");
  }, [createTicketOpened]);

  const confirmDelete = (verifyEmail: string) => {
    if (user?.email === verifyEmail) {
      notifications.show({
        id: "load-data",
        loading: true,
        title: translations("Deleting Response"),
        message: translations("Hold on, response is getting deleted..."),
        autoClose: false,
        withCloseButton: false,
      });
      setIsDeleting(true);
      deleteResponse.mutate(selectedRowId);
    } else {
      notifications.show({
        id: "load-data",
        color: "red",
        title: translations("Error"),
        message: translations("Incorrect email"),
        icon: <IconX size="1rem" />,
        autoClose: 3000,
      });
    }
  };
  const filteredQuestions = useMemo(
    () =>
      questions.filter(
        (q) => q.type !== QuestionType.InfoMessage && !(q.type in PageType),
      ),
    [questions],
  );
  const columns = useSurveyResponseColumns({
    questions: filteredQuestions,
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
      setAlertMsg(
        translations("Please sync your Google account in the App & Services."),
      );
      redirectModalOpen();
    } else {
      syncResponseToGoogleSheet.mutate(
        { surveyId },
        {
          onSuccess: () => {
            setIsSyncing(false);
            showSuccessToast(
              translations("Response synced to Google sheet successfully"),
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
                translations(
                  "Your access has been revoked. Please sign out and sign in again in the Apps & Services",
                ),
              );
              redirectModalOpen();
            } else {
              toggle();
              showErrorToast(translations("Error in syncing response"));
            }
          },
        },
      );
    }
  };
  const isPending = isLoading || CFLoading || isRefetching;

  if (error)
    return (
      <ErrorComponent refetch={refetchResponse} isRefetching={isRefetching} />
    );

  return (
    <Stack className={styles["responses-root-div"]}>
      <CreateTicketModal
        createTicketOpened={createTicketOpened}
        closeTicketModal={closeTicketModal}
        selectedTeamId={responseTeamId}
        type={TicketType.SURVEY_RESPONSE}
        surveyResponseId={selectedResponseId}
      />
      <Skeleton
        visible={isPending}
        h={isPending && 70}
        className={isPending && styles["total-responses-export-btn-container"]}
      >
        <Group className={styles["total-responses-export-btn-container"]}>
          <Flex align={"center"}>
            <Heading
              subtitle={`${translations("Total Responses :")} ${responseData?.totalCount ?? 0}`}
            />
            <RefreshButton onClick={() => refetchResponse()} />
          </Flex>
          <Group>
            <CalenderIconDateRangePicker ranges={ranges} setRange={setRange} />
            {CFData && CFData.length > 0 && (
              <ContainedMultiSelect
                placeholder={translations("Filter By Campaign")}
                value={campaignIds}
                onChange={setSelectedCampaignIds}
                data={CFData.map(({ name, id }) => ({
                  value: id,
                  label: name,
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
                    {translations("Export")}
                  </Button>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack>
                    <RateupButtonSecondary
                      title={
                        survey.spreadSheetId
                          ? translations("Resync with Google Sheet")
                          : translations("Sync with Google Sheet")
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
                      title={translations("Download Excel")}
                      radius={"lg"}
                      leftIcon={<IconFileDownload stroke={1.5} />}
                    />
                    {hasContactQuestion && (
                      <RateupButtonSecondary
                        onClick={handleExportContacts}
                        title={translations("Export Contacts")}
                        radius={"lg"}
                        leftIcon={<IconDatabaseImport stroke={1.5} />}
                      />
                    )}
                    <ConfirmationModal
                      opened={alertModalOpened}
                      onClose={alertModalClose}
                      headerTitle={translations("Resync Google Sheet")}
                      headerLabel={translations(
                        "Are you sure you want to resync the response to sheet? All previous changes made to the sheet will be lost.",
                      )}
                      confirmLabel={translations("Yes")}
                      onConfirm={handleSyncGoogleSheet}
                    />
                    <ConfirmationModal
                      opened={redirectModalOpened}
                      onClose={redirectModalClose}
                      headerTitle={translations("Sync Google Sheet")}
                      headerLabel={alertMsg}
                      confirmLabel={translations("Continue")}
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
      </Skeleton>
      <Box className={styles["responses-table-container"]}>
        <TanstackTable
          data={responseData ? responseData?.responses : []}
          columns={
            responseData?.responses?.every((row) => !row.tag)
              ? columns?.filter((col: any) => col.accessorKey !== "tag")
              : columns
          }
          columnFiltersE={columnFilters}
          setColumnFiltersE={setColumnFilters}
          pagination={pagination}
          setPagination={setPagination}
          totalCount={responseData?.totalCount}
          isPending={isPending}
          enableServerFilter={enableServerFilter}
        />
        <DeleteModal
          confirmDelete={confirmDelete}
          translations={translations}
          opened={opened}
          close={close}
        />
      </Box>
    </Stack>
  );
};

export default React.memo(Responses);

const DeleteModal = ({ translations, confirmDelete, opened, close }) => {
  const [verifyEmail, setVerifyEmail] = useState("");
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={translations("Delete Response")}
      centered
      buttonTitle={translations("Delete")}
      includeCancelButton
      onSubmit={() => {
        confirmDelete(verifyEmail);
        setVerifyEmail("");
      }}
    >
      <Stack py={"sm"}>
        <Text>{translations("To proceed further, verify your email id.")}</Text>
        <ContainedTextField
          withAsterisk
          label={translations("Verify email")}
          placeholder={translations("Enter your login email")}
          required
          value={verifyEmail}
          onChange={(e) => setVerifyEmail(e.target.value)}
        />
        <Text c="red">
          {translations("Once deleted, response entry data will be lost.")}
        </Text>
      </Stack>
    </FormModalLayout>
  );
};
