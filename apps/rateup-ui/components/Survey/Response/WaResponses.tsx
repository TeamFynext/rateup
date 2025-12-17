"use client";

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconDatabaseImport,
  IconFileDownload,
  IconRefresh,
  IconTableExport,
  IconTicket,
  IconX,
} from "@tabler/icons-react";
import { ColumnFiltersState } from "@tanstack/react-table";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useTranslations } from "next-intl";
import { Range } from "react-date-range";

import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { DateRangePickerButton } from "@/components/DateAndTime/DatePicker/DateRangePicker";
import { CalenderIconDateRangePicker } from "@/components/LoyaltyComponents/Customer/LCustomerActionView";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { markdownToPlainText } from "@/components/whatsapp/flow-v2/FlowScreensList/ScreenListItem";
import { hasFeature } from "@/utils/subscription/subscription";
import {
  LDResponseMap,
  RatingScaleMap,
  SmileyResponseMap,
  YNResponseMap,
} from "@/utils/whatsapp/enumMap";

import { useCampaignFilterForFlows } from "../../../backend/campaign/campaign.query";
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
  QuestionType,
  QuestionType2,
  SubscriptionFeaturePathName,
  WaQuestions,
} from "../../../types/enums";
import { docsPath, PAGE_SIZE } from "../../../utils/constants";
import { TicketType } from "../../../utils/enums/ticket";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "../../../utils/notifications";
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
import { WaHoverCardComponent } from "../HoverCard/WaHoverCard";
import { ActionMenu } from "./Columns";
import { fuzzyFilter } from "./Filter";
import styles from "./Responses.module.css";
import { useResponseFilterStore } from "./store";

dayjs.extend(utc);
dayjs.extend(timezone);

