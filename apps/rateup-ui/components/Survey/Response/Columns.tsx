import { useContext, useMemo } from "react";

import {
  Anchor,
  Badge,
  Button,
  Center,
  Group,
  Menu,
  rem,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconEye,
  IconTicket,
  IconTrashXFilled,
} from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import SurveyContext from "@/context/SurveyContext";

import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { QuestionType } from "../../../types/enums";
import {
  getFileNameFromKey,
  getFileUrlFromKey,
} from "../../../utils/file-upload/upload";
import {
  getResponse,
  getResponseArrayByQuestionType,
} from "../../../utils/response";
import { RateupButtonBlue } from "../../Button/RateupButtons";
import PreviewModal from "../../Modal/PreviewModal";
import { HoverCardComponent } from "../HoverCard/HoverCard";
import { getReplacedTitleFromVariable } from "../TakeSurvey/TakeSurveyComponent/util";
import { fuzzyFilter } from "./Filter";

export const useSurveyResponseColumns = ({
  questions = [],
  defaultLanguage,
  setSelectedRowId,
  open,
  setSelectedResponseId,
  setResponseTeamId,
  enableTicket,
  surveyId,
  typeWa = false,
}) => {
  const translations = useTranslations();
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const column: ColumnDef<any>[] = useMemo(
    () => [
      {
        header: () => (
          <Text truncate="end" miw={200} maw={200} fw={600} fz={"lg"}>
            {translations("Created At")}
          </Text>
        ),
        filterFn: fuzzyFilter,
        accessorKey: "createdAt",
        cell: (info) => (
          <Text p={10} miw={200}>
            {dayjs(info.getValue() as string).format("DD-MM-YYYY hh:mm A")}
          </Text>
        ),
      },
      ...(questions?.length > 0
        ? questions?.map((q) => {
            const content =
              getReplacedTitleFromVariable({
                title:
                  q?.title[
                    selectedLanguage ? selectedLanguage : defaultLanguage
                  ],
                surveyId,
              }) ||
              q?.title[selectedLanguage ? selectedLanguage : defaultLanguage] ||
              q?.description[
                selectedLanguage ? selectedLanguage : defaultLanguage
              ] ||
              q?.label?.[
                selectedLanguage ? selectedLanguage : defaultLanguage
              ] ||
              "";
            return {
              ...(![
                QuestionType.Rating,
                QuestionType.Opinion,
                QuestionType.Number,
              ].includes(q?.type) && {
                filterFn: fuzzyFilter,
              }),
              accessorFn: (row) => {
                const response = row.responses
                  ?.filter((item) => item?.questionId === q.id)
                  ?.find((item) => item?.type === q.type)?.response[q.type];
                if (
                  [
                    QuestionType.Rating,
                    QuestionType.Opinion,
                    QuestionType.Number,
                  ].includes(q.type)
                ) {
                  return Number(response);
                }

                return response;
              },
              id: content + "_,_" + q.type + "_,_" + q.id,
              header: () => (
                <HoverCardComponent content={content} fw={600} fz={"lg"} />
              ),
              enableColumnFilter: ![
                QuestionType.DocumentPicker,
                QuestionType.PhotoPicker,
                QuestionType.Photo,
                QuestionType.PCQ,
              ].includes(q.type),
              enableSorting: ![
                QuestionType.Photo,
                QuestionType.PCQ,
                QuestionType.DocumentPicker,
                QuestionType.PhotoPicker,
              ].includes(q.type),
              cell: (info) => {
                return (
                  <BadgeorTextorPreview
                    questionType={q?.type}
                    response={getResponse(q, info.getValue())}
                  />
                );
              },
            };
          })
        : []),
      {
        header: () => (
          <Text truncate="end" miw={200} maw={200} fw={600} fz={"lg"}>
            {translations("Tags")}
          </Text>
        ),
        accessorKey: "tag",
        cell: (info) => (
          <Text p={10} miw={200}>
            {info.getValue() as string}
          </Text>
        ),
      },
      ...(typeWa
        ? [
            {
              header: () => (
                <Text truncate="end" miw={200} maw={200} fw={600} fz={"lg"}>
                  Respondent&apos;s Mobile Number
                </Text>
              ),
              filterFn: fuzzyFilter,
              accessorFn: (row) => row?.phone,
              id: "respondentsMobileNumber",
              cell: (info) => (
                <Text p={10} miw={200}>
                  {info.getValue()?.toString()}
                </Text>
              ),
            },
          ]
        : []),
      ...(enableTicket
        ? [
            {
              header: () => (
                <Text truncate="end" miw={70} maw={70} fw={600} fz={"lg"}>
                  {translations("Ticket")}
                </Text>
              ),
              enableColumnFilter: false,
              enableSorting: false,
              accessorKey: "ticket",
              cell: (info) => {
                let ticketData = info.row.original.Ticket;
                let ticketExist = ticketData?.length > 0;
                return (
                  <Center
                    pr="80px"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      if (ticketExist) {
                        let url = `/dashboard/tickets/${ticketData[0]?.id}`;
                        window.open(url, "_blank");
                      }
                    }}
                  >
                    {ticketExist && (
                      <Tooltip
                        withArrow
                        label={translations("View Ticket")}
                        position="right-start"
                      >
                        <Stack>
                          <IconTicket
                            color="orange"
                            style={{ width: rem(35), height: rem(35) }}
                          />
                        </Stack>
                      </Tooltip>
                    )}
                  </Center>
                );
              },
            },
          ]
        : []),
      {
        header: () => (
          <Text truncate="end" fw={600} miw={200} maw={200} fz={"lg"}>
            Action
          </Text>
        ),
        enableColumnFilter: false,
        enableSorting: false,
        cell: (info) => {
          return (
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
          );
        },
        accessorKey: "action",
      },
    ],
    [questions, translations],
  );
  return column;
};

