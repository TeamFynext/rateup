import React, { useState, useEffect, useRef } from "react";
import {
  Loader,
  Table,
  Text,
  Modal,
  Group,
  Divider,
  TextInput,
  Stack,
  ScrollArea,
  Badge,
} from "@mantine/core";
import {
  RateupButtonBlackOutline,
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import { IconFileDownload, IconTrashXFilled, IconX } from "@tabler/icons-react";
import { useContext } from "react";
import { useQuestions } from "../../../backend/surveys/questions/questions.query";
import { useRouter } from "next/router";
import dayjs from "dayjs";
import { getResponse } from "../../../utils/response";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { useDownloadExcel } from "react-export-table-to-excel";
import { useDeleteResponse } from "../../../backend/surveys/response/response.query";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useUser } from "../../../context/UserContext";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import Heading from "../../styled/Heading/Heading";
import { QuestionType } from "../../../types/enums";
import SurveyContext from "../../../context/SurveyContext";

const Responses = ({ survey, responses }) => {
  const [responseCount, setResponseCount] = useState(0);
  const tableRef = useRef(null);
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  const { surveyTeamMapId } = useContext(SurveyContext);
  const [selectedRowId, setSelectedRowId] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [isDeleteAction, setIsDeleteAction] = useState(false);
  const { user } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);

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
    isLoading: isQLoading,
    error: QError,
    data: questions,
  } = useQuestions(surveyId);

  useEffect(() => {
    setResponseCount(responses?.length);
  }, [responses]);

  const { onDownload } = useDownloadExcel({
    currentTableRef: tableRef.current,
    filename: survey?.title,
    sheet: "Responses",
  });

  const cellGap = {
    paddingLeft: "10px",
    paddingRight: "10px",
    minWidth: "100px",
  };

  const openActions = (id) => {
    selectedRowId === id ? setSelectedRowId("") : setSelectedRowId(id);
    selectedRowId !== id && open();
  };

  useEffect(() => {
    setVerifyEmail("");
    setIsDeleteAction(false);
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

  return (
    <Stack h="100%" style={{ flex: 1 }}>
      <PaperLayout style={{ cursor: "pointer" }}>
        <Group justify="space-between" align="center">
          <Heading subtitle={`Total Responses : ${responseCount}`} />
          <RateupButtonBlue
            onClick={onDownload}
            title={"Download"}
            size="md"
            radius={"lg"}
            disabled={responseCount > 0 ? false : true}
            rightIcon={<IconFileDownload size="1rem" />}
          />
        </Group>
      </PaperLayout>
      {responseCount > 0 && (
        <PaperLayout style={{ flex: 1 }}>
          <ScrollArea h={"100%"}>
            <Stack h={"100%"}>
              <Table highlightOnHover ref={tableRef} withRowBorders>
                <TableHead questions={questions} />
                <Table.Tbody>
                  {responses?.map((response) => (
                    <Table.Tr
                      key={response.id}
                      onClick={() => openActions(response.id)}
                      style={{
                        backgroundColor:
                          selectedRowId === response.id ? "silver" : "",
                      }}
                    >
                      <Table.Td style={cellGap}>
                        <Text c="dark.3" p={10} miw={200}>
                          {dayjs(response.createdAt).format("DD-MM-YYYY")}
                        </Text>
                      </Table.Td>
                      {questions?.map((q) => (
                        <Table.Td
                          key={q.id}
                          style={cellGap}
                          title={getResponse(q.id, response)}
                        >
                          <BadgeorText
                            questionType={q.type}
                            response={getResponse(q.id, response)}
                          />
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </ScrollArea>
          <Modal
            opened={opened}
            onClose={close}
            title="Response Actions"
            centered
          >
            {!isDeleteAction && (
              <Group py="xl">
                <RateupButtonBlackOutline
                  leftIcon={<IconTrashXFilled />}
                  title="Delete Response"
                  onClick={() => setIsDeleteAction(true)}
                />
              </Group>
            )}
            <Stack style={{ display: isDeleteAction ? "block" : "none" }}>
              <Divider pb="2rem" />
              <Text fz="lg"> Delete this Reponse </Text>
              <Text color="red">
                Once deleted, response entry data will be lost.
              </Text>

              <Stack pt="xl">
                <Text>
                  To proceed further, type in your email id and click confirm
                  delete.
                </Text>
                <TextInput
                  style={{ maxWidth: "300px" }}
                  withAsterisk
                  label="Verify email"
                  placeholder="Enter your login email"
                  required
                  mt="md"
                  value={verifyEmail}
                  onChange={(e) => setVerifyEmail(e.target.value)}
                />
              </Stack>
              <Group mt="xl" pt="xl">
                <RateupButtonSecondary onClick={close} title="Close" />
                <RateupButtonBlue
                  onClick={confirmDelete}
                  title="Confirm"
                  loading={isDeleting}
                />
              </Group>
            </Stack>
          </Modal>
        </PaperLayout>
      )}
    </Stack>
  );
};

export default Responses;

interface TableHeadProps {
  questions: Array<Question>;
}
function TableHead({ questions }: TableHeadProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);

  const stickyHeaderStyles: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 100,
    backgroundColor: "white",
    minHeight: 100,
  };

  if (!questions?.length) return <>No Responses.</>;
  return (
    <Table.Thead style={stickyHeaderStyles}>
      <Table.Tr mih={50}>
        <Table.Th>
          <Text fz="lg" c="dark.5" fw="600" p={10}>
            Date
          </Text>
        </Table.Th>
        {questions?.map((q) => (
          <Table.Th
            key={q?.id}
            title={q?.title[selectedLanguage] || q?.title["English"]}
          >
            <Text
              c="dark.5"
              fz="lg"
              fw="600"
              truncate="end"
              miw={200}
              maw={200}
            >
              {q?.title[selectedLanguage] || q?.title["English"]}
            </Text>
          </Table.Th>
        ))}
        {/* TODO : above 'English' given as a temporary fix,
           change default language for page survey/response/id */}
      </Table.Tr>
    </Table.Thead>
  );
}

function BadgeorText({
  questionType,
  response,
}: {
  questionType: QuestionType;
  response: string;
}) {
  const badgeRequired = [
    QuestionType.Rating,
    QuestionType.Smiley,
    QuestionType.LD,
    QuestionType.YN,
    QuestionType.Opinion,
  ];
  function returnBadgeColor() {
    switch (response?.toString()) {
      case "VeryHappy":
      case "Like":
      case "Yes":
      case "9":
      case "10":
        return "green";
      case "Happy":
      case "Neutral":
      case "7":
      case "8":
        return "yellow";
      case "Sad":
      case "No":
      case "5":
      case "6":
        return "orange";
      case "VerySad":
      case "Dislike":
      case "1":
      case "2":
      case "3":
      case "4":
        return "red";
      default:
        return "dark";
    }
  }
  if (badgeRequired.includes(questionType)) {
    return (
      <Badge
        size="lg"
        fw={600}
        radius={10}
        color={returnBadgeColor()}
        variant="light"
      >
        {response}
      </Badge>
    );
  } else {
    return (
      <Text c="dark.3" truncate="end" miw={200} maw={200}>
        {response}
      </Text>
    );
  }
}
