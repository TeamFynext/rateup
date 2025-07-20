import { generateAnswerHtml } from "../../utils/email/emailTemplateGenerateFunction";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail";
import { createEmailBodySurveyResponse } from "../../utils/email/supertoken/surveyResponseEmail";
import prisma from "../../utils/prisma";
import {
  generateResponseData,
  getContent,
  getReplacedTitleFromVariable,
} from "../../utils/survey/response.data";
import {
  CreateResponseInput,
  GenerateBodyInput,
  ResponseFilterQuery,
} from "./response.schema";
import {
  ChoiceTypeQuestions,
  IntegratedApps,
  LDResponse,
  NPSWeightage,
  PageType,
  QuestionType,
  QuestionType2,
  ResponseSummaryType,
  SmileyResponse,
  SubscriptionFeaturePathName,
  SurveyType,
  WaQuestions,
  YNResponse,
} from "../../types/enums";
import dayjs from "dayjs";
import { saveSheetIdToSurvey } from "../survey/survey.service";
import { google } from "googleapis";
import xlsx from "node-xlsx";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { updateMonthlyStat } from "../stats/stats.service";
import { hasFeature } from "../subscription/subscription.service";
import { log } from "../../utils/logger";
import {
  getQuestionsBySurveyId,
  updateQuestion,
} from "../question/question.service";
import { FastifyRequest } from "fastify";
import { getTextSummaryByAI } from "../chatbot/chatbot.service";
import {
  questionSchema,
  UpdateQuestionInput,
} from "../question/question.schema";
import {
  getIntegrationByName,
  initializeAuthClient,
  updateIntegrationByName,
} from "../integrations/integrations.service";
import {
  addNewContactsToGroup,
  createContactGroup,
  getContactGroupByNameAndTeam,
} from "../contact/contactGroup/contactGroup.service";
import { sendWebhook } from "../../utils/webhook";
import { getFileUrlFromKey } from "../../utils/upload/s3Upload";
import {
  barGraphQuestions,
  barGraphQuestions2,
  LDResponseMap,
  npsQuestionTypes,
  npsQuestionTypes2,
  RatingScaleMap,
  SmileyResponseMap,
  YNResponseMap,
} from "../../utils/enumMap";
import { getFlowBySurveyId } from "../whatsapp/flows/flow.service";
import _ from "lodash";
import { autoGenerateTicket } from "../ticket/ticketCard/card.service";
import { getCampaignParticipantsByCampaignId } from "../campaign/campaignParticipants/campaignParticipants.service";
import { getTeamIdsByUserId } from "../team/team.service";
import { BATCH_SIZE } from "../../utils/constants/constants";
import { Prisma } from "../../../generated/prisma/client";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function getResponses(surveyTeamMapId: string) {
  const responses = await prisma.surveyResponse.findMany({
    where: {
      surveyTeamMapId,
    },
    include: {
      Ticket: {
        select: {
          id: true,
        },
      },
    },
  });
  return responses;
}

