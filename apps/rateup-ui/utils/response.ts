import { QuestionType } from "../types/enums";
import dayjs from "dayjs";

export function getResponse(qId: string, response: SurveyResponse) {
  const qResponse = response.responses.find((r) => r.questionId === qId);
  if (!qResponse) return null;
  const { type, response: responseType } = qResponse;

  if (type === QuestionType.Testimonial) {
    return qResponse.response[type].testimonial;
  } else if (type === QuestionType.DateTime) {
    const dateTimeValue = qResponse.response.DateTime;
    const date = dayjs(dateTimeValue);

    const formattedDate = date.format("D, MMM YYYY");
    //const formattedTime = date.format("h:mm A");
    // return `${formattedDate}, ${formattedTime}`;

    return `${formattedDate}`;
  } else if (type === QuestionType.DDMS || type === QuestionType.MSQ) {
    const value = responseType[type];
    const formattedValue = value?.map((item) => item.trim()).join(", ");
    return formattedValue || ""; // Return blank if undefined
  } else if (type === QuestionType.WaList) {
    const { title, description } = qResponse.response[QuestionType.WaList];
    return description ? `${title}: ${description}` : title;
  }
  return qResponse.response[type];
}

export function filterResponses(
  responses: SurveyResponse[],
  filters: Array<{ question_id: string; responses: Array<string> }>,
) {
  if (filters.length === 0) {
    return responses;
  } else {
    const filteredResponses = responses?.filter(
      (response) =>
        filters?.every((filter) => {
          const question = response?.responses?.find(
            (item) => item?.questionId === filter?.question_id,
          );
          if (question) {
            if (
              question.type === QuestionType.Opinion ||
              question.type === QuestionType.Rating
            ) {
              return filter?.responses.includes(
                question?.response[question?.type]?.toString(),
              );
            }
            return filter?.responses?.includes(
              question?.response[question?.type],
            );
          } else {
            return false;
          }
        }),
    );
    return filteredResponses;
  }
}