const WaResponses = ({
  survey,
  defaultLanguage,
  selectedTeamId,
  subscription,
  questions,
}) => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const surveyId = survey?.id;
  const { surveyTeamMapId, filterTeams, filterTags } =
    useContext(SurveyContext);
  const [selectedRowId, setSelectedRowId] = useState("");
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
  const [opened, { open, close }] = useDisclosure(false);
  const [openedExport, { toggle }] = useDisclosure(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [ranges, setRange] = useState<Range[]>([{ key: "selection" }]);
  const router = useRouter();
  const params = useParams();
  const dbFlowId = params.dbFlowId as string;
  const { data: CFData } = useCampaignFilterForFlows(surveyId);
  const [columnFilters, setColumnFilters] =
    useDebouncedState<ColumnFiltersState>([], 200);
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
      !ranges.length || !ranges[0].startDate || !ranges[0].endDate
        ? []
        : [
            ranges[0]?.startDate.toISOString(),
            ranges[0]?.endDate.toISOString(),
          ],
    ...serverFilters,
  });

  const enableTicket = useMemo(
    () =>
      survey?.enableTickets &&
      hasFeature(subscription, SubscriptionFeaturePathName.Ticket),
    [subscription, survey],
  );

  const deleteResponse = useDeleteResponse(
    surveyId,
    surveyTeamMapId,
    close,
    setIsDeleting,
  );
  const translations = useTranslations();

  useEffect(() => {
    if (ranges.length === 0) {
      setRange([{ key: "selection" }]);
    }
  }, [ranges]);

  if (Array.isArray(surveyId)) {
    throw new Error(translations("surveyId is an array"));
  }

  const exportContactMutation = useExportContactResponses(surveyId);

  const downloadExcelResponse = useDownloadExcelResponse();
  const handleExportContacts = useCallback(() => {
    showLoadingToast(
      translations("Exporting Contact responses to Contacts"),
      "export-contacts",
      true,
    );
    exportContactMutation.mutate();
  }, [exportContactMutation, translations]);

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
      campaignIds: campaignIds,
      dbFlowId,
      columnFilters: [],
      ranges: ranges?.[0],
    });
  }, [
    downloadExcelResponse,
    defaultLanguage,
    surveyId,
    survey?.title,
    filterTeams,
    campaignIds,
    dbFlowId,
    ranges,
  ]);

  useEffect(() => {
    if (selectedResponseId && responseTeamId) openTicketModal();
  }, [selectedResponseId, responseTeamId, openTicketModal]);

  useEffect(() => {
    if (!createTicketOpened) setSelectedResponseId("");
  }, [createTicketOpened]);

  const confirmDelete = useCallback(
    (verifyEmail: string) => {
      if (user?.email === verifyEmail) {
        notifications.show({
          id: "load-data",
          loading: true,
          title: translations("Deleting Response"),
          message: translations("Hold on, response is getting deleted"),
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
    },
    [deleteResponse, selectedRowId, translations, user?.email],
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "Created At",
        cell: (info) =>
          dayjs(info.getValue() as string).format("DD-MM-YYYY hh:mm A"),
      },
      ...questions?.map((question) => ({
        id:
          question.label +
          "_,_" +
          QuestionType2[question.metaType] +
          "_,_" +
          question.id,
        accessorKey: question.id,
        accessorFn: (row) => {
          const response = row?.[question.id];
          if (
            [QuestionType.Rating, QuestionType.Opinion].includes(
              question.metaType,
            )
          ) {
            return Number(response);
          }
          return response;
        },
        header: markdownToPlainText(question.header || question.label),
        enableColumnFilter: ![
          WaQuestions.DocumentPicker,
          WaQuestions.PhotoPicker,
        ].includes(question.metaType),
        enableSorting: ![
          WaQuestions.DocumentPicker,
          WaQuestions.PhotoPicker,
        ].includes(question.metaType),
        cell: (info) => getCellData(info?.getValue(), question),
      })),
      {
        accessorKey: "mobile",
        header: "Respondent Mobile",
        id: "mobile",
      },
      {
        header: "Tag",
        accessorKey: "tag",
      },
      ...(enableTicket
        ? [
            {
              header: () => (
                <span className="truncate min-w-[70px] max-w-[70px] font-semibold text-lg">
                  {translations("Ticket")}
                </span>
              ),
              enableColumnFilter: false,
              enableSorting: false,
              accessorKey: "ticket",
              cell: (info) => {
                let ticketData = info.row.original.Ticket;
                let ticketExist = ticketData?.length > 0;
                return (
                  <div
                    className="flex items-center justify-center pr-[80px] cursor-pointer"
                    onClick={() => {
                      if (ticketExist) {
                        const url = `/dashboard/tickets/${ticketData[0]?.id}`;
                        window.open(url, "_blank");
                      }
                    }}
                  >
                    {ticketExist && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <IconTicket color="orange" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start">
                            {translations("View Ticket")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                );
              },
            },
          ]
        : []),
      {
        accessorKey: "action",
        header: "Action",
        id: "Action",
        enableColumnFilter: false,
        enableSorting: false,
        cell: (info) => (
          <ActionMenu
            open={open}
            resId={info.row.original.id}
            resTeamId={info.row.original.teamId}
            setSelectedResponseId={setSelectedResponseId}
            setResponseTeamId={setResponseTeamId}
            setSelectedRowId={setSelectedRowId}
            ticketData={info.row.original.Ticket}
            enableTicket={enableTicket}
          />
        ),
      },
    ],
    [open, questions],
  );

  const handleSyncGoogleSheet = useCallback(() => {
    setIsSyncing(true);
    if (!googleAccessToken) {
      setIsSyncing(false);
      setAlertMsg(
        translations("Please sync your Google account in the App & Services"),
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
                  "Your access has been revoked Please sign out and sign in again in the Apps & Services",
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
  }, [
    googleAccessToken,
    redirectModalOpen,
    syncResponseToGoogleSheet,
    surveyId,
    toggle,
    translations,
  ]);

  useEffect(() => {
    if (refreshing) {
      setRefreshing(false);
    }
  }, [refreshing]);

  const disableTags = useRef(false);
  const data = useMemo(() => {
    return responseData?.responses?.map((item) => {
      if (!item.tag) {
        disableTags.current = true;
      }
      const row = {
        id: item.id,
        contactId: item.contactId,
        language: item.language,
        createdAt: item.createdAt,
        mobile: item?.phone || "N/A",
        tag: item.tag,
      };

      questions.forEach((question) => {
        const response = item.responses.find(
          (res) => res.questionId === question.id,
        );
        row[question.id] = response ? response.response : "";
      });

      return row;
    });
  }, [responseData?.responses, questions]);
  const isPending = isLoading || isRefetching;
  if (error)
    return (
      <ErrorComponent refetch={refetchResponse} isRefetching={isRefetching} />
    );

  const responseCount = responseData?.totalCount;
  return (
    // <Stack className={styles["responses-root-div"]}>
    //   <CreateTicketModal
    //     createTicketOpened={createTicketOpened}
    //     closeTicketModal={closeTicketModal}
    //     selectedTeamId={responseTeamId}
    //     type={TicketType.SURVEY_RESPONSE}
    //     surveyResponseId={selectedResponseId}
    //   />
    //   <Skeleton
    //     visible={isPending}
    //     h={isPending && 70}
    //     className={isPending && styles["total-responses-export-btn-container"]}
    //   >
    //     <Group className={styles["total-responses-export-btn-container"]}>
    //       <Flex align={"center"}>
    //         <Heading
    //           subtitle={`${translations("Total Responses :")} ${responseCount}`}
    //         />
    //         <RefreshButton onClick={() => refetchResponse()} />
    //       </Flex>

    //       <Group>
    //         <CalenderIconDateRangePicker ranges={ranges} setRange={setRange} />
    //         {CFData && CFData.length > 0 && (
    //           <ContainedMultiSelect
    //             placeholder={translations("Filter By Campaign")}
    //             value={campaignIds}
    //             onChange={setSelectedCampaignIds}
    //             data={CFData.map(({ id, name }) => ({
    //               value: id,
    //               label: name,
    //             }))}
    //           />
    //         )}
    //         {!survey?.isEncrypted && (
    //           <Popover
    //             position="bottom-end"
    //             withArrow
    //             shadow="md"
    //             classNames={{
    //               dropdown: styles["filters-popover-dropdown-div"],
    //             }}
    //             opened={openedExport}
    //           >
    //             <Popover.Target>
    //               <Button
    //                 className={styles["export-btn"]}
    //                 leftSection={<IconTableExport />}
    //                 radius={"lg"}
    //                 fw={400}
    //                 onClick={toggle}
    //               >
    //                 {translations("Export")}
    //               </Button>
    //             </Popover.Target>
    //             <Popover.Dropdown>
    //               <Stack>
    //                 <RateupButtonSecondary
    //                   title={
    //                     survey.spreadSheetId
    //                       ? translations("Resync with Google Sheet")
    //                       : translations("Sync with Google Sheet")
    //                   }
    //                   onClick={() => {
    //                     if (survey.spreadSheetId) alertModalOpen();
    //                     else handleSyncGoogleSheet();
    //                   }}
    //                   leftIcon={
    //                     <IconRefresh
    //                       className={
    //                         isSyncing ? styles.rotateInfinitely : undefined
    //                       }
    //                       style={{ width: "90%", height: "90%" }}
    //                       stroke={1.5}
    //                     />
    //                   }
    //                 />
    //                 <RateupButtonSecondary
    //                   onClick={() => {
    //                     handleExcelDownload();
    //                     toggle();
    //                   }}
    //                   title={translations("Download Excel")}
    //                   radius={"lg"}
    //                   leftIcon={<IconFileDownload stroke={1.5} />}
    //                 />
    //                 <ConfirmationModal
    //                   opened={alertModalOpened}
    //                   onClose={alertModalClose}
    //                   headerTitle={translations("Resync Google Sheet")}
    //                   headerLabel={translations(
    //                     "Are you sure you want to resync the response to sheet? All previous changes made to the sheet will be lost",
    //                   )}
    //                   confirmLabel={translations("Yes")}
    //                   onConfirm={handleSyncGoogleSheet}
    //                 />
    //                 <ConfirmationModal
    //                   opened={redirectModalOpened}
    //                   onClose={redirectModalClose}
    //                   headerTitle={translations("Sync Google Sheet")}
    //                   headerLabel={alertMsg}
    //                   confirmLabel={translations("Continue")}
    //                   onConfirm={() => {
    //                     router.push("/dashboard/apps&services/googlesheet");
    //                   }}
    //                 />
    //               </Stack>
    //             </Popover.Dropdown>
    //           </Popover>
    //         )}
    //         <InfoButton docUrl={`${docsPath}/advancedFt/resultexport`} />
    //       </Group>
    //     </Group>
    //   </Skeleton>
    //   <Box className={styles["responses-table-container"]}>
    //     <TanstackTable
    //       data={data ?? []}
    //       columns={
    //         disableTags.current
    //           ? columns?.filter((col) => col.accessorKey !== "tag")
    //           : columns
    //       }
    //       pagination={pagination}
    //       setPagination={setPagination}
    //       totalCount={responseCount}
    //       isPending={isPending}
    //       columnFiltersE={columnFilters}
    //       setColumnFiltersE={setColumnFilters}
    //       enableServerFilter={enableServerFilter}
    //     />
    //     <DeleteModal
    //       confirmDelete={confirmDelete}
    //       translations={translations}
    //       opened={opened}
    //       close={close}
    //     />
    //   </Box>
    // </Stack>
    <div className="h-full flex flex-col gap-4">
      <CreateTicketModal
        createTicketOpened={createTicketOpened}
        closeTicketModal={closeTicketModal}
        selectedTeamId={responseTeamId}
        type={TicketType.SURVEY_RESPONSE}
        surveyResponseId={selectedResponseId}
      />
      <div>
        {isPending ? (
          <Skeleton className="h-[70px] w-full rounded-lg" />
        ) : (
          <div className="flex items-center justify-between w-full p-4 border rounded-xl">
            <div className="flex items-center gap-1">
              <h1>
                {translations("Total Responses :")} {responseCount}
              </h1>
              <RefreshButton onClick={() => refetchResponse()} />
            </div>

            <div className="flex items-center justify-center gap-2">
              <CalenderIconDateRangePicker
                ranges={ranges}
                setRange={setRange}
              />
              {CFData && CFData.length > 0 && (
                <ContainedMultiSelect
                  placeholder={translations("Filter By Campaign")}
                  value={campaignIds}
                  onChange={setSelectedCampaignIds}
                  data={CFData.map(({ id, name }) => ({
                    value: id,
                    label: name,
                  }))}
                />
              )}
              {!survey?.isEncrypted && (
                <Popover open={openedExport} onOpenChange={toggle}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={styles["export-btn"]}>
                      <IconTableExport className="mr-2 h-4 w-4" />
                      {translations("Export")}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    align="end"
                    className={`w-64 shadow-md ${styles["filters-popover-dropdown-div"]}`}
                  >
                    <div className="flex flex-col gap-2">
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
                            className={isSyncing ? "animate-spin" : ""}
                            strokeWidth={1.5}
                          />
                        }
                      />

                      <RateupButtonSecondary
                        onClick={() => {
                          handleExcelDownload();
                          toggle();
                        }}
                        title={translations("Download Excel")}
                        leftIcon={<IconFileDownload strokeWidth={1.5} />}
                      />

                      <ConfirmationModal
                        opened={alertModalOpened}
                        onClose={alertModalClose}
                        headerTitle={translations("Resync Google Sheet")}
                        headerLabel={translations(
                          "Are you sure you want to resync the response to sheet? All previous changes made to the sheet will be lost",
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
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              <InfoButton docUrl={`${docsPath}/advancedFt/resultexport`} />
            </div>
          </div>
        )}
      </div>

      <div className="border p-4 rounded-xl">
        <TanstackTable
          data={data ?? []}
          columns={
            disableTags.current
              ? columns?.filter((col) => col.accessorKey !== "tag")
              : columns
          }
          pagination={pagination}
          setPagination={setPagination}
          totalCount={responseCount}
          isPending={isPending}
          columnFiltersE={columnFilters}
          setColumnFiltersE={setColumnFilters}
          enableServerFilter={enableServerFilter}
        />
        <DeleteModal
          confirmDelete={confirmDelete}
          translations={translations}
          opened={opened}
          close={close}
        />
      </div>
    </div>
  );
};

export default React.memo(WaResponses);

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
      <div className="flex flex-col gap-2">
        <p>{translations("To proceed further, verify your email id")}</p>
        <ContainedTextField
          withAsterisk
          label={translations("Verify email")}
          placeholder={translations("Enter your login email")}
          required
          value={verifyEmail}
          onChange={(e) => setVerifyEmail(e.target.value)}
        />
        <p className="text-red-500">
          {translations("Once deleted, response entry data will be lost")}
        </p>
      </div>
    </FormModalLayout>
  );
};
export const getCellData = (info, question) => {
  switch (question.metaType) {
    case WaQuestions.LD:
      return LDResponseMap[info] || "";
    case WaQuestions.YN:
      return YNResponseMap[info] || "";
    case WaQuestions.Smiley:
      return SmileyResponseMap[info] || "";
    case WaQuestions.Rating:
      return RatingScaleMap[info] || "";
    case WaQuestions.Opinion:
      return info || "";
    case WaQuestions.RadioButtonsGroup:
    case WaQuestions.Dropdown:
      return question.dataSource?.find((data) => data.id === info)?.title || "";
    case WaQuestions.CheckboxGroup:
    case WaQuestions.ChipsSelector:
      return (
        (Array.isArray(info) &&
          info
            ?.map(
              (i) => question.dataSource?.find((data) => data.id === i)?.title,
            )
            ?.join(",")) ||
        ""
      );
    case WaQuestions.DocumentPicker:
      return (
        info && (
          <Link
            target="_blank"
            href={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${info}`}
            download
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Download
          </Link>
        )
      );
    case WaQuestions.DatePicker:
      return info ? dayjs(info).format("DD-MM-YYYY") : "";
    case WaQuestions.TextArea:
    case WaQuestions.PhotoPicker:
      return <WaHoverCardComponent content={info} type={question.metaType} />;
    default:
      return info.toString() || "";
  }
};
