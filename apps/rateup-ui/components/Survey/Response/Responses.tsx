import { Group, Loader, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconFileDownload, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useCallback, useContext, useEffect, useState } from "react";
import { downloadExcel } from "react-export-table-to-excel";
import { ICreateContact } from "../../../backend/campaign/contacts/contacts.api";
import { useImportContactMutation } from "../../../backend/campaign/contacts/contacts.query";
import { useQuestions } from "../../../backend/surveys/questions/questions.query";
import { useDeleteResponse } from "../../../backend/surveys/response/response.query";
import SurveyContext from "../../../context/SurveyContext";
import { useUser } from "../../../context/UserContext";
import { QuestionType } from "../../../types/enums";
import {
  ChoiceTypeQuestions,
  ContactQuestions,
} from "../../../utils/constants";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import FormModalLayout from "../../Modal/FormModalLayout";
import NothingFound from "../../NothingFound/NothingFound";
import TanstackTable from "../../Table/TanstackTable";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import Heading from "../../styled/Heading/Heading";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { useSurveyResponseColumns } from "./Columns";
import styles from "./Responses.module.css";
import { useVisibleColumnStore } from "../../HomePage/pages/Pricing/store/RouteAndCartStore";

const Responses = ({
  survey,
  responses,
  allResponses,
  defaultLanguage,
  isLoading,
}) => {
  const [responseCount, setResponseCount] = useState(0);
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  const { surveyTeamMapId } = useContext(SurveyContext);
  const [selectedRowId, setSelectedRowId] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const { user } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);

  const hasContactQuestion =
    responses &&
    responses.some((response) =>
      response.responses.some((res) => QuestionType.Contact === res.type),
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

  useEffect(() => {
    setResponseCount(responses?.length);
  }, [responses]);

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
          };
          let phone = null;
          let email = null;
          switch (res.type) {
            case QuestionType.Email:
              email = res.response?.[QuestionType.Email];
              break;
            case QuestionType.Phone:
              phone = res.response?.[QuestionType.Phone];
              break;
            case QuestionType.EmailPhone:
              phone = res.response?.[QuestionType.EmailPhone]?.phone;
              email = res.response?.[QuestionType.EmailPhone]?.email;
              break;
            case QuestionType.Contact:
              phone = res.response?.[QuestionType.Contact]?.phone;
              email = res.response?.[QuestionType.Contact]?.email;
              contact.name = res.response?.[QuestionType.Contact]?.name;
          }
          contact.phone = phone ? phone.slice(1) : undefined;
          contact.email = email ? email : undefined;
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
    importContactMutation.mutate(contacts, {});
  }
  const handleExcelDownload = useCallback(() => {
    const responses = allResponses && allResponses[0].responses;
    const filteredSecondArray = questions.filter((item) =>
      useVisibleColumnStore
        .getState()
        .visibleColumn.includes(item.title.English),
    );
    if (filteredSecondArray && responses) {
      const headerArray = filteredSecondArray.map((question) => {
        return question.title[defaultLanguage];
      });
      const bodyArray = [];
      filteredSecondArray.forEach((question) => {
        const questionId = question.id;
        responses.forEach((response, answerIndex) => {
          bodyArray.push([]);
          const responses = response.responses;
          const responseObj = responses.find(
            (answerObj) => answerObj.questionId === questionId,
          );
          let responseValue;
          if (responseObj) {
            responseValue = responseObj.response[question.type];
            const responseType = responseObj.type;
            switch (responseType) {
              case QuestionType.Photo: {
                responseValue = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${responseValue}`;
                break;
              }
              case QuestionType.DateTime: {
                responseValue = dayjs(responseValue).format("DD-MM-YYYY");
                break;
              }
            }
            if (ChoiceTypeQuestions.includes(responseType)) {
              responseValue = Array.isArray(responseValue)
                ? responseValue?.map((res) => res.value)
                : responseValue?.value;
            }
            if (typeof responseValue === "object") {
              responseValue = responseValue?.value
                ? Object.values(responseValue?.value).join(", ")
                : Object.values(responseValue).join(", ");
            }
          } else {
            responseValue = "";
          }
          bodyArray[answerIndex].push(responseValue);
        });
      });
      downloadExcel({
        fileName: survey?.title,
        sheet: "Responses",
        tablePayload: {
          header: headerArray,
          body: bodyArray,
        },
      });
    }
  }, [questions, responses]);

  useEffect(() => {
    setVerifyEmail("");
  }, [opened]);

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

  if (isQLoading) return <Loader />;
  if (QError) return <Text>An error has occurred</Text>;
  if (isLoading) return <Loader />;

  const columns = useSurveyResponseColumns({
    questions,
    defaultLanguage,
    setSelectedRowId,
  });

  return (
    <Stack h="100%">
      <PaperLayout
        style={{ cursor: "pointer" }}
        className={styles["total-responses-heading-container"]}
      >
        <Group justify="space-between" align="center">
          <Heading subtitle={`Total Responses : ${responseCount}`} />
          <Group>
            <RateupButtonBlue
              onClick={handleExcelDownload}
              title={"Download"}
              size="md"
              radius={"lg"}
              disabled={responseCount > 0 ? false : true}
              rightIcon={<IconFileDownload size="1rem" />}
            />
            {hasContactQuestion && (
              <RateupButtonSecondary
                onClick={handleExportContacts}
                title={"Export to contacts"}
                size="md"
                radius={"lg"}
                rightIcon={<IconFileDownload size="1rem" />}
              />
            )}
          </Group>
        </Group>
      </PaperLayout>
      {responseCount > 0 ? (
        <PaperLayout>
          <>
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
          </>
        </PaperLayout>
      ) : (
        <NothingFound text="No responses yet" />
      )}
    </Stack>
  );
};

export default Responses;
