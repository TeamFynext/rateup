import {
  Group,
  Rating,
  Text,
  ScrollArea,
  Badge,
  SimpleGrid,
} from "@mantine/core";
import { IconThumbUpFilled, IconThumbDownFilled } from "@tabler/icons-react";
import { QuestionType } from "../../../types/enums";
import { ChoiceTypeQuestions, colorMapping } from "../../../utils/constants";
import { getResponseArrayByQuestionType } from "../../../utils/response";

const countResponses = (surveyResponses) => {
  const counts = {};
  for (const question of surveyResponses) {
    const responseType = question.type;
    let responseValue = question.response[responseType];
    if (
      responseType === QuestionType.MSQ ||
      responseType === QuestionType.DDMS
    ) {
      if (typeof responseValue === "string") {
        responseValue = responseValue.split(",");
      } else if (Array.isArray(responseValue)) {
        // do nothing, it's already in the correct format
      } else {
        console.error(
          `Invalid format for 'Multiple Select' responseValue: ${responseValue}`,
        );
        continue;
      }

      for (const option of responseValue) {
        const trimmedOption = option.value.trim();
        counts[trimmedOption] = (counts[trimmedOption] || 0) + 1;
      }
    } else if (
      responseType === QuestionType.MCQ ||
      responseType === QuestionType.CustomNPS ||
      responseType === QuestionType.DDSS
    ) {
      counts[responseValue?.value] = (counts[responseValue?.value] || 0) + 1;
    } else {
      counts[responseValue] = (counts[responseValue] || 0) + 1;
    }
  }

  return counts;
};

const SurveySummaryNew = ({ response, questionType, choices }) => {
  let surveyResponses = response;

  if (ChoiceTypeQuestions.includes(questionType)) {
  }

  const responseCounts = countResponses(response);
  const totalResponses = response?.length;

  const responseArray = Object.entries(responseCounts)?.map(
    ([response, countValue]) => {
      const count = Number(countValue);
      const percentage = ((count / totalResponses) * 100)?.toFixed(2);
      const voteText = count > 1 ? "votes" : "vote";
      return {
        response: response,
        count: count,
        percentage: percentage,
        voteText: voteText,
      };
    },
  );

  switch (questionType) {
    case QuestionType.Opinion:
      return (
        <ScrollArea.Autosize mah={500} maw={450}>
          <SimpleGrid cols={2} verticalSpacing={"xs"}>
            {getResponseArrayByQuestionType(questionType).map((item) => {
              const resObj = responseArray?.find(
                (res) => res?.response == item?.value,
              );
              return (
                <Group pb="sm">
                  <Badge
                    radius="md"
                    w={34}
                    h={32}
                    color={colorMapping[item?.value]?.c}
                    variant={"light"}
                    style={{
                      border: `1px solid ${colorMapping[item?.value]?.c}`,
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
      return (
        <ScrollArea.Autosize mah={500} maw={450}>
          <SimpleGrid cols={1}>
            {choices?.map((choice) => {
              const resObj = responseArray.find(
                (res) => res?.response == choice?.value,
              );
              return (
                <Group pb="sm">
                  <Badge color="indigo" variant="light" w={100}>
                    {choice?.value}
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
    case QuestionType.Rating:
      return (
        <SimpleGrid cols={1} verticalSpacing={"xs"}>
          {getResponseArrayByQuestionType(questionType).map((item) => {
            const resObj = responseArray.find(
              (res) => res?.response == item?.value,
            );
            return (
              <Group>
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
      return (
        <SimpleGrid cols={1} verticalSpacing={"xs"}>
          {getResponseArrayByQuestionType(questionType)?.map((item) => {
            const resObj = responseArray.find(
              (res) => res?.response == item?.value,
            );
            return (
              <Group>
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
                  <Group align="center">
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
      return (
        <SimpleGrid cols={1} verticalSpacing={"xs"}>
          {getResponseArrayByQuestionType(questionType)?.map((item) => {
            const resObj = responseArray.find(
              (res) => res?.response == item?.value,
            );
            return (
              <Group>
                {item?.value === "Yes" ? (
                  <Group align="center" mb="md">
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
                  <Group align="center">
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
      return (
        <SimpleGrid cols={1} verticalSpacing={"xs"}>
          {getResponseArrayByQuestionType(questionType)?.map((item) => {
            const resObj = responseArray.find(
              (res) => res?.response == item?.value,
            );
            const Icon = item?.Icon;
            return (
              <Group>
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