const previewRequired = [QuestionType.Photo, QuestionType.PhotoPicker];
const badgeRequired = [
  QuestionType.Rating,
  QuestionType.Smiley,
  QuestionType.LD,
  QuestionType.YN,
  QuestionType.Opinion,
];
function BadgeorTextorPreview({
  questionType,
  response,
}: Readonly<{
  questionType: QuestionType;
  response: any;
}>) {
  const translations = useTranslations();
  const [previewModalopened, { open, close }] = useDisclosure(false);
  if (previewRequired.includes(questionType)) {
    return (
      <>
        <RateupButtonBlue
          title={translations("Preview")}
          leftIcon={<IconEye />}
          size="compact-xs"
          onClick={open}
          disabled={response === "" || !response}
        />
        <PreviewModal
          headerTitle={translations("Preview")}
          onClose={close}
          imgObject={response}
          opened={previewModalopened}
        />
      </>
    );
  } else if (questionType === QuestionType.DocumentPicker) {
    return (
      <Text p={10} miw={200}>
        {response && (
          <Anchor
            href={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${response}`}
            download
          >
            Download
          </Anchor>
        )}
      </Text>
    );
  } else if (badgeRequired.includes(questionType)) {
    return (
      <Badge
        size="lg"
        fw={600}
        radius={10}
        color={
          getResponseArrayByQuestionType(questionType)?.find(
            (res) => res.value === response,
          )?.color
        }
        miw={100}
        variant="light"
      >
        {response}
      </Badge>
    );
  } else if (questionType == QuestionType.Testimonial) {
    return (
      <Stack>
        {response?.photo ? (
          <>
            <Group>
              <Text fw={300} fz="md" c="dark.3">
                {translations("Profile Picture:")}{" "}
              </Text>
              <Button
                leftSection={<IconEye />}
                w={"fit-content"}
                onClick={open}
                radius={"lg"}
                size="compact-xs"
              >
                {translations("Preview")}
              </Button>
            </Group>
            <PreviewModal
              headerTitle={translations("Preview")}
              onClose={close}
              imgObject={response?.photo}
              opened={previewModalopened}
            />
          </>
        ) : null}
        <HoverCardComponent
          content={response?.content}
          questionType={questionType}
        />
      </Stack>
    );
  } else if (questionType == QuestionType.File) {
    return response ? (
      <Group gap={"xs"}>
        <Text
          fw={300}
          fz="md"
          c="dark.3"
          w={150}
          style={{ overflowWrap: "break-word" }}
        >
          {getFileNameFromKey(response)}
        </Text>
        <RateupButtonBlue
          onClick={() => {
            window.open(getFileUrlFromKey(response), "_blank");
          }}
          title={translations("Preview")}
          leftIcon={<IconEye size={"1rem"} />}
          size="compact-xs"
        />
      </Group>
    ) : null;
  } else {
    return (
      <HoverCardComponent content={response} questionType={questionType} />
    );
  }
}

export function ActionMenu({
  resId,
  resTeamId,
  open,
  setSelectedResponseId,
  setResponseTeamId,
  setSelectedRowId,
  ticketData,
  enableTicket,
}) {
  const ticketExist = ticketData?.length > 0;
  const translations = useTranslations();
  return (
    <Stack px="sm">
      <Menu
        position="bottom-end"
        offset={4}
        withArrow
        arrowPosition="side"
        transitionProps={{ transition: "rotate-right", duration: 150 }}
      >
        <Menu.Target>
          <Button
            variant="outline"
            radius="lg"
            size="xs"
            rightSection={<IconChevronDown size="1rem" />}
            style={{ maxWidth: "fit-content", marginLeft: "-14px" }}
          >
            <Text size="xs" c="dark.5">
              {translations("Select Action")}
            </Text>
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          {enableTicket && (
            <Menu.Item
              color={ticketExist ? "orange" : "blue.7"}
              onClick={() => {
                if (ticketExist) {
                  let url = `/dashboard/tickets/${ticketData[0]?.id}`;
                  window.open(url, "_blank");
                } else {
                  setSelectedResponseId(resId);
                  setResponseTeamId(resTeamId);
                }
              }}
              leftSection={
                <IconTicket style={{ width: rem(14), height: rem(14) }} />
              }
            >
              {ticketExist
                ? translations("View Ticket")
                : translations("Create Ticket")}
            </Menu.Item>
          )}
          <Menu.Item
            color="red"
            onClick={() => {
              setSelectedRowId(resId);
              open();
            }}
            leftSection={
              <IconTrashXFilled style={{ width: rem(14), height: rem(14) }} />
            }
          >
            {translations("Delete Response")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Stack>
  );
}
