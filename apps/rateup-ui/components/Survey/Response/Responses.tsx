import {
  ActionIcon,
  Box,
  Button,
  Flex,
  Group,
  Loader,
  Popover,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
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
import { useRouter } from "next/router";
import { useCallback, useContext, useEffect, useState } from "react";
import { ICreateContact } from "../../../backend/campaign/contacts/contacts.api";
import { useImportContactMutation } from "../../../backend/campaign/contacts/contacts.query";
import { useQuestions } from "../../../backend/surveys/questions/questions.query";
import {
  useDeleteResponse,
  useDownloadExcelResponse,
  useSyncResponseToGoogleSheet,
} from "../../../backend/surveys/response/response.query";
import SurveyContext from "../../../context/SurveyContext";
import { useUser } from "../../../context/UserContext";
import {
  QuestionType,
  SubscriptionFeaturePathName,
} from "../../../types/enums";
import { ContactQuestions } from "../../../utils/constants";
import { RateupButtonSecondary } from "../../Button/RateupButtons";
import FormModalLayout from "../../Modal/FormModalLayout";
import NothingFound from "../../NothingFound/NothingFound";
import TanstackTable from "../../Table/TanstackTable";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import Heading from "../../styled/Heading/Heading";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { useSurveyResponseColumns } from "./Columns";
import styles from "./Responses.module.css";
import { useVisibleColumnStore } from "../../HomePage/pages/Pricing/store/RouteAndCartStore";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import {
  useGetAuthorizationUrl,
  useGetGoogleAccessToken,
} from "../../../backend/org/org.query";
import CreateTicketModal from "../../Tickets/CreateTicketModal";
import { TicketType } from "../../../utils/enums/ticket";
import ConfirmationModal from "../../Modal/ConfirmationModal";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import dayjs from "dayjs";
import { hasFeature } from "../../../utils/subscription/subscription";
import { InvalidateQueryFilters, useQueryClient } from "@tanstack/react-query";

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
  const { surveyTeamMapId } = useContext(SurveyContext);
  const [selectedRowId, setSelectedRowId] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const { user } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const [
    createTicketOpened,
    { open: openTicketModal, close: closeTicketModal },
  ] = useDisclosure(false);
  const [selectedResponseId, setSelectedResponseId] = useState("");
  const [responseTeamId, setResponseTeamId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const syncResponseToGoogleSheet = useSyncResponseToGoogleSheet(surveyId);
  const { data: authUrl } = useGetAuthorizationUrl();
  const { data: googleAuthAccessToken, isFetched } = useGetGoogleAccessToken();
  const [alertModalOpened, { open: alertModalOpen, close: alertModalClose }] =
    useDisclosure(false);
  const [
    redirectModalOpened,
    { open: redirectModalOpen, close: redirectModalClose },
  ] = useDisclosure(false);
  const [openedExport, { toggle }] = useDisclosure(false);
  const [alertMsg, setAlertMsg] = useState("");
  const router = useRouter();
  const hasContactQuestion =
    responses &&
    responses?.some(
      (response) =>
        response?.responses?.some((res) => QuestionType.Contact === res.type),
    );
  const deleteResponse = useDeleteResponse(
    surveyId,
    surveyTeamMapId,
    close,
    setIsDeleting,
  );
  const importContactMutation = useImportContactMutation();
  // TODO: find out why surveyId is an array
  if (Array.isArray(surveyId)) {
    throw new Error("surveyId is an array");
  }
  const {
    isLoading: isQLoading,
    error: QError,
    data: questions,
  } = useQuestions(surveyId);
  const downloadExcelResponse = useDownloadExcelResponse();
  function handleExportContacts() {
    const contacts = [];
    responses.map((response) => {
      const teamId = response.teamId;
      const responseArray = response.responses;
      responseArray.map((res) => {
        if (ContactQuestions.includes(res.type)) {
          const contact: ICreateContact = {
            name: "",
            teamId: teamId,
            source: survey?.title,
          };
          let phone = null;
          let email = null;
          let name = "";
          switch (res.type) {
            case QuestionType.EmailPhone:
              phone = res.response?.[QuestionType.EmailPhone]?.phone;
              email = res.response?.[QuestionType.EmailPhone]?.email;
              break;
            case QuestionType.Email:
            case QuestionType.Phone:
            case QuestionType.Contact:
              phone = res.response?.[res.type]?.phone;
              email = res.response?.[res.type]?.email;
              name = res.response?.[res.type]?.name;
          }
          contact.phone = phone ? phone.slice(1) : undefined;
          contact.email = email ? email : undefined;
          contact.name = name ? name : "";
          if (
            !contacts.some(
              (c) =>
                c.teamId == contact.teamId &&
                ((c.phone && c.phone == contact.phone) ||
                  (c.email && c.email == contact.email)),
            )
          )
            contacts.push(contact);
        }
      });
    });
    importContactMutation.mutate(contacts, {
      onSettled: () => {
        toggle();
      },
    });
  }
  const handleExcelDownload = useCallback(() => {
    downloadExcelResponse.mutate({
      defaultLanguage,
      surveyId,
      visibleColumn: useVisibleColumnStore.getState().visibleColumn,
      title: survey?.title,
      tz: dayjs.tz.guess(),
    });
  }, [defaultLanguage, downloadExcelResponse, survey?.title, surveyId]);

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
    questions,
    defaultLanguage,
    setSelectedRowId,
    open,
    setSelectedResponseId,
    setResponseTeamId,
    enableTicket:
      survey?.enableTickets &&
      hasFeature(subscription, SubscriptionFeaturePathName.Ticket),
  });

  const handleSyncGoogleSheet = () => {
    setIsSyncing(true);
    if (!googleAuthAccessToken.isExist) {
      setIsSyncing(false);
      setAlertMsg("Please sync your Google account in the settings.");
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
            if (error.response.data?.error === "invalid_grant") {
              setAlertMsg(
                "Your access has been revoked. Please sign out and sign in again in the settings",
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

  const handleRefresh = () => {
    setRefreshing(true);
    queryClient.invalidateQueries([
      "allresponses",
      surveyId,
    ] as InvalidateQueryFilters);
    // or use queryClient.refetchQueries("responseQueryKey") for refetching
  };

  useEffect(() => {
    if (refreshing) {
      setRefreshing(false);
    }
  }, [refreshing]);

  if (isQLoading) return <Loader type="bars" />;
  if (QError) return <Text>An error has occurred</Text>;
  if (isLoading) return <Loader type="bars" />;

  const responseCount = responses?.length;

  return (
    <Stack
      className={styles["total-responses-header-and-responses-table-wrapper"]}
    >
      <CreateTicketModal
        createTicketOpened={createTicketOpened}
        openTicketModal={openTicketModal}
        closeTicketModal={closeTicketModal}
        selectedTeamId={responseTeamId}
        type={TicketType.SURVEY_RESPONSE}
        surveyResponseId={selectedResponseId}
      />

      <PaperLayout className={styles["total-responses-heading-container"]}>
        <Group justify="space-between" align="center">
          <Flex>
            <Heading subtitle={`Total Responses : ${responseCount}`} />
            <Tooltip label="Refresh data">
              <ActionIcon
                variant="light"
                ml="15px"
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  handleRefresh();
                  notifications.show({
                    id: "data-reload",
                    color: "teal",
                    title: "Refreshing data",
                    loading: true,
                    message: "Hold.. your data is getting update...",
                    autoClose: 2000,
                  });
                }}
              >
                <IconRefresh
                  style={{ width: "90%", height: "90%" }}
                  stroke={1.5}
                />
              </ActionIcon>
            </Tooltip>
          </Flex>
          {responseCount > 0 && !survey?.isEncrypted && (
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
                  {isFetched && (
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
                  )}
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
                      title={"Import Contacts"}
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
                    confirmLabel="Go to Settings"
                    onConfirm={() => {
                      router.push("/dashboard/settings?activeTab=advanced");
                    }}
                  />
                </Stack>
              </Popover.Dropdown>
            </Popover>
          )}
        </Group>
      </PaperLayout>

      {responseCount > 0 ? (
        <Box className={styles["responses-table-container"]}>
          <TanstackTable data={responses} columns={columns} />
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
