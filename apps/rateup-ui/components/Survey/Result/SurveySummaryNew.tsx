import {
  Badge,
  Group,
  Rating,
  ScrollArea,
  SimpleGrid,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconThumbDownFilled, IconThumbUpFilled } from "@tabler/icons-react";

import { QuestionType, WaQuestions } from "../../../types/enums";
import {
  getResponseArrayByQuestionType,
  getResponseArrayByQuestionTypeV2,
} from "../../../utils/response";

const SurveySummaryNew = ({
  questionType,
  choiceCounts,
  totalResponses,
  version = 1,
}) => {
  const responseArray = choiceCounts?.map((choice) => {
    const count = choice?.count;
    const percentage =
      totalResponses > 0
        ? ((count / totalResponses) * 100)?.toFixed(2)
        : "0.00";
    const voteText = count > 1 ? "votes" : "vote";
    return {
      response: choice?.choice,
      count: count,
      percentage: percentage,
      voteText: voteText,
    };
  });

  switch (questionType) {
    case QuestionType.Opinion:
    case WaQuestions.Opinion:
      return (
        <ScrollArea.Autosize mah={500} maw={450}>
          <SimpleGrid cols={2} verticalSpacing={"xs"}>
            {getResponseArrayByQuestionType(questionType).map((item) => {
              const resObj = responseArray?.find(
                (res) => res?.response == item?.value,
              );
              return (
                <Group pb="sm" key={item?.value}>
                  <Badge
                    radius="md"
                    w={34}
                    h={32}
                    color={item?.color}
                    variant={"light"}
                    style={{
                      border: `1px solid ${item?.color}`,
                    }}
                  >
                    {item?.value}
                  </Badge>
                  :
                  <Text maw={150}>
                    {resObj
                      ? `${resObj?.count} ${resObj?.voteText} ( ${resObj?.percentage}%)`
                      : "0 vote (0.00%)"}
                  </Text>
                </Group>
              );
            })}
          </SimpleGrid>
        </ScrollArea.Autosize>
      );
    case QuestionType.MCQ:
    case QuestionType.DDSS:
    case QuestionType.CustomNPS:
    case QuestionType.MSQ:
    case QuestionType.DDMS:
    case QuestionType.MCQGrid:
    case WaQuestions.RadioButtonsGroup:
    case WaQuestions.Dropdown:
    case WaQuestions.CheckboxGroup:
      return (
        <ScrollArea.Autosize mah={500} maw={450}>
          <SimpleGrid cols={1}>
            {responseArray?.map((choice) => {
              return (
                <Group pb="sm" key={choice?.response}>
                  <Tooltip label={choice?.response}>
                    <Badge color="indigo" variant="light" w={100}>
                      {choice?.response}
                    </Badge>
                  </Tooltip>
                  :
                  <Text maw={150}>
                    {`${choice?.count} ${choice?.voteText} ( ${choice?.percentage}%)`}
                  </Text>
                </Group>
              );
            })}
          </SimpleGrid>
        </ScrollArea.Autosize>
      );
    case QuestionType.Rating:
      return (
        <SimpleGrid cols={1} verticalSpacing={"xs"}>
          {getResponseArrayByQuestionType(questionType).map((item) => {
            const resObj = responseArray.find(
              (res, index) =>
                res?.response == item?.value || index + 1 === item.value,
            );
            return (
              <Group key={item?.value}>
                <Rating
                  value={Number(item?.value)}
                  color="var(--tertiary-color)"
                  count={Number(item?.value)}
                  readOnly
                  w={100}
                />
                <Text maw={150}>
                  {resObj
                    ? `${resObj?.count} ${resObj?.voteText} ( ${resObj?.percentage}%)`
                    : "0 vote (0.00%)"}
                </Text>
              </Group>
            );
          })}
        </SimpleGrid>
      );

    case QuestionType.LD:
    case WaQuestions.LD:
      return (
        <SimpleGrid cols={1} verticalSpacing={"xs"}>
          {getResponseArrayByQuestionType(questionType)?.map((item) => {
            const resObj = responseArray.find(
              (res) => res?.response == item?.value,
            );
            return (
              <Group key={item?.value}>
                {item?.value === "Like" ? (
                  <Group align="center" mb="sm">
                    <Badge
                      color={"teal"}
                      size="lg"
                      p="md"
                      radius="sm"
                      w={237}
                      mt={"sm"}
                      leftSection={<IconThumbUpFilled />}
                    >
                      {item?.value} :{" "}
                      {resObj
                        ? ` ${resObj?.count} ${resObj?.voteText} ( ${resObj?.percentage}%)`
                        : "0 vote (0.00%)"}
                    </Badge>
                  </Group>
                ) : (
                  <Group align="center" key={item?.value}>
                    <Badge
                      color={"red"}
                      size="lg"
                      p="md"
                      w={237}
                      radius="sm"
                      leftSection={<IconThumbDownFilled />}
                    >
                      {item?.value}{" "}
                      {resObj
                        ? `${resObj?.count} ${resObj?.voteText} ( ${resObj?.percentage}%)`
                        : "0 vote (0.00%)"}
                    </Badge>
                  </Group>
                )}
              </Group>
            );
          })}
        </SimpleGrid>
      );

    case QuestionType.YN:
    case WaQuestions.YN:
      return (
        <SimpleGrid cols={1} verticalSpacing={"xs"}>
          {getResponseArrayByQuestionType(questionType)?.map((item) => {
            const resObj = responseArray.find(
              (res) => res?.response == item?.value,
            );
            return (
              <Group>
                {item?.value === "Yes" ? (
                  <Group align="center" mb="md" key={item?.value}>
                    <Badge
                      color={"teal"}
                      size="lg"
                      p="md"
                      radius="sm"
                      mt={"sm"}
                      w={190}
                    >
                      {item?.value}{" "}
                      {resObj
                        ? `${resObj?.count} ${resObj?.voteText} ( ${resObj?.percentage}%)`
                        : "0 vote (0.00%)"}
                    </Badge>
                  </Group>
                ) : (
                  <Group align="center" key={item?.value}>
                    <Badge color={"red"} size="lg" p="md" radius="sm" w={190}>
                      {item?.value}{" "}
                      {resObj
                        ? `${resObj?.count} ${resObj?.voteText} ( ${resObj?.percentage}%)`
                        : "0 vote (0.00%)"}
                    </Badge>
                  </Group>
                )}
              </Group>
            );
          })}
        </SimpleGrid>
      );

    case QuestionType.Smiley:
      const smileyResponseArray =
        version === 2
          ? getResponseArrayByQuestionTypeV2(questionType)
          : getResponseArrayByQuestionType(questionType);
      return (
        <SimpleGrid cols={1} verticalSpacing={"xs"}>
          {smileyResponseArray?.map((item) => {
            const resObj = responseArray.find(
              (res) => res?.response == item?.value,
            );
            const Icon = item?.Icon;
            return (
              <Group key={item?.value}>
                {<Icon size={"2rem"} color={item?.color} stroke={2} />} :
                <Text maw={150}>
                  {resObj
                    ? `${resObj?.count} ${resObj?.voteText} ( ${resObj?.percentage}%)`
                    : "0 vote (0.00%)"}
                </Text>
              </Group>
            );
          })}
        </SimpleGrid>
      );

    default:
      responseArray?.map((res) => {
        return (
          <div key={res.response}>
            <Text>
              {res.response} : {res.count} {res.voteText}
            </Text>
          </div>
        );
      });
  }
};

export default SurveySummaryNew;