export async function getAllResponses(
  surveyId: string,
  teamIds?: Array<string>,
  contactIds?: Array<string>,
  columnFilters?: Array<{ id?: string; value?: string }>,
  ranges?: { startDate?: string; endDate?: string },
  tz = "Asia/Calcutta",
) {
  let responseWhereCondition =
    ranges?.startDate && ranges?.endDate
      ? {
          where: {
            createdAt: {
              gte: dayjs(ranges?.startDate).tz(tz).startOf("day").toISOString(),
              lte: dayjs(ranges?.endDate).tz(tz).endOf("day").toISOString(),
            },
          },
        }
      : {};

  let whereCondtion =
    teamIds?.length > 0
      ? {
          surveyId: surveyId,
          teamId: {
            in: teamIds,
          },
        }
      : {
          surveyId: surveyId,
        };
  const responsesQuery = await prisma.surveyTeamMap.findMany({
    where: whereCondtion,
    select: {
      id: true,
      _count: {
        select: {
          responses: true,
        },
      },
      survey: {
        select: {
          title: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
          code: true,
          campaigns: true,
        },
      },
      responses: {
        ...responseWhereCondition,
        select: {
          id: true,
          contactId: true,
          language: true,
          tag: true,
          responses: true,
          createdAt: true,
          encryptedResponses: true,
          surveyTeamMap: {
            select: {
              teamId: true,
              team: {
                select: {
                  name: true,
                },
              },
            },
          },
          Contact: {
            select: {
              phone: true,
            },
          },
          platform: true,
          Ticket: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  let responseData = responsesQuery.map(({ responses, ...rest }) => {
    return {
      ...rest,
      responses:
        contactIds?.length > 0
          ? responses
              .filter((data) => contactIds.includes(data.contactId))
              .map(({ surveyTeamMap, ...restD }) => ({
                ...restD,
                teamName: surveyTeamMap.team.name,
                teamId: surveyTeamMap.teamId,
              }))
          : responses.map(({ surveyTeamMap, ...restD }) => ({
              ...restD,
              teamName: surveyTeamMap.team.name,
              teamId: surveyTeamMap.teamId,
            })),
    };
  });
  return responseData;
}
export const getResponseBySurveyById = async (id: string) => {
  const responses: any[] = await prisma.$queryRaw`
  SELECT sr.id, sr."createdAt", 
      sr.responses,
      sr.language, sr.tag, sr."surveyTeamMapId", sr.language, s.questions, stm."teamId", co.phone
  FROM "SurveyResponse" sr
  INNER JOIN "SurveyTeamMap" stm ON sr."surveyTeamMapId" = stm.id
  INNER JOIN "WaFlow" wf ON wf."surveyId" = ${id}::uuid
  INNER JOIN "Survey" s ON s.id = stm."surveyId"
  LEFT JOIN "Contact" co ON sr."contactId" = co.id
  WHERE stm."surveyId" = ${id}::uuid`;

  const responsesWithTitles = responses.map(
    ({ id, createdAt, tag, phone, language, teamId, responses, questions }) => {
      // Create a mapping of questionId to title for easier lookup
      const questionMap = questions.reduce(
        (map, { id, title, description, label }) => {
          map[id] =
            Object.values(title)?.[0] ||
            Object.values(description)?.[0] ||
            Object.values(label)?.[0];
          return map;
        },
        {},
      );
      // Map over each response to replace questionId with the corresponding title
      const updatedResponses = responses.map(
        ({ questionId, response = {}, ...rest }) => ({
          ...rest,
          response: Object.values(response)?.[0],
          title: questionMap[questionId],
        }),
      );

      // Return the updated response object
      return {
        id,
        createdAt,
        tag,
        phone,
        language,
        teamId,
        responses: updatedResponses,
      };
    },
  );

  return responsesWithTitles;
};

export const getSurveyList = async (orgId: string) => {
  return prisma.survey.findMany({
    where: {
      orgId,
    },
    select: {
      id: true,
      title: true,
      type: true,
    },
  });
};

export async function downloadExcelResponse(
  surveyId,
  allResponses,
  questions,
  defaultLanguage,
  visibleColumn = [],
  tz = "Asia/Calcutta",
) {
  const responses =
    (allResponses && allResponses?.flatMap((data) => data?.responses)) || [];

  const platform = responses?.[0]?.platform;
  const filteredSecondArray = questions.filter((item) => {
    let qsTitle =
      item?.title[defaultLanguage] ||
      item?.description[defaultLanguage] ||
      item?.label?.[defaultLanguage] ||
      "";
    return visibleColumn.includes(
      getReplacedTitleFromVariable({
        title: qsTitle,
      }) || getContent(qsTitle),
    );
  });

  if (filteredSecondArray && responses) {
    const headerArray = filteredSecondArray.flatMap((question) => {
      let qsTitle =
        question?.title[defaultLanguage] ||
        question?.description[defaultLanguage] ||
        question?.label?.[defaultLanguage] ||
        "";
      return question.type === QuestionType.Contact
        ? (Object.entries(question.features?.[defaultLanguage])
            ?.filter((data: any) => data[1].isEnabled)
            .map((data) => `${getContent(qsTitle)}: ${data[0]}`) ?? [])
        : question.type === QuestionType.MCQGrid
          ? (question.features?.[defaultLanguage]?.questions?.map(
              (q) => `${getContent(qsTitle)}: ${q}`,
            ) ?? [])
          : question.type === QuestionType.MultiTextInput
            ? (question.features?.[defaultLanguage]?.fields?.map(
                (field) =>
                  `${getContent(
                    question.title[defaultLanguage],
                  )}: ${field?.fieldKey}`,
              ) ?? [])
            : question.type === QuestionType.Testimonial
              ? [
                  `${getContent(question.title[defaultLanguage])}: name`,
                  `${getContent(question.title[defaultLanguage])}: testimonial`,
                  ...(question?.features?.[defaultLanguage]
                    ? Object.entries(question.features?.[defaultLanguage])
                        ?.filter(([key, value]) => value)
                        .map(
                          ([key, value]) =>
                            `${getContent(question.title[defaultLanguage])}: ${key}`,
                        )
                    : []),
                ]
              : [getContent(qsTitle)];
    });

    const createdAt = "Date";
    const responseTag = "tag";
    let whatsappRespondentNumber = "Respondent's Mobile Number";
    const teamNameColumn = "Team Name";
    if (visibleColumn.includes("createdAt")) {
      headerArray.unshift(createdAt);
      filteredSecondArray.unshift(createdAt);
    }
    // Add team name column before tags
    headerArray.push(teamNameColumn);
    filteredSecondArray.push(teamNameColumn);

    if (
      platform === "WHATSAPP" &&
      visibleColumn.includes(whatsappRespondentNumber)
    ) {
      headerArray.push(whatsappRespondentNumber);
      filteredSecondArray.push(whatsappRespondentNumber);
    }
    if (visibleColumn.includes(responseTag)) {
      headerArray.push(responseTag);
      filteredSecondArray.push(responseTag);
    }

    const bodyArray = [];
    filteredSecondArray.forEach((question) => {
      const questionId = question.id;
      let tempArray = [];
      responses.forEach((response, answerIndex) => {
        bodyArray.push([]);

        const responsesArr = response.responses;
        const responseObj = responsesArr.find(
          (answerObj) => answerObj.questionId === questionId,
        );
        let responseValue;
        let flag = true;
        if (responseObj) {
          responseValue = responseObj.response[question.type];
          const responseType = responseObj.type;
          switch (responseType) {
            case QuestionType.Photo:
            case QuestionType.File: {
              responseValue = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${responseValue}`;
              break;
            }
            case QuestionType.Date: {
              responseValue = dayjs(responseValue)
                .tz(tz)
                .format("DD-MM-YYYY hh:mm A");
              break;
            }
            case QuestionType.PCQ: {
              responseValue = responseValue?.value?.value;
              break;
            }
            case QuestionType.TnC: {
              responseValue = responseValue?.toString();
              break;
            }
            case QuestionType.PhotoPicker:
            case QuestionType.DocumentPicker: {
              responseValue = getFileUrlFromKey(responseValue?.toString());
              break;
            }
          }
          if (
            QuestionType.Contact === responseType &&
            !tempArray.includes({ [answerIndex]: questionId })
          ) {
            tempArray.push({ [answerIndex]: questionId });
            // Modified: handle both single value and multiple values for contact type
            if (
              responseValue &&
              typeof responseValue === "object" &&
              !Array.isArray(responseValue)
            ) {
              // If responseValue is an object, push values in header order
              Object.entries(
                question.features?.[defaultLanguage] || {},
              ).forEach(([key, feature]) => {
                if ((feature as { isEnabled?: boolean })?.isEnabled) {
                  bodyArray[answerIndex].push(responseValue[key] ?? "");
                }
              });
            } else if (
              typeof responseValue === "string" ||
              typeof responseValue === "number"
            ) {
              // If responseValue is a single value, push it
              bodyArray[answerIndex].push(responseValue);
            } else {
              bodyArray[answerIndex].push("");
            }
            flag = false;
          } else if (
            QuestionType.MCQGrid === responseType &&
            !tempArray.includes({ [answerIndex]: questionId })
          ) {
            tempArray.push({ [answerIndex]: questionId });
            question?.features?.[defaultLanguage]?.questions?.map((q) =>
              responseValue?.[q]
                ? bodyArray[answerIndex].push(responseValue?.[q]?.value)
                : bodyArray[answerIndex].push(""),
            );
            flag = false;
          } else if (
            QuestionType.MultiTextInput === responseType &&
            !tempArray.includes({ [answerIndex]: questionId })
          ) {
            tempArray.push({ [answerIndex]: questionId });
            question?.features?.[defaultLanguage]?.fields?.map((field) =>
              responseValue?.[field?.fieldKey]
                ? bodyArray[answerIndex].push(responseValue?.[field?.fieldKey])
                : bodyArray[answerIndex].push(""),
            );
            flag = false;
          } else if (
            QuestionType.Testimonial === responseType &&
            !tempArray.includes({ [answerIndex]: questionId })
          ) {
            tempArray.push({ [answerIndex]: questionId });
            bodyArray[answerIndex].push(responseValue?.name ?? "");
            bodyArray[answerIndex].push(responseValue?.testimonial ?? "");
            question?.features?.[defaultLanguage] &&
              Object.entries(question?.features?.[defaultLanguage])
                .filter(([key, value]) => value)
                .map(([key, value]) =>
                  responseValue?.[key]
                    ? bodyArray[answerIndex].push(
                        key == "photo"
                          ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${responseValue?.[key]}`
                          : responseValue?.[key],
                      )
                    : bodyArray[answerIndex].push(""),
                );
            flag = false;
          } else if (!tempArray.includes({ [answerIndex]: questionId })) {
            if (ChoiceTypeQuestions.includes(responseType)) {
              responseValue = Array.isArray(responseValue)
                ? responseValue
                    ?.map(
                      (res) =>
                        res?.value ||
                        `${question?.features?.[defaultLanguage]?.other?.title}:${res?.other}`,
                    )
                    .join(", ")
                : responseType == QuestionType.MCQ
                  ? responseValue?.value ||
                    `${question?.features?.[defaultLanguage]?.other?.title}:${responseValue?.other}`
                  : responseValue?.value;
            } else if (typeof responseValue === "object") {
              responseValue = responseValue?.value
                ? Object.values(responseValue?.value || {}).join(", ")
                : Object.values(responseValue || {}).join(", ");
            }
          }
        } else if (question === createdAt) {
          const createdAtFormatted = dayjs(response.createdAt)
            .tz(tz)
            .format("DD-MM-YYYY hh:mm A");
          responseValue = createdAtFormatted;
        } else if (question === teamNameColumn) {
          responseValue = response.teamName || "";
        } else if (question === "Respondent's Mobile Number") {
          responseValue = response?.Contact?.phone;
        } else if (question === responseTag) {
          const tags = response.tag ? response.tag.split(",") : [];
          tags.forEach((tag, index) => {
            const tagColumnName = `tag ${index + 1}`;
            if (!headerArray.includes(tagColumnName)) {
              if (index === 0) {
                headerArray.pop();
                filteredSecondArray.pop();
              }
              headerArray.push(tagColumnName);
              filteredSecondArray.push(tagColumnName);
            }
            bodyArray[answerIndex].push(tag.trim());
          });
        } else {
          if (question.type === QuestionType.MCQGrid) {
            question?.features?.[defaultLanguage]?.questions?.map((q) =>
              bodyArray[answerIndex].push(""),
            );
            flag = false;
          } else if (question.type === QuestionType.Contact) {
            Object.entries(question.features?.[defaultLanguage] || {}).forEach(
              ([key, feature]: any) => {
                if (feature?.isEnabled) bodyArray[answerIndex].push("");
              },
            );
            flag = false;
          } else if (question.type === QuestionType.Testimonial) {
            bodyArray[answerIndex].push("", "");
            const features = question.features?.[defaultLanguage];
            if (features) {
              Object.values(features ?? {}).forEach((key: any) => {
                if (key) bodyArray[answerIndex].push("");
              });
              flag = false;
            }
          } else if (question.type === QuestionType.MultiTextInput) {
            question?.features?.[defaultLanguage]?.fields?.forEach((field) =>
              bodyArray[answerIndex].push(""),
            );
            flag = false;
          }
          responseValue = "";
        }
        if (flag) {
          bodyArray[answerIndex].push(responseValue);
        }
      });
    });
    let options = [];
    headerArray.map((data, i) => {
      const headingWidth = String(data)?.length + 2;
      const dataWidth = getMaxContentWidth(bodyArray, i);
      const width = Math.max(headingWidth, dataWidth);
      options.push({ width: width > 40 ? 40 : width });
    });
    let buffer = xlsx.build([
      {
        name: "Sheet1",
        data: [headerArray, ...bodyArray],
        options: {
          "!cols": options,
        },
      },
    ]);

    return buffer;
  }
}

export async function downloadExcelResponseV2(
  allResponses,
  questions,
  visibleColumn = [],
  tz = "Asia/Calcutta",
) {
  const responses = allResponses?.flatMap((data) => data?.responses) || [];

  const filteredQuestions = questions.filter((item) =>
    visibleColumn.includes(item?.label || ""),
  );

  if (filteredQuestions && responses.length) {
    const headerArray = filteredQuestions.map((question) =>
      markdownToPlainText(question?.header || question?.label || ""),
    );

    const createdAt = "Date";
    const responseTag = "tag";
    const whatsappRespondentNumber = "Respondent Mobile";

    if (visibleColumn.includes("createdAt")) {
      headerArray.unshift(createdAt);
      filteredQuestions.unshift({ label: createdAt });
    }

    if (visibleColumn.includes(whatsappRespondentNumber)) {
      headerArray.push(whatsappRespondentNumber);
      filteredQuestions.push({ label: whatsappRespondentNumber });
    }

    // Split tags into multiple columns if necessary
    const tagColumns = [];
    if (visibleColumn.includes(responseTag)) {
      const maxTags = Math.max(
        ...responses.map(
          (response) => (response.tag || "").split(",").filter(Boolean).length,
        ),
      );
      for (let i = 0; i < maxTags; i++) {
        const tagColumnName = `Tag ${i + 1}`;
        headerArray.push(tagColumnName);
        tagColumns.push(tagColumnName);
        filteredQuestions.push({ label: tagColumnName });
      }
    }

    const bodyArray = responses.map((response) => {
      const row = [];

      filteredQuestions.forEach((question) => {
        const questionId = question.id;
        const responseObj = response.responses?.find(
          (answerObj) => answerObj.questionId === questionId,
        );
        let responseValue;

        if (responseObj) {
          responseValue = getCellData(responseObj.response, question);
        } else if (question.label === createdAt) {
          responseValue = dayjs(response.createdAt)
            .tz(tz)
            .format("DD-MM-YYYY hh:mm A");
        } else if (question.label === whatsappRespondentNumber) {
          responseValue = response?.Contact?.phone || "";
        } else if (question.label?.toLowerCase()?.startsWith(responseTag)) {
          // Handle tags split into columns
          const tags = (response.tag || "").split(",").filter(Boolean);
          let index = parseInt(question.label.split(" ")[1]) - 1;
          responseValue = tags[index || 0];
        } else {
          responseValue = "";
        }

        if (responseValue !== undefined) {
          row.push(responseValue);
        }
      });

      return row;
    });

    // Adjust column widths
    const options = headerArray.map((header, index) => {
      const headingWidth = String(header).length + 2;
      const dataWidth = getMaxContentWidth(bodyArray, index);
      return { width: Math.min(Math.max(headingWidth, dataWidth), 40) };
    });

    const buffer = xlsx.build([
      {
        name: "Sheet1",
        data: [headerArray, ...bodyArray],
        options: {
          "!cols": options,
        },
      },
    ]);
    return buffer;
  }
}
function getMaxContentWidth(data, columnIndex: number) {
  let maxWidth = 0;
  for (const row of data) {
    const valueLength = String(row[columnIndex]).length;
    if (valueLength > maxWidth) {
      maxWidth = valueLength;
    }
  }
  return maxWidth;
}
export async function resetResponsesStats(surveyTeamMapId: string) {
  const deleteResponses = await prisma.surveyResponse.deleteMany({
    where: {
      surveyTeamMapId,
    },
  });

  const deleteStats = await prisma.surveyStats.deleteMany({
    where: {
      surveyTeamMapId,
    },
  });

  const deletionMessage = `Deleted.. ${deleteResponses.count} survey responses for survey ID: ${surveyTeamMapId}`;
  return deletionMessage;
}

export async function deleteResponse(id: string) {
  const deleteResponse = await prisma.surveyResponse.delete({
    where: {
      id,
    },
  });

  return deleteResponse;
}

export async function createResponse(
  input: CreateResponseInput,
  shouldRaiseTicket = false,
  checkUniqueDevice = false,
  ip = null,
  columnId?: string,
) {
  if (checkUniqueDevice) {
    const existingResponse = await prisma.surveyResponse.findFirst({
      where: {
        surveyTeamMapId: input?.surveyTeamMapId,
        ip: ip,
      },
    });

    if (existingResponse) {
      throw new Error("ALREADY_RESPONDED");
    }
  }
  const { phone, contactId: contact, ...rest } = input;
  let contactId = contact;
  if (phone) {
    const surveyTeamMap = await prisma.surveyTeamMap.findFirst({
      where: {
        id: input.surveyTeamMapId,
      },
      include: {
        team: {
          select: {
            orgId: true,
          },
        },
      },
    });
    const contact = await prisma.contact.findFirst({
      where: { phone: phone, orgId: surveyTeamMap.team.orgId },
      select: { id: true },
    });
    if (!contact)
      log.error("no contact found", phone, surveyTeamMap?.team?.orgId);
    contactId = contact?.id;
  }
  const surveyResponse = await prisma.surveyResponse.create({
    data: {
      ...rest,
      tag: rest.tag,
      surveyTeamMapId: rest.surveyTeamMapId,
      language: rest.language,
      responses: rest.responses as QuestionResponse[],
      encryptedResponses: rest.encryptedResponses,
      contactId,
    },
    include: {
      surveyTeamMap: {
        include: {
          survey: {
            select: {
              questions: true,
              responseWebhookEndpoint: true,
            },
          },
          team: {
            select: {
              orgId: true,
              id: true,
            },
          },
        },
      },
      Contact: {
        select: {
          phone: true,
        },
      },
    },
  });

  surveyResponse &&
    updateMonthlyStat(
      surveyResponse.platform === "WHATSAPP"
        ? SubscriptionFeaturePathName.WhatsAppSurvey
        : "survey",
      surveyResponse?.surveyTeamMap?.team.orgId,
    );

  if (shouldRaiseTicket && input?.responses?.length > 0 && columnId) {
    //generate ticket
    await autoGenerateTicket({
      ticketColumnId: columnId,
      surveyResponseId: surveyResponse.id,
      type:
        surveyResponse.platform === "WEB" ? "SURVEY_RESPONSE" : "FLOW_RESPONSE",
      orgId: surveyResponse?.surveyTeamMap?.team.orgId,
    });
  }

  return surveyResponse;
}
interface Location {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  city: string;
  state: string;
  country: string;
}
export async function updateResponse(
  responseId: string,
  data: { ip: string; location: Location },
) {
  const response = await prisma.surveyResponse.update({
    where: {
      id: responseId,
    },
    data: {
      ip: data.ip,
      location: data.location as any,
    },
  });
  return response;
}

export async function sendEmailOnResponseCreation(id: string, surveyResponse) {
  const response = await prisma.surveyTeamMap.findFirst({
    where: { id },
    include: {
      survey: {
        select: {
          notificationEmail: true,
          enableNotificationEmail: true,
          id: true,
          title: true,
        },
      },
      team: {
        select: {
          orgId: true,
        },
      },
    },
  });
  const { survey, team } = response ?? {};

  if (
    survey?.enableNotificationEmail &&
    survey.notificationEmail &&
    (await hasFeature(
      team.orgId,
      SubscriptionFeaturePathName.EmailNotification,
    ))
  ) {
    const { notificationEmail } = survey;
    const surveyQuestion =
      surveyResponse?.surveyTeamMap?.survey?.questions ?? [];
    const surveyAnswer = surveyResponse?.responses ?? [];
    const language = surveyResponse?.language;
    const combineArray = surveyQuestion.map((qs) => ({
      ...qs,
      response:
        surveyAnswer.find(
          (ans: { questionId: string }) => ans.questionId === qs.id,
        )?.response || {},
    }));
    const bodyJsx = combineArray
      ?.map((data) => {
        const questionText = language
          ? data?.title[language]
          : Object.values(data?.title)[0];
        const answerText = generateAnswerHtml(
          Object.values(data?.response)[0],
          data.type,
        );
        return (
          answerText &&
          `<tr>
              <td class="question-answer-body"><strong style="font-size: 18px;">${questionText}</strong></td>
            </tr>
            <tr>
              <td class="question-answer-body">${answerText}</td>
            </tr>
          `
        );
      })
      .join("");
    const msg = {
      to: notificationEmail,
      subject: "RateUp: New Survey Response",
      text: "survey response.",
      html: createEmailBodySurveyResponse(
        `${process.env.FRONTEND_URL}/dashboard/surveys/${survey?.id}?tab=Result`,
        bodyJsx,
        survey?.title,
      ),
    };
    await sendAWSEmail(msg);
  }
  return "response";
}

export const generateResponse = async (body: GenerateBodyInput) => {
  let data: any = [];
  const surveyTeamMap = await prisma.surveyTeamMap.findFirst({
    where: {
      id: body.surveyTeamMapId,
    },
    include: {
      survey: {
        select: {
          questions: true,
          languages: true,
          type: true,
        },
      },
    },
  });

  for (let index = 0; index < body.batchSize; index++) {
    data.push(generateResponseData(surveyTeamMap.id, surveyTeamMap.survey));
  }
  if (data.length === 0) throw new Error("Survey Not Found");
  await prisma.surveyResponse.createMany({
    data,
  });
  return data;
};

// Improved syncResponseToGoogleSheet for better performance with large datasets
export async function syncResponseToGoogleSheet(surveyId: string, orgId) {
  const { GoogleSpreadsheet } = await import("google-spreadsheet");
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    select: {
      spreadSheetId: true,
      teams: { select: { team: { select: { id: true, name: true } } } },
      title: true,
      languages: true,
      questions: true,
      type: true,
    },
  });
  const authClient = await initializeAuthClient();
  const tokenFromIntgration = (await getIntegrationByName(
    orgId,
    IntegratedApps.googlesheet,
  )) as unknown as GoogleSheetIntegration;
  authClient.credentials.refresh_token =
    tokenFromIntgration.credential?.refreshToken;
  const drive = google.drive({ version: "v3", auth: authClient });
  const isDocExist = survey?.spreadSheetId
    ? await checkFileExistInDrive(survey?.spreadSheetId, drive)
    : false;
  let doc = isDocExist
    ? new GoogleSpreadsheet(survey.spreadSheetId, authClient)
    : null;
  if (!doc) {
    const driveFolderId = await getDriveFolderId(
      orgId,
      authClient,
      drive,
      tokenFromIntgration,
    );
    const existingFiles = await drive.files.list({
      q: `mimeType = 'application/vnd.google-apps.spreadsheet' and name = '${survey.title}' and '${driveFolderId}' in parents`,
      fields: "nextPageToken, files(id, name)",
      spaces: "drive",
    });
    if (existingFiles.data.files.length) {
      doc = new GoogleSpreadsheet(existingFiles.data.files[0].id, authClient);
    } else {
      doc = await GoogleSpreadsheet.createNewSpreadsheetDocument(authClient, {
        title: survey.title,
      });
      let fileId = doc.spreadsheetId;
      const file = await drive.files.get({
        fileId: fileId,
        fields: "parents",
      });
      const previousParents = file.data.parents.join(",");
      await drive.files.update({
        fileId: fileId,
        removeParents: previousParents,
        addParents: driveFolderId,
        fields: "id, parents",
      });
    }
    await saveSheetIdToSurvey(doc.spreadsheetId, surveyId);
  }
  await doc.loadInfo();

  const BATCH_SIZE = 8000; // Tune this based on memory and Google API limits
  let flow = await getFlowBySurveyId(surveyId);
  const filteredSecondArray = flow?.json?.screens?.flatMap((screen) =>
    screen?.layout?.children?.filter(
      (child) => child?.type !== "Footer" && child.name,
    ),
  ) as any[];
  const checkVersion = flow ? flow.version === 1 : true;

  if (checkVersion) {
    const languages = survey?.languages;
    let questions = survey?.questions as unknown as Array<Question>;
    // Precompute question titles for each language
    const languageQuestionTitles: Record<string, string[]> = {};
    for (const lang of languages) {
      let questionTitles = [];
      questions.map((q: Question, index: number) => {
        if (
          [QuestionType.InfoMessage, ...Object.values(PageType)].includes(
            q.type,
          )
        )
          return false;
        let qsTitle =
          q?.title[lang] || q?.description[lang] || q?.label?.[lang] || "";
        const qstnTitle = index + 1 + "_" + getContent(qsTitle)?.trim();
        if (
          [
            QuestionType.Contact,
            QuestionType.Email,
            QuestionType.Phone,
          ].includes(q.type)
        )
          Object.entries(q.features?.[lang]).map(([key, value]) =>
            typeof value === "object" &&
            value !== null &&
            "isEnabled" in value &&
            (value as { isEnabled: boolean }).isEnabled
              ? questionTitles.push((qstnTitle + ":" + key).trim())
              : null,
          );
        else if (q.type === QuestionType.Testimonial) {
          questionTitles.push((qstnTitle + ":name").trim());
          questionTitles.push((qstnTitle + ":testimonial").trim());
          Object.entries(q.features?.[lang]).map(([key, value]) =>
            value ? questionTitles.push((qstnTitle + ":" + key).trim()) : null,
          );
        } else if (q.type === QuestionType.MCQGrid) {
          const subQs = q.features?.[lang]?.questions;
          subQs.map((qstn) =>
            questionTitles.push((qstnTitle + ":" + qstn).trim()),
          );
        } else if (q.type === QuestionType.MultiTextInput) {
          const fields = q.features?.[lang]?.fields;
          fields?.map((field) =>
            questionTitles.push((qstnTitle + ":" + field?.fieldKey).trim()),
          );
        } else questionTitles.push(qstnTitle);
      });
      languageQuestionTitles[lang] = questionTitles;
    }

    // For each language, process responses in batches
    for (const lang of languages) {
      const additionalColumns = ["Team", "Respondent's Mobile Number", "Tag"];
      const headerRow = [
        "Created At",
        ...languageQuestionTitles[lang],
        ...additionalColumns,
      ];
      const totalColumnCount = headerRow.length;
      let sheet =
        (await doc.sheetsByTitle[lang]) ??
        (await doc.addSheet({
          title: lang,
          headerValues: headerRow,
          gridProperties:
            totalColumnCount > 26
              ? { columnCount: totalColumnCount }
              : undefined,
        }));
      const initialRowCount = await sheet.rowCount;
      if (totalColumnCount > sheet.columnCount)
        await sheet.resize({
          columnCount: totalColumnCount,
          rowCount: initialRowCount,
        });
      await sheet.setHeaderRow(headerRow);
      await sheet.saveUpdatedCells();
      await sheet.clearRows();

      // Get all teamIds for this survey
      const teamIds = survey.teams.map((t) => t.team.id);

      // Count total responses for this language
      const totalCount = await prisma.surveyResponse.count({
        where: {
          surveyTeamMap: { surveyId, teamId: { in: teamIds } },
          language: lang,
        },
      });

      // Process in batches
      for (let skip = 0; skip < totalCount; skip += BATCH_SIZE) {
        const responses = await prisma.surveyResponse.findMany({
          where: {
            surveyTeamMap: { surveyId, teamId: { in: teamIds } },
            language: lang,
          },
          include: {
            surveyTeamMap: {
              select: {
                team: { select: { name: true } },
              },
            },
            Contact: { select: { phone: true } },
          },
          orderBy: { createdAt: "asc" },
          skip,
          take: BATCH_SIZE,
        });

        // Prepare rows for this batch
        const responseForSheet = [];
        for (const response of responses) {
          const resObj: Record<string, any> = {
            Team: response.surveyTeamMap.team.name,
            "Created At": dayjs(response.createdAt).format("DD-MM-YYYY HH:mm"),
          };
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (
              [QuestionType.InfoMessage, ...Object.values(PageType)].includes(
                q.type,
              )
            )
              continue;
            let qsTitle =
              q?.title[lang] || q?.description[lang] || q?.label?.[lang] || "";
            const qstnTitle = i + 1 + "_" + getContent(qsTitle)?.trim();
            const res = response.responses.find((r) => r.questionId === q.id);
            if (res) {
              if (
                [
                  QuestionType.Contact,
                  QuestionType.Email,
                  QuestionType.Phone,
                ].includes(q.type)
              )
                Object.entries(res.response[res.type]).map(
                  ([key, value]) =>
                    (resObj[(qstnTitle + ":" + key).trim()] = value),
                );
              else if (q.type === QuestionType.Testimonial)
                Object.entries(res.response[res.type]).map(
                  ([key, value]) =>
                    (resObj[(qstnTitle + ":" + key).trim()] =
                      key == "photo"
                        ? `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${value}`
                        : value),
                );
              else if (q.type === QuestionType.MCQGrid)
                Object.entries(res.response[res.type]).map(
                  ([key, value]: [string, Choice]) =>
                    (resObj[(qstnTitle + ":" + key).trim()] = value?.value),
                );
              else if (q.type === QuestionType.MultiTextInput)
                Object.entries(res.response[res.type]).map(
                  ([key, value]) =>
                    (resObj[(qstnTitle + ":" + key).trim()] = value),
                );
              else
                resObj[qstnTitle] = getFormattedResponse(
                  res.response[res.type],
                  q,
                  lang,
                );
            }
          }
          resObj["Respondent's Mobile Number"] = response?.Contact?.phone;
          resObj["Tag"] = response?.tag;
          responseForSheet.push(resObj);
        }
        // Add batch of rows
        if (responseForSheet.length > 0) {
          await sheet.addRows(responseForSheet);
        }
      }
    }
  } else {
    // WaFlow version 2
    // Prepare header
    const responsesCount = await prisma.surveyResponse.count({
      where: { surveyTeamMap: { surveyId } },
    });
    const headerArray = filteredSecondArray.map((question) =>
      markdownToPlainText(question?.header || question?.label || ""),
    );
    const createdAt = "Created At";
    const responseTag = "Tag";
    let whatsappRespondentNumber = "Respondent's Mobile Number";
    let teamTag = "Team";
    headerArray.unshift(createdAt);
    filteredSecondArray.unshift(createdAt);
    headerArray.push(whatsappRespondentNumber);
    filteredSecondArray.push(whatsappRespondentNumber);
    headerArray.push(responseTag);
    filteredSecondArray.push(responseTag);
    headerArray.push(teamTag);
    filteredSecondArray.push(teamTag);

    const totalColumnCount = filteredSecondArray.length;
    let lang = "en";
    let sheet =
      doc.sheetsByTitle[lang] ??
      (await doc.addSheet({
        title: lang,
        headerValues: headerArray,
        gridProperties:
          totalColumnCount > 26 ? { columnCount: totalColumnCount } : undefined,
      }));
    const initialRowCount = sheet.rowCount;
    if (totalColumnCount > sheet.columnCount)
      await sheet.resize({
        columnCount: totalColumnCount,
        rowCount: initialRowCount,
      });
    await sheet.setHeaderRow(headerArray);
    await sheet.clearRows();

    // Process in batches
    for (let skip = 0; skip < responsesCount; skip += BATCH_SIZE) {
      const responses = await prisma.surveyResponse.findMany({
        where: { surveyTeamMap: { surveyId } },
        include: {
          Contact: { select: { phone: true } },
          surveyTeamMap: {
            select: {
              teamId: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: BATCH_SIZE,
      });

      const bodyArray: string[][] = [];
      for (const response of responses) {
        const row: string[] = [];
        filteredSecondArray.forEach((question) => {
          const questionId = question.id;
          const responseObj: any = response.responses.find(
            (answerObj: { questionId: string }) =>
              answerObj.questionId === questionId,
          );
          let responseValue: string;
          if (responseObj) {
            responseValue = getCellData(responseObj.response, question);
          } else if (question === createdAt) {
            const createdAtFormatted = dayjs(response.createdAt).format(
              "DD-MM-YYYY HH:mm",
            );
            responseValue = createdAtFormatted;
          } else if (question === whatsappRespondentNumber) {
            responseValue = response?.Contact?.phone || "";
          } else if (question === responseTag) {
            responseValue = response.tag || "";
          } else if (question === teamTag) {
            // Try to get team name from survey.teams
            let teamName = "";
            if (response?.surveyTeamMapId && survey.teams) {
              const found = survey.teams.find(
                (t) => t.team.id === response?.surveyTeamMap?.teamId,
              );
              teamName = found?.team?.name || "";
            }
            responseValue = teamName;
          } else {
            responseValue = "";
          }
          row.push(responseValue);
        });
        bodyArray.push(row);
      }
      if (bodyArray.length > 0) {
        await sheet.addRows(bodyArray);
      }
    }
    await sheet.saveUpdatedCells();
  }
  const sheetToRemove = doc.sheetsByTitle["Sheet1"];
  if (sheetToRemove) sheetToRemove.delete();
  return survey;
}

export async function getDriveFolderId(
  orgId: string,
  authClient,
  drive,
  token,
) {
  let { driveFolderId } = token?.credential;

  const isFolderExist = driveFolderId
    ? await checkFileExistInDrive(driveFolderId, drive)
    : null;
  if (!isFolderExist) {
    const folderName = "RateUp";
    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    };
    const folderList = await drive.files.list({
      q: `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}'`,
      fields: "nextPageToken, files(id, name)",
      spaces: "drive",
    });
    if (folderList.data.files.length) {
      driveFolderId = folderList.data.files[0].id;
    } else {
      const file = await drive.files.create({
        requestBody: fileMetadata,
        fields: "id",
      });
      driveFolderId = file.data.id;
    }
    await updateIntegrationByName(orgId, IntegratedApps.googlesheet, {
      credential: { ...token?.credential, driveFolderId },
    });
  }
  return driveFolderId;
}

async function checkFileExistInDrive(fileId, drive) {
  try {
    await drive.files.get({ fileId });
    return true;
  } catch (e) {
    console.log(e);
    if (e?.response?.statusText == "Not Found") return false;
  }
}
interface IsheetResponse {
  surveyTeamMapId: string;
  responses: QuestionResponse[];
  language: string;
  createdAt: Date;
  respondent: string;
  tag: string;
}
export async function saveResponseToGoogleSheet(responseData: IsheetResponse) {
  try {
    const { GoogleSpreadsheet } = await import("google-spreadsheet");
    const { respondent, tag, ...response } = responseData;
    const {
      survey: { spreadSheetId, questions, id: surveyId },
      team,
    } = await prisma.surveyTeamMap.findUnique({
      where: {
        id: response.surveyTeamMapId,
      },
      select: {
        survey: {
          select: {
            spreadSheetId: true,
            questions: true,
            id: true,
          },
        },
        team: {
          select: {
            name: true,
            orgId: true,
          },
        },
      },
    });
    if (spreadSheetId) {
      const authClient = await initializeAuthClient();
      const token = (await getIntegrationByName(
        team.orgId,
        IntegratedApps.googlesheet,
      )) as unknown as GoogleSheetIntegration;
      authClient.credentials.refresh_token = token?.credential?.refreshToken;
      const doc = new GoogleSpreadsheet(spreadSheetId, authClient);
      await doc.loadInfo();
      let sheet = await doc.sheetsByTitle[response.language];
      const resObj = {
        Team: team.name,
        team: team.name, // for old synced response
      };
      resObj["Created At"] = dayjs(response.createdAt).format(
        "DD-MM-YYYY HH:mm",
      );

      let flow = await getFlowBySurveyId(surveyId);
      const filteredSecondArray = flow?.json?.screens?.flatMap((screen) =>
        screen?.layout?.children?.filter(
          (child) => child?.type !== "Footer" && child.name,
        ),
      ) as unknown as Question2[];
      const checkVersion = flow ? flow.version === 1 : true;
      response.responses.map((res: QuestionResponse) => {
        if (checkVersion) {
          let QIndex;
          let qstn = (questions as unknown as Question[]).find(
            (q: Question, index: number) => {
              if (q.id === res.questionId) {
                QIndex = index + 1;
                return q;
              }
            },
          );
          let qsTitle =
            qstn?.title[response.language] ||
            qstn?.description[response.language] ||
            qstn?.label?.[response.language] ||
            "";
          let qstnTitle = QIndex + "_" + getContent(qsTitle).trim();
          if (
            [
              QuestionType.Contact,
              QuestionType.Email,
              QuestionType.Phone,
            ].includes(qstn.type)
          )
            Object.entries(res.response[res.type]).map(
              ([key, value]) =>
                (resObj[(qstnTitle + ":" + key).trim()] = value),
            );
          else if (qstn.type === QuestionType.Testimonial)
            Object.entries(res.response[res.type]).map(
              ([key, value]) =>
                (resObj[(qstnTitle + ":" + key).trim()] =
                  key == "photo"
                    ? `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${value}`
                    : value),
            );
          else if (qstn.type === QuestionType.MCQGrid)
            Object.entries(res.response[res.type]).map(
              ([key, value]: [string, Choice]) =>
                (resObj[(qstnTitle + ":" + key).trim()] = value?.value),
            );
          else if (qstn.type === QuestionType.MultiTextInput)
            Object.entries(res.response[res.type]).map(
              ([key, value]) =>
                (resObj[(qstnTitle + ":" + key).trim()] = value),
            );
          else
            resObj[qstnTitle] = getFormattedResponse(
              res.response[res.type],
              qstn,
              response.language,
            );
        } else {
          const questionId = res.questionId;
          let question = filteredSecondArray.find(
            (q) => q.id === questionId,
          ) as unknown as Question2;
          let qstnTitle = markdownToPlainText(
            question?.header || question?.label || "",
          );
          const responseObj = response.responses.find(
            (answerObj) => answerObj.questionId === questionId,
          );
          let responseValue: string;
          if (responseObj) {
            responseValue = getCellData(responseObj.response, question);
          } else {
            responseValue = "";
          }
          resObj[qstnTitle] = responseValue;
        }
      });
      resObj["Respondent's Mobile Number"] = respondent;
      resObj["Tag"] = tag;
      resObj["tag"] = tag; // for old synced response
      await sheet.addRow(resObj);
    }
    return spreadSheetId;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function getFormattedResponse(response, qstn, language) {
  let formattedResponse = "";
  switch (qstn?.type) {
    case QuestionType.MCQ:
      formattedResponse =
        response?.value?.trim() ||
        `${
          qstn?.features?.[language]?.other?.title
        }: ${response?.other?.trim()}`;
      break;
    case QuestionType.CustomNPS:
    case QuestionType.DDSS:
      formattedResponse = response.value.trim();
      break;
    case QuestionType.DDMS:
    case QuestionType.MSQ:
      formattedResponse = response
        .map(
          (item) =>
            item?.value?.trim() ||
            `${
              qstn?.features?.[language]?.other?.title
            }: ${item?.other?.trim()}`,
        )
        .join(", ");
      break;
    case QuestionType.Date:
      formattedResponse = dayjs(response).format("DD, MMM YYYY");
      break;
    case QuestionType.Photo:
    case QuestionType.File:
      formattedResponse = `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${response}`;
      break;
    case QuestionType.PCQ:
      formattedResponse = response.value.value;
      break;
    case QuestionType.TnC:
      formattedResponse = response == true ? "accepted" : "Not accepted";
      break;
    case QuestionType.EmailOtp:
      formattedResponse = `verified email Id: ${response?.email}`;
      break;
    default:
      formattedResponse = response;
  }
  return formattedResponse;
}

export async function getAIResponseSummaryBySurveyId(
  surveyId: string,
  questionId: string,
) {
  const { aiResponseSummary } = await prisma.survey.findUnique({
    where: {
      id: surveyId,
    },
    select: {
      aiResponseSummary: true,
    },
  });
  return aiResponseSummary as unknown as ResponseSummary[];
}

export async function updateSummaryOnSurvey(surveyId, updatedSummary) {
  await prisma.survey.update({
    where: {
      id: surveyId,
    },
    data: {
      aiResponseSummary: updatedSummary,
    },
  });
}

export async function getResponseSummary(
  surveyId: string,
  request: FastifyRequest,
  allowedTokens,
  usedTokens,
  type: ResponseSummaryType,
  questionId: string,
  teamId?: string,
) {
  const allResponses = await getAllResponses(surveyId);

  const aiResponseSummary = await getAIResponseSummaryBySurveyId(
    surveyId,
    questionId,
  );

  let questionIndex = null;
  const responseSummary = aiResponseSummary.find((q, index) => {
    if (q.questionId === questionId) {
      questionIndex = index;
      return true;
    }
    return false;
  });
  const questionResponses = allResponses
    .flatMap((res) =>
      res.responses.map((r) => ({
        responseId: r.id,
        teamId: r.teamId,
        response: r.responses.find(
          (ir) => (ir as unknown as QuestionResponse).questionId === questionId,
        ) as unknown as QuestionResponse,
      })),
    )
    .filter((r) => r.response != undefined);

  let existingSummary = null;
  let filteredResponses = questionResponses;
  if (type === ResponseSummaryType.All && responseSummary) {
    existingSummary = responseSummary.all;
  } else if (type === ResponseSummaryType.Team && responseSummary) {
    if (!teamId) throw new Error("TeamId not found");
    filteredResponses = questionResponses.filter((r) => r.teamId === teamId);
    existingSummary = responseSummary?.team?.find((t) => t.teamId === teamId);
  }
  const responseIds = filteredResponses.map((r) => r.responseId);
  const responsesNotSummarised = existingSummary
    ? filteredResponses.filter(
        (r) => !existingSummary.responseIds.includes(r.responseId),
      )
    : filteredResponses;
  if (!responsesNotSummarised.length) return;
  const responseTexts = responsesNotSummarised.map((r) =>
    r.response.type
      ? r.response.response[r.response.type]
      : r.response.response,
  );
  if (existingSummary) responseTexts.push(existingSummary.summary);
  const res = await getTextSummaryByAI(
    responseTexts,
    request,
    allowedTokens,
    usedTokens,
  );
  if (!res) throw new Error("Unable to get Summary");
  let updateData = null;
  if (type === ResponseSummaryType.All) {
    updateData = {
      ...responseSummary,
      all: {
        summary: res.summary,
        responseIds,
      },
    };
  } else if (type === ResponseSummaryType.Team) {
    let updatedTeamSummary = responseSummary?.team ?? [];
    if (existingSummary) {
      const teamSummaryIndex = updatedTeamSummary.findIndex(
        (t) => t.teamId === teamId,
      );
      updatedTeamSummary[teamSummaryIndex].summary = res.summary;
      updatedTeamSummary[teamSummaryIndex].responseIds = responseIds;
    } else {
      updatedTeamSummary.push({ teamId, responseIds, summary: res?.summary });
    }
    updateData = {
      ...responseSummary,
      team: updatedTeamSummary,
    };
  }
  if (updateData && res.tokenUsage) {
    const updatedSummary = [...aiResponseSummary];
    if (questionIndex === null) {
      updatedSummary.push({
        ...updateData,
        questionId,
      });
    } else {
      updatedSummary[questionIndex] = {
        ...updateData,
      };
    }
    await Promise.all([
      updateSummaryOnSurvey(surveyId, updatedSummary),
      prisma.usageStats.update({
        where: {
          orgId: request.user.orgId,
        },
        data: {
          aiPromptTokensCount: {
            increment: res.tokenUsage.promptTokens,
          },
          aiCompletionTokensCount: {
            increment: res.tokenUsage.completionTokens,
          },
        },
      }),
    ]);
  }
  return true;
}

export async function exportContactResponseToContacts(surveyId, orgId) {
  const allResponse = await getAllResponses(surveyId);
  const surveyTitle = allResponse[0].survey.title;
  const contactResponses = allResponse.map((r) => ({
    team: {
      id: r.team.id,
      name: r.team.name,
    },
    responses: r.responses.flatMap((res) =>
      res.responses.filter(
        (r) => (r as unknown as QuestionResponse).type === QuestionType.Contact,
      ),
    ),
  }));

  if (!contactResponses.length) return;

  await Promise.all(
    contactResponses.map(async (team) => {
      let groupName = `_${surveyTitle}_${team.team.name}`;
      const teamId = team.team.id;
      const contacts = team.responses
        .map(
          (res) =>
            (res as unknown as QuestionResponse).response[QuestionType.Contact],
        )
        .filter((c) => c.phone)
        .map((c) => ({
          ...c,
          phone: c.phone.slice(1),
          source: `survey_import: ${surveyTitle}`,
          email: undefined,
        }));
      if (!contacts.length) return;
      let contactGroup = await getContactGroupByNameAndTeam(groupName, teamId);
      if (!contactGroup)
        contactGroup = await createContactGroup({ name: groupName, teamId });
      await addNewContactsToGroup(contactGroup.id, contacts, orgId);
    }),
  );
}

export async function sendResponseToWebhook(responseObj) {
  const endpoint = responseObj.surveyTeamMap.survey.responseWebhookEndpoint;
  if (!endpoint) return;
  const questionMap = responseObj.surveyTeamMap.survey.questions.reduce(
    (map, { id, title, description, label }) => {
      map[id] =
        title[responseObj?.language] ||
        description[responseObj?.language] ||
        label[responseObj?.language];
      return map;
    },
    {},
  );
  const responses = responseObj.responses.map(
    ({ questionId, response = {}, type }) => ({
      type,
      response: response[type],
      title: questionMap[questionId],
    }),
  );
  const payload = {
    tag: responseObj?.tag,
    createdAt: responseObj.createdAt,
    phone: responseObj?.Contact?.phone,
    language: responseObj?.language,
    responses,
    teamId: responseObj.surveyTeamMap.team.id,
    surveyId: responseObj.surveyTeamMap.surveyId,
  };
  const orgId = responseObj.surveyTeamMap.team.orgId;
  await sendWebhook(endpoint, payload, orgId);
}

export function markdownToPlainText(markdown) {
  return markdown
    .replace(/[#_*~>]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/!\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/`{1,3}.*?`{1,3}/g, "");
}

const getCellData = (response, question) => {
  switch (question.metaType) {
    case WaQuestions.LD:
      return LDResponseMap[response] || "";
    case WaQuestions.YN:
      return YNResponseMap[response] || "";
    case WaQuestions.Smiley:
      return SmileyResponseMap[response] || "";
    case WaQuestions.Rating:
      return RatingScaleMap[response] || "";
    case WaQuestions.Opinion:
      return response || "";
    case WaQuestions.RadioButtonsGroup:
    case WaQuestions.Dropdown:
      return (
        question["data-source"]?.find((data) => data.id === response)?.title ||
        ""
      );
    case WaQuestions.CheckboxGroup:
    case WaQuestions.ChipsSelector:
      return (
        (Array.isArray(response) &&
          response
            ?.map(
              (i) =>
                question["data-source"]?.find((data) => data.id === i)?.title,
            )
            ?.join(",")) ||
        ""
      );
    case WaQuestions.DocumentPicker:
    case WaQuestions.PhotoPicker:
      return (
        response && `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${response}`
      );
    case WaQuestions.DatePicker:
      return response ? dayjs(response).format("DD-MM-YYYY") : "";
    default:
      return response.toString() || "";
  }
};

export async function getSurveyResponseCount(surveyId) {
  const teamWiseCount =
    (await prisma.$queryRaw`SELECT st.id,t.code as "teamCode", 
  COUNT(sr.id)::INTEGER
  FROM "SurveyTeamMap" st
  LEFT JOIN "SurveyResponse" sr ON st.id = sr."surveyTeamMapId" 
  LEFT JOIN "Team" t ON t.id = st."teamId"
  WHERE st."surveyId"=${surveyId}::uuid 
  GROUP BY st.id, t.code
  ;`) as { id: string; teamCode: string; count: number }[];

  return {
    all: teamWiseCount.reduce((total, teamMap) => (total += teamMap.count), 0),
    teamWiseCount,
  };
}

export async function getSurveyResponseBySurveyId(
  surveyId: string,
  teamIds: string[],
  filter: ResponseFilterQuery,
) {
  const {
    page,
    limit,
    surveyTeamMapIds,
    language,
    tag,
    contactIds,
    dateRange,
    campaignIds,
    mobile,
    desc = "true",
    ...rest
  } = filter;

  let pagination = {
    skip: 0,
    take: 1000,
  };
  if ((page === 0 || page) && limit) {
    pagination = {
      skip: page * Number(limit),
      take: Number(limit),
    };
  }
  let filterQuery = "";
  if (surveyTeamMapIds?.length) {
    const mapIds = surveyTeamMapIds
      ?.split(",")
      .map((c) => `'${c}'::uuid`)
      .join(",");
    filterQuery += ` AND st.id IN (${mapIds})`;
  }
  if (tag?.length) {
    filterQuery += ` AND sr."tags" LIKE '%LOWER(${tag})%'`;
  }
  if (language?.length) {
    filterQuery += ` AND sr."language" = '${language}'`;
  }

  if (contactIds?.length) {
    const contacts = contactIds
      .split(",")
      .map((c) => `'${c}'::uuid`)
      .join(",");
    filterQuery += ` AND sr."contactId" IN (${contacts})`;
  }

  if (campaignIds?.length) {
    const campaigns = campaignIds
      .split(",")
      .map((c) => `'${c}'::uuid`)
      .join(",");
    filterQuery += ` AND EXISTS (
      SELECT 1 FROM "CampaignParticipant" cp
      WHERE cp."campaignId" IN (${campaigns})
      AND cp."contactId" = sr."contactId"
    )`;
  }

  if (dateRange?.length) {
    const [startDate, endDate] = dateRange?.split(",");
    if (startDate)
      filterQuery += ` AND sr."createdAt" >= '${dayjs(startDate).startOf("day").toISOString()}'`;
    if (endDate)
      filterQuery += ` AND sr."createdAt" <= '${dayjs(endDate).endOf("day").toISOString()}'`;
  }

  if (mobile?.length) {
    filterQuery += ` AND c."phone" LIKE '%${mobile}%'`;
  }

  if (Object.keys(rest)?.length) {
    let query = [];
    Object.entries(rest).map(([questionId, search]) => {
      let escapedSearch = search.replace(/'/g, "''");
      const escapedQuestionId = questionId.replace(/'/g, "''");
      if (escapedSearch.includes(",")) {
        escapedSearch = escapedSearch
          .split(",")
          .map((i) => `'${i}'`)
          .join(",");
        query.push(`EXISTS (
        SELECT 1
        FROM jsonb_array_elements(to_jsonb(sr."responses")) AS responseobj
        WHERE
          responseobj->>'questionId' = '${escapedQuestionId}'
          AND (
            (s."type" = '${SurveyType.WaFlow}' AND responseobj->>'response' IN (${escapedSearch}))
            OR
            responseobj->'response'->>(responseobj->>'type') IN (${escapedSearch})
          )
      )`);
      } else {
        query.push(`EXISTS (
        SELECT 1
        FROM jsonb_array_elements(to_jsonb(sr."responses")) AS responseobj
        WHERE
          responseobj->>'questionId' = '${escapedQuestionId}'
          AND (
            (s."type" = '${SurveyType.WaFlow}' AND cast(responseobj->'response' AS text) LIKE '%${escapedSearch}%')
            OR
            responseobj->'response'->>(responseobj->>'type') LIKE '%${escapedSearch}%'
          )
      )`);
      }
    });
    filterQuery += ` AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(to_jsonb(sr."responses")) AS responseobj
        WHERE
          ${query.join(` AND `)}
      )`;
  }

  const responses =
    await prisma.$queryRaw`SELECT COUNT(*) OVER()::INTEGER , sr.id, sr."contactId", sr."language",
  sr."tag", sr."responses", sr."createdAt",sr."encryptedResponses",sr."platform", c."phone" FROM "SurveyResponse" sr
  LEFT JOIN "Contact" c on c.id = sr."contactId"
  LEFT JOIN "SurveyTeamMap" st on st.id = sr."surveyTeamMapId"
  LEFT JOIN "Survey" s ON s.id = st."surveyId"
  WHERE st."surveyId" = ${surveyId}::uuid AND st."teamId" = ANY(${teamIds}::uuid[]) 
  ${filterQuery?.length ? Prisma.raw(filterQuery) : Prisma.empty} 
  ORDER BY sr."createdAt" ${desc === "true" ? Prisma.sql`DESC` : Prisma.sql`ASC`} 
  LIMIT ${pagination.take} OFFSET ${pagination.skip}
  ;`;

  return { totalCount: responses[0]?.count ?? 0, responses };
}

export async function getResponseAnalyticsForGraph(
  surveyId,
  teamIds,
  teamMapIds = [],
  dateRange = "",
) {
  let where = {
    surveyTeamMap: {
      surveyId,
      teamId: {
        in: teamIds,
      },
    },
  };
  if (teamMapIds.length)
    where.surveyTeamMap["id"] = {
      in: teamMapIds,
    };
  if (dateRange?.length) {
    const [startDate, endDate] = dateRange?.split(",");
    where["createdAt"] = {
      gte: dayjs(startDate).startOf("day").toISOString(),
      lte: dayjs(endDate).endOf("day").toISOString(),
    };
  }

  // First, get the schema information without responses to reduce memory usage
  const surveyInfo = await prisma.surveyTeamMap.findFirst({
    where: {
      surveyId,
    },
    select: {
      survey: {
        select: {
          type: true,
          questions: true,
          WaFlow: {
            select: {
              version: true,
              json: true,
            },
          },
        },
      },
    },
  });

  if (!surveyInfo) return { nps: {}, choiceWise: {} };

  const isFlow = surveyInfo.survey.type === SurveyType.WaFlow;
  const version = !isFlow || surveyInfo.survey.WaFlow?.version === 1;
  const questions = version
    ? surveyInfo.survey.questions.filter((q) =>
        barGraphQuestions.includes(q.type),
      )
    : (surveyInfo.survey.WaFlow.json.screens.flatMap((screen) =>
        screen.layout.children.filter(
          (child) =>
            barGraphQuestions2.includes(
              (child as any).metaType as WaQuestions,
            ) && child.name,
        ),
      ) as unknown as Question2[]);

  const npsQuestionIds = version
    ? questions
        .filter(
          (q) =>
            npsQuestionTypes.includes(q.type as QuestionType) &&
            (q as any).enableNpsAnalytics,
        )
        .map((q) => (q as any).id)
    : questions
        .filter(
          (q) =>
            npsQuestionTypes2.includes((q as any).metaType as WaQuestions) &&
            (q as any).enableNpsAnalytics,
        )
        .map((q) => (q as any)?.id);
  const barGraphQuestionIds = questions.map((q) => q.id);

  // Initialize result object
  const result = {
    nps: {},
    choiceWise: {},
  };

  // Set up counters for each question
  const counters = {};
  barGraphQuestionIds.forEach((qId) => {
    const question = questions.find((q) => (q as any).id === qId);
    if (!question) return;

    counters[qId] = {
      promoters: 0,
      detractors: 0,
      passives: 0,
      csat: 0,
      total: 0,
      choiceWise: initializeChoiceCounter(question, version),
    };
  });

  // Process responses in batches to avoid memory issues
  const BATCH_SIZE = 1000;
  let skip = 0;
  let hasMoreResponses = true;

  while (hasMoreResponses) {
    const responseBatch = await prisma.surveyResponse.findMany({
      where,
      select: {
        responses: true,
        language: true,
      },
      take: BATCH_SIZE,
      skip: skip,
    });

    if (responseBatch.length === 0) {
      hasMoreResponses = false;
      continue;
    }

    // Process this batch of responses
    for (const response of responseBatch) {
      for (const r of response.responses) {
        const questionId = r.questionId;
        if (!barGraphQuestionIds.includes(questionId) || !counters[questionId])
          continue;

        const question = questions.find((q) => (q as any).id === questionId);
        if (!question) continue;

        processResponse(
          r,
          response.language,
          question,
          counters[questionId],
          version,
          npsQuestionIds.includes(questionId),
        );
      }
    }

    skip += BATCH_SIZE;
  }

  // Finalize the results
  barGraphQuestionIds.forEach((qId) => {
    if (!counters[qId]) return;

    const counter = counters[qId];
    const question = questions.find((q) => (q as any).id === qId);

    if (npsQuestionIds.includes(qId)) {
      const total = counter.promoters + counter.passives + counter.detractors;
      const nps = total
        ? ((counter.promoters - counter.detractors) / total) * 100
        : null;
      const csatScore = counter.total
        ? Math.round((counter.csat / counter.total) * 100)
        : 0;

      result.nps[qId] = {
        csatScore,
        npsData: {
          npsScore: nps,
          passives: counter.passives,
          detractors: counter.detractors,
          promoters: counter.promoters,
          total,
        },
        responseCount: counter.total,
      };
    }

    if (barGraphQuestionIds.includes(qId)) {
      result.choiceWise[qId] = finalizeChoiceWiseData(
        counter.choiceWise,
        question,
        version,
      );
      result.choiceWise[qId].responseCount = counter.total;
    }
  });

  return result;
}

// Helper functions
function initializeChoiceCounter(question, version) {
  if (version) {
    const type = question.type;
    if (type === QuestionType.MCQGrid) {
      const subQuestions =
        (
          Object.values(question.features ?? [])?.[0] as {
            questions?: string[];
          }
        )?.questions || [];
      const choices = question.choices
        ? (Object.values(question.choices ?? [])[0] as any[])?.map((c) =>
            typeof c.value === "object" ? c.value.title : c.value,
          )
        : getChoicesForNpsQuestions(type);

      return subQuestions.reduce((acc, subQ, idx) => {
        acc[idx] = {
          [subQ]: new Map(
            choices.map((choice, index) => [
              index,
              {
                count: 0,
                choice,
              },
            ]),
          ),
        };
        return acc;
      }, {});
    } else {
      const choices = question.choices
        ? (Object.values(question.choices)[0] as any[])?.map((c) =>
            typeof c.value === "object" ? c.value.title : c.value,
          )
        : getChoicesForNpsQuestions(question.type);

      return new Map(
        choices.map((choice, index) => [
          index,
          {
            count: 0,
            choice,
          },
        ]),
      );
    }
  } else {
    const choices = question["data-source"];
    return new Map(
      choices.map((choice) => [
        choice.id,
        {
          count: 0,
          choice: choice.title,
        },
      ]),
    );
  }
}

function processResponse(
  r,
  language,
  question,
  counter,
  version,
  isNpsQuestion,
) {
  const questionId = r.questionId;
  const type = version ? r.type : question.metaType;
  const value = r.response[r.type] || r.response;

  counter.total++;

  // Process NPS responses
  if (isNpsQuestion) {
    if (version) {
      switch (type) {
        case QuestionType.Rating:
          if (value >= 4) {
            counter.promoters++;
            counter.csat++;
          } else if (value == 3) counter.passives++;
          else counter.detractors++;
          break;
        case QuestionType.Opinion:
          if (value >= 9) {
            counter.promoters++;
            counter.csat++;
          } else if (value >= 7) counter.passives++;
          else counter.detractors++;
          break;
        case QuestionType.Smiley:
          if (
            [SmileyResponse.VeryHappy, SmileyResponse.Happy].includes(value)
          ) {
            counter.promoters++;
            counter.csat++;
          } else if (value === SmileyResponse.Neutral) counter.passives++;
          else counter.detractors++;
          break;
        case QuestionType.LD:
          if (value === LDResponse.Like) {
            counter.promoters++;
            counter.csat++;
          } else counter.detractors++;
          break;
        case QuestionType.YN:
          if (value === YNResponse.Yes) {
            counter.promoters++;
            counter.csat++;
          } else counter.detractors++;
          break;
        case QuestionType.CustomNPS:
          if (value?.weightage == NPSWeightage.PROMOTER) {
            counter.csat++;
            counter.promoters++;
          }
          if (value?.weightage == NPSWeightage.PASSIVE) counter.passives++;
          if (value?.weightage == NPSWeightage.DETRACTOR) counter.detractors++;
          break;
      }
    } else {
      switch (type) {
        case WaQuestions.Rating:
          if (Number(value) >= 4) {
            counter.promoters++;
            counter.csat++;
          } else if (Number(value) == 3) counter.passives++;
          else counter.detractors++;
          break;
        case WaQuestions.Opinion:
          if (Number(value) >= 9) {
            counter.promoters++;
            counter.csat++;
          } else if (Number(value) >= 7) counter.passives++;
          else counter.detractors++;
          break;
        case WaQuestions.Smiley:
          if (["4", "5"].includes(value)) {
            counter.promoters++;
            counter.csat++;
          } else if (value === "3") counter.passives++;
          else counter.detractors++;
          break;
        case WaQuestions.LD:
          if (value === "1") {
            counter.promoters++;
            counter.csat++;
          } else counter.detractors++;
          break;
        case WaQuestions.YN:
          if (value === "1") {
            counter.promoters++;
            counter.csat++;
          } else counter.detractors++;
          break;
      }
    }
  }

  // Count choice-wise selections
  if (version) {
    if (type !== QuestionType.MCQGrid) {
      const resp = Array.isArray(value)
        ? value.map((v) => v.value)
        : typeof value === "object"
          ? [value.value]
          : [value];

      resp.forEach((res) => {
        if (!res) return;
        const choiceIndex = getChoiceIndex(
          question,
          language,
          res.toString(),
          type,
        );
        if (choiceIndex !== -1 && counter.choiceWise.has(choiceIndex)) {
          const mapValue = counter.choiceWise.get(choiceIndex);
          counter.choiceWise.set(choiceIndex, {
            ...mapValue,
            count: mapValue.count + 1,
          });
        }
      });
    } else {
      const subQuestions =
        (
          Object.values(question.features ?? [])?.[0] as {
            questions?: string[];
          }
        )?.questions || [];
      subQuestions.forEach((subQ, index) => {
        if (!value || !value[subQ]) return;
        const resp = value[subQ].value;
        if (!resp) return;

        const choiceIndex = getChoiceIndex(question, language, resp, type);
        if (
          choiceIndex !== -1 &&
          counter.choiceWise[index]?.[subQ]?.has(choiceIndex)
        ) {
          const mapValue = counter.choiceWise[index][subQ].get(choiceIndex);
          counter.choiceWise[index][subQ].set(choiceIndex, {
            ...mapValue,
            count: mapValue.count + 1,
          });
        }
      });
    }
  } else {
    const resp = Array.isArray(value) ? value : [value];
    resp.forEach((res) => {
      if (!res || !counter.choiceWise.has(res)) return;

      const mapValue = counter.choiceWise.get(res);
      counter.choiceWise.set(res, {
        ...mapValue,
        count: mapValue.count + 1,
      });
    });
  }
}

function getChoiceIndex(question, language, resp, type) {
  const choices = question.choices
    ? question.choices[language]?.map((c) =>
        typeof c.value === "object" ? c.value.title : c.value,
      )
    : getChoicesForNpsQuestions(type);

  return choices?.findIndex((c) => c === resp) ?? -1;
}

function finalizeChoiceWiseData(choiceWise, question, version) {
  if (version && question.type === QuestionType.MCQGrid) {
    const subData = Object.keys(choiceWise).reduce((acc, idx) => {
      const obj = choiceWise[idx];
      const key = Object.keys(obj)[0];
      acc[key] = Array.from(obj[key].values());
      return acc;
    }, {});

    return {
      data: [],
      subData,
    };
  } else {
    return {
      data: Array.from(choiceWise.values()),
      subData: undefined,
    };
  }
}

function getChoicesForNpsQuestions(type) {
  let choices = [];
  switch (type) {
    case QuestionType.YN:
      choices = Object.values(YNResponse);
      break;
    case QuestionType.LD:
      choices = Object.values(LDResponse);
      break;
    case QuestionType.Opinion:
      choices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => i.toString());
      break;
    case QuestionType.Rating:
      choices = [1, 2, 3, 4, 5].map((i) => i.toString());
      break;
    case QuestionType.Smiley:
      choices = Object.values(SmileyResponse);
      break;
  }
  return choices;
}

export async function getResponseCountForCamparison(surveyId, teamIds) {
  const teamRes = await prisma.surveyTeamMap.findMany({
    where: {
      surveyId,
      teamId: {
        in: teamIds,
      },
    },
    select: {
      id: true,
      team: {
        select: {
          code: true,
        },
      },
      survey: {
        select: {
          WaFlow: {
            select: {
              json: true,
              version: true,
            },
          },
          questions: true,
        },
      },
    },
  });
  const version1 =
    !teamRes[0].survey.WaFlow || teamRes[0].survey.WaFlow.version === 1;
  const questions = version1
    ? teamRes[0].survey.questions.filter((q) =>
        npsQuestionTypes.includes(q.type),
      )
    : teamRes[0].survey.WaFlow.json.screens.flatMap((screen) =>
        screen.layout.children.filter(
          (child) =>
            npsQuestionTypes2.includes(
              (child as any).metaType as WaQuestions,
            ) && child.name,
        ),
      );

  const data = questions.map((q) => ({
    questionId: q.id,
    type: version1 ? q.type : q.metaType,
    responseObj: getResponseObjectByQuestionType(
      version1 ? q.type : QuestionType2[q.metaType],
      version1,
    ),
    data: [],
  }));
  for (const t of teamRes) {
    const batchSize = 1000;
    let skip = 0;
    let hasMoreResponses = true;
    while (hasMoreResponses) {
      const responses = await prisma.surveyResponse.findMany({
        where: {
          surveyTeamMapId: t.id,
        },
        select: {
          responses: true,
        },
        take: batchSize,
        skip,
      });
      if (responses.length === 0) {
        hasMoreResponses = false;
        continue;
      }
      const formattedResponse = responses.flatMap((r) => r.responses);
      formattedResponse.forEach((r) => {
        let questionIndex = -1;
        const q = data.find((d, index) => {
          if (d.questionId === r.questionId) {
            questionIndex = index;
            return d;
          }
        });
        if (questionIndex === -1) return;
        const resp = version1 ? r.response[r.type] : r.response;
        let currentResponseObj = { ...data[questionIndex].responseObj };
        if (q.type === QuestionType.CustomNPS)
          currentResponseObj[resp.weightage] =
            currentResponseObj[resp.weightage] + 1;
        else
          currentResponseObj[resp.toString()] =
            currentResponseObj[resp.toString()] + 1;
        data[questionIndex].responseObj = currentResponseObj;
      });
      skip += batchSize;
    }
    data.forEach((d) => {
      const resObj = version1
        ? { ...d.responseObj }
        : getFlowVersion2MappedObj(d.responseObj, d.type);
      d.data = [...d.data, { teamCode: t.team.code, mapId: t.id, ...resObj }];
      d.responseObj = getResponseObjectByQuestionType(d.type, version1);
    });
  }
  return data.map((d) => ({ questionId: d.questionId, data: d.data }));
}

function getFlowVersion2MappedObj(responseObj, type) {
  switch (type) {
    case WaQuestions.LD:
      return {
        [LDResponse.Like]: responseObj["1"],
        [LDResponse.Dislike]: responseObj["2"],
      };
    case WaQuestions.Smiley:
      return {
        [SmileyResponse.VerySad]: responseObj["1"],
        [SmileyResponse.Sad]: responseObj["2"],
        [SmileyResponse.Neutral]: responseObj["3"],
        [SmileyResponse.Happy]: responseObj["4"],
        [SmileyResponse.VeryHappy]: responseObj["5"],
      };
    case WaQuestions.YN:
      return {
        [YNResponse.Yes]: responseObj["1"],
        [YNResponse.No]: responseObj["2"],
      };
    default:
      return responseObj;
  }
}
export function getResponseObjectByQuestionType(questionType, version) {
  switch (questionType) {
    case QuestionType.Rating: {
      return {
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
      };
    }
    case QuestionType.Opinion: {
      return {
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": 0,
        "10": 0,
      };
    }
    case QuestionType.Smiley: {
      return version
        ? {
            [SmileyResponse.VeryHappy]: 0,
            [SmileyResponse.Happy]: 0,
            [SmileyResponse.Neutral]: 0,
            [SmileyResponse.Sad]: 0,
            [SmileyResponse.VerySad]: 0,
          }
        : {
            "1": 0,
            "2": 0,
            "3": 0,
            "4": 0,
            "5": 0,
          };
    }

    case QuestionType.YN: {
      return version
        ? {
            [YNResponse.Yes]: 0,
            [YNResponse.No]: 0,
          }
        : {
            "1": 0,
            "2": 0,
          };
    }
    case QuestionType.LD: {
      return version
        ? {
            [LDResponse.Like]: 0,
            [LDResponse.Dislike]: 0,
          }
        : {
            "1": 0,
            "2": 0,
          };
    }
    case QuestionType.CustomNPS: {
      return {
        [NPSWeightage.PROMOTER]: 0,
        [NPSWeightage.PASSIVE]: 0,
        [NPSWeightage.DETRACTOR]: 0,
      };
    }
    default: {
      return null;
    }
  }
}

export async function happyIndexResponsesBySurveyId(
  surveyId: string,
  teamMapIds,
  teamIds,
) {
  const where = {
    surveyTeamMap: {
      surveyId,
      teamId: { in: teamIds },
      ...(teamMapIds?.length && { id: { in: teamMapIds } }),
    },
  };

  const surveyInfo = await prisma.surveyTeamMap.findFirst({
    where: { surveyId },
    select: {
      survey: {
        select: {
          type: true,
          questions: true,
          WaFlow: {
            select: {
              version: true,
              json: true,
            },
          },
        },
      },
    },
  });

  if (!surveyInfo) return {};
  const responses = await prisma.surveyResponse.findMany({
    where,
    select: {
      responses: true,
      createdAt: true,
    },
  });
  if (responses.length === 0) return {};
  let scoreSum = 0;
  const maxScore = 10;
  let promoters = 0,
    detractors = 0,
    passives = 0,
    npsCount = 0;
  let totalCount = 0,
    veryHappy = 0,
    happy = 0,
    neutral = 0,
    sad = 0,
    verySad = 0;

  responses.forEach((resp) => {
    resp.responses.forEach((r) => {
      let score = null;

      if (r.type === QuestionType.Opinion) {
        const val = r.response[QuestionType.Opinion];
        if (typeof val === "number") score = val;
      }

      if (r.type === QuestionType.Rating) {
        const val = r.response[QuestionType.Rating];
        if (val === 5) score = 10;
        else if (val === 4) score = 9;
        else if (val === 3) score = 6;
        else if (val === 2) score = 5;
        else score = 0;
      }

      if (r.type === QuestionType.Smiley) {
        const val = r.response[QuestionType.Smiley];
        const smileyMap = {
          "Very Sad": 0,
          Sad: 2,
          Neutral: 5,
          Happy: 8,
          "Very Happy": 10,
        };
        score = smileyMap[val] ?? null;
      }

      if (r.type === QuestionType.LD) {
        const val = r.response[QuestionType.LD];
        if (val === "Like") score = 10;
        else if (val === "Dislike") score = 0;
      }

      if (r.type === QuestionType.YN) {
        const val = r.response[QuestionType.YN];
        if (val === "Yes") score = 10;
        else if (val === "No") score = 0;
      }

      if (score !== null) {
        if (score >= 9) {
          promoters++;
        } else if (score >= 6) {
          passives++;
        } else {
          detractors++;
        }

        if (score >= 9) veryHappy++;
        else if (score >= 7) happy++;
        else if (score >= 5) neutral++;
        else if (score >= 2) sad++;
        else verySad++;

        npsCount++;
        scoreSum += score;
        totalCount++;
      }
    });
  });

  const nps = npsCount > 0 ? ((promoters - detractors) / npsCount) * 100 : null;
  const promoterPercentage =
    npsCount > 0 ? Math.round((promoters / npsCount) * 100) : null;
  const passivePercentage =
    npsCount > 0 ? Math.round((passives / npsCount) * 100) : null;
  const detractorPercentage =
    npsCount > 0 ? Math.round((detractors / npsCount) * 100) : null;
  const happinessIndex =
    totalCount > 0
      ? Math.round((scoreSum / (totalCount * maxScore)) * 100)
      : null;
  const veryHappyPercentage =
    totalCount > 0 ? +((veryHappy / totalCount) * 100).toFixed(2) : null;
  const happyPercentage =
    totalCount > 0 ? +((happy / totalCount) * 100).toFixed(2) : null;
  const neutralPercentage =
    totalCount > 0 ? +((neutral / totalCount) * 100).toFixed(2) : null;
  const sadPercentage =
    totalCount > 0 ? +((sad / totalCount) * 100).toFixed(2) : null;
  const verySadPercentage =
    totalCount > 0 ? +((verySad / totalCount) * 100).toFixed(2) : null;

  return {
    promoters,
    passives,
    detractors,
    veryHappy,
    happy,
    neutral,
    sad,
    verySad,
    nps: nps !== null ? Math.round(nps) : null,
    totalCount,
    promoterPercentage,
    passivePercentage,
    detractorPercentage,
    veryHappyPercentage,
    happyPercentage,
    neutralPercentage,
    sadPercentage,
    verySadPercentage,
    happinessIndex,
  };
}
