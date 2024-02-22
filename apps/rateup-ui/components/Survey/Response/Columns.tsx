import { Badge, Button, Text } from "@mantine/core";
import { IconEye, IconTrashXFilled } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { QuestionType } from "../../../types/enums";
import {
  getResponseArrayByQuestionType,
  getResponse,
} from "../../../utils/response";
import { HoverCardComponent } from "../HoverCard/HoverCard";

import React, { useContext } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { fuzzyFilter } from "./Filter";
import { useDisclosure } from "@mantine/hooks";
import { RateupButtonBlue } from "../../Button/RateupButtons";
import PreviewModal from "../../Modal/PreviewModal";

export const useSurveyResponseColumns = ({
  questions = [],
  defaultLanguage,
  setSelectedRowId,
  open,
}) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);

  const column: ColumnDef<any>[] = [
    {
      header: () => (
        <Text c="dark.3" truncate="end" miw={200} maw={200} fw={600} fz={"lg"}>
          Created At
        </Text>
      ),
      filterFn: fuzzyFilter,
      accessorKey: "createdAt",
      cell: (info) => (
        <Text c="dark.3" p={10} miw={200}>
          {dayjs(info.getValue() as string).format("DD-MM-YYYY hh:mm A")}
        </Text>
      ),
    },
    ...(questions?.length > 0 &&
      questions?.map((q) => {
        const content =
          q?.title[selectedLanguage ? selectedLanguage : defaultLanguage] ||
          q?.description[
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
          accessorFn: (row) =>
            row?.responses?.find((item) => item?.type === q.type)?.response[
              q.type
            ],
          id: content + "_,_" + q.type,
          header: () => (
            <HoverCardComponent content={content} fw={600} fz={"lg"} />
          ),
          enableColumnFilter: ![QuestionType.Photo, QuestionType.PCQ].includes(
            q.type,
          ),
          enableSorting: ![QuestionType.Photo, QuestionType.PCQ].includes(
            q.type,
          ),
          cell: (info) => {
            return (
              <BadgeorTextorPreview
                questionType={q?.type}
                response={getResponse(q.type, info.getValue())}
              />
            );
          },
        };
      })),
    {
      header: () => (
        <Text c="dark.3" truncate="end" fw={600} fz={"lg"}>
          Action
        </Text>
      ),
      enableColumnFilter: false,
      enableSorting: false,
      cell: (info) => {
        return (
          <Button
            variant="subtle"
            color="red"
            onClick={() => {
              setSelectedRowId(info.row.original.id);
              open();
            }}
          >
            <IconTrashXFilled />
          </Button>
        );
      },
      accessorKey: "action",
    },
  ];
  return column;
};

const previewRequired = [QuestionType.Photo];
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
  response: string;
}>) {
  const [previewModalopened, { open, close }] = useDisclosure(false);
  if (previewRequired.includes(questionType)) {
    return (
      <>
        <RateupButtonBlue
          title="Preview"
          leftIcon={<IconEye />}
          size="compact-xs"
          onClick={open}
          disabled={response === "" || !response}
        />
        <PreviewModal
          headerTitle="Preview"
          onClose={close}
          imgObject={response}
          opened={previewModalopened}
        />
      </>
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
  } else {
    return <HoverCardComponent content={response} />;
  }
}
