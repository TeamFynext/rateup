import { generateAnswerHtml } from "../../utils/email/emailTemplateGenerateFunction.js";
import { createEmailBodySurveyResponse } from "../../utils/email/supertoken/surveyResponseEmail.js";
import prisma from "../../utils/prisma.js";
import {
  generateResponseData,
  getContent,
  getReplacedTitleFromVariable,
} from "../../utils/survey/response.data.js";
import { CreateResponseInput, GenerateBodyInput, ResponseFilterQuery } from "./response.schema.js";
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
  WaFlowFormElementType,
  YNResponse,
} from "../../types/enums.js";
import dayjs from "dayjs";
import { saveSheetIdToSurvey } from "../survey/survey.service.js";
import { google } from "googleapis";
import { write, type CellValue } from "hucre";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { updateMonthlyStat } from "../stats/stats.service.js";
import { hasFeature } from "../subscription/subscription.service.js";
import { log } from "../../utils/logger.js";
import { FastifyRequest } from "fastify";
import { getTextSummaryByAI } from "../chatbot/chatbot.service.js";
import {
  getIntegrationByName,
  initializeAuthClient,
  updateIntegrationByName,
} from "../integrations/integrations.service.js";
import {
  addNewContactsToGroup,
  createContactGroup,
  getContactGroupByNameAndTeam,
} from "../contact/contactGroup/contactGroup.service.js";
import { sendWebhook } from "../../utils/webhook.js";
import { getFileUrlFromKey } from "../../utils/upload/s3Upload.js";
import {
  barGraphQuestions,
  barGraphQuestions2,
  LDResponseMap,
  npsQuestionTypes,
  npsQuestionTypes2,
  RatingScaleMap,
  SmileyResponseMap,
  YNResponseMap,
} from "../../utils/enumMap.js";
import { getFlowBySurveyId } from "../whatsapp/flows/flow.service.js";
import { autoGenerateTicket } from "../ticket/ticketCard/card.service.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { notificationQueue } from "../../utils/redisConnection.js";
import { ContactGroupType } from "../contact/contactGroup/contactGroup.schema.js";

/**
 * One row handed to google-spreadsheet's addRow/addRows, keyed by column header.
 * The library writes each value into a cell, so only cell-shaped scalars belong here.
 */
type SheetRow = Record<string, string | number | boolean | Date>;

dayjs.extend(utc);
dayjs.extend(timezone);

// QuestionResponse["response"] only declares keys for QuestionTypes that store an answer
// under their own type (some, like PCQ/MCQGrid, don't), so this is a dynamic lookup.
function getAnswerValue(response: QuestionResponse["response"], type: QuestionType): unknown {
  return (response as Record<string, unknown>)[type];
}

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

  // An EXPLICIT list scopes, even when it is empty — `teamIds.length > 0` used to
  // drop the team condition for an empty array, so a caller who belongs to no
  // team, or who named only map ids that resolve to none of their teams, got
  // every team's responses for the survey. `undefined` still means unscoped,
  // which is what the two internal callers in this file pass.
  // See issues.txt 37.1.
  let whereCondtion = teamIds
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
        contactIds && contactIds.length > 0
          ? responses
              .filter((data) => data.contactId != null && contactIds.includes(data.contactId))
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
interface ResponseBySurveyRawRow {
  id: string;
  createdAt: Date;
  responses: QuestionResponse[];
  language: string;
  tag: string | null;
  surveyTeamMapId: string;
  teamId: string;
  questions: Question[];
  phone: string | null;
}

export const getResponseBySurveyById = async (id: string) => {
  const responses = await prisma.$queryRaw<ResponseBySurveyRawRow[]>`
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
      const questionMap = questions.reduce<Record<string, string | undefined>>(
        (map, { id, title, description, label }) => {
          map[id] =
            Object.values(title)?.[0] ||
            Object.values(description)?.[0] ||
            Object.values(label ?? {})?.[0];
          return map;
        },
        {},
      );
      // Map over each response to replace questionId with the corresponding title
      const updatedResponses = responses.map(({ questionId, response = {}, ...rest }) => ({
        ...rest,
        response: Object.values(response)?.[0],
        title: questionMap[questionId],
      }));

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
  surveyId: string,
  allResponses: Awaited<ReturnType<typeof getAllResponses>>,
  questions: Question[],
  defaultLanguage: string,
  visibleColumn: string[] = [],
  tz = "Asia/Calcutta",
  format: "xlsx" | "ods" = "xlsx",
) {
  const responses = allResponses?.flatMap((data) => data?.responses) || [];

  const platform = responses?.[0]?.platform;
  const filteredSecondArray = questions.filter((item) => {
    let qsTitle =
      item?.title[defaultLanguage] ||
      item?.description[defaultLanguage] ||
      item?.label?.[defaultLanguage] ||
      "";
    return (
      getReplacedTitleFromVariable({
        title: qsTitle,
      }) || getContent(qsTitle)
    );
    // return visibleColumn.includes(
    //   getReplacedTitleFromVariable({
    //     title: qsTitle,
    //   }) || getContent(qsTitle),
    // );
  });

  if (filteredSecondArray && responses) {
    const headerArray = filteredSecondArray.flatMap((question) => {
      const qsTitle =
        question?.title[defaultLanguage] ||
        question?.description[defaultLanguage] ||
        question?.label?.[defaultLanguage] ||
        "";
      let columnLabels: string[];

      if (question.type === QuestionType.Contact) {
        columnLabels = Object.entries(question.features?.[defaultLanguage] ?? {})
          .filter(([, value]) => (value as QuestionFeatureToggle | undefined)?.isEnabled)
          .map(([key]) => `${getContent(qsTitle)}: ${key}`);
      } else if (question.type === QuestionType.MCQGrid) {
        columnLabels =
          question.features?.[defaultLanguage]?.questions?.map(
            (q: string) => `${getContent(qsTitle)}: ${q}`,
          ) ?? [];
      } else if (question.type === QuestionType.MultiTextInput) {
        columnLabels =
          question.features?.[defaultLanguage]?.fields?.map(
            (field: { fieldKey?: string }) =>
              `${getContent(question.title[defaultLanguage])}: ${field?.fieldKey}`,
          ) ?? [];
      } else if (question.type === QuestionType.Testimonial) {
        columnLabels = [
          `${getContent(question.title[defaultLanguage])}: name`,
          `${getContent(question.title[defaultLanguage])}: testimonial`,
          ...Object.entries(question?.features?.[defaultLanguage] ?? {})
            .filter(([, value]) => Boolean(value))
            .map(([key]) => `${getContent(question.title[defaultLanguage])}: ${key}`),
        ];
      } else {
        columnLabels = [getContent(qsTitle)];
      }

      return columnLabels;
    });

    const createdAt = "Date";
    const responseTag = "Tags";
    let whatsappRespondentNumber = "Respondent's Mobile Number";
    const teamNameColumn = "Team Name";
    // `columnEntries` mixes real questions with virtual string columns (Date, Team Name, etc.)
    const columnEntries: (Question | string)[] = [...filteredSecondArray];
    if (visibleColumn.includes("Created At")) {
      headerArray.unshift(createdAt);
      columnEntries.unshift(createdAt);
    }
    // Add team name column before tags
    headerArray.push(teamNameColumn);
    columnEntries.push(teamNameColumn);

    if (platform === "WHATSAPP" && visibleColumn.includes(whatsappRespondentNumber)) {
      headerArray.push(whatsappRespondentNumber);
      columnEntries.push(whatsappRespondentNumber);
    }
    if (visibleColumn.includes(responseTag)) {
      headerArray.push(responseTag);
      columnEntries.push(responseTag);
    }

    const bodyArray: CellValue[][] = [];
    columnEntries.forEach((question) => {
      const questionId = typeof question === "string" ? undefined : question.id;
      let tempArray: unknown[] = [];
      responses.forEach((response, answerIndex) => {
        bodyArray.push([]);

        const responsesArr = response.responses;
        const responseObj = responsesArr.find((answerObj) => answerObj.questionId === questionId);
        // Cell value shape varies per QuestionType (string, number, object, array); the
        // switch/typeof checks below already do the real runtime type discrimination.
        let responseValue: unknown;
        let flag = true;
        if (responseObj && typeof question !== "string") {
          // QuestionResponse["response"] only declares keys for types that store an answer;
          // some QuestionTypes (PCQ, MCQGrid, etc.) aren't listed, so this is a dynamic lookup.
          responseValue = (responseObj.response as Record<string, unknown>)[question.type];
          const responseType = responseObj.type;
          switch (responseType) {
            case QuestionType.Photo:
            case QuestionType.File: {
              responseValue = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${responseValue}`;
              break;
            }
            case QuestionType.Date: {
              responseValue = dayjs(responseValue as string | number | Date)
                .tz(tz)
                .format("DD-MM-YYYY hh:mm A");
              break;
            }
            case QuestionType.PCQ: {
              responseValue = answerField(answerField(responseValue, "value"), "value");
              break;
            }
            case QuestionType.TnC: {
              responseValue = responseValue?.toString();
              break;
            }
            case QuestionType.PhotoPicker:
            case QuestionType.DocumentPicker: {
              responseValue = getFileUrlFromKey(toCell(responseValue));
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
              Object.entries(question.features?.[defaultLanguage] || {}).forEach(
                ([key, feature]) => {
                  if ((feature as { isEnabled?: boolean })?.isEnabled) {
                    bodyArray[answerIndex].push(toCell(answerField(responseValue, key)));
                  }
                },
              );
            } else if (typeof responseValue === "string" || typeof responseValue === "number") {
              // If responseValue is a single value, push it
              bodyArray[answerIndex].push(String(responseValue));
            } else {
              bodyArray[answerIndex].push("");
            }
            flag = false;
          } else if (
            QuestionType.MCQGrid === responseType &&
            !tempArray.includes({ [answerIndex]: questionId })
          ) {
            tempArray.push({ [answerIndex]: questionId });
            question?.features?.[defaultLanguage]?.questions?.map((q: string) =>
              answerField(responseValue, q)
                ? bodyArray[answerIndex].push(
                    toCell(answerField(answerField(responseValue, q), "value")),
                  )
                : bodyArray[answerIndex].push(""),
            );
            flag = false;
          } else if (
            QuestionType.MultiTextInput === responseType &&
            !tempArray.includes({ [answerIndex]: questionId })
          ) {
            tempArray.push({ [answerIndex]: questionId });
            question?.features?.[defaultLanguage]?.fields?.map((field: { fieldKey?: string }) =>
              answerField(responseValue, field?.fieldKey ?? "")
                ? bodyArray[answerIndex].push(
                    toCell(answerField(responseValue, field?.fieldKey ?? "")),
                  )
                : bodyArray[answerIndex].push(""),
            );
            flag = false;
          } else if (
            QuestionType.Testimonial === responseType &&
            !tempArray.includes({ [answerIndex]: questionId })
          ) {
            tempArray.push({ [answerIndex]: questionId });
            bodyArray[answerIndex].push(toCell(answerField(responseValue, "name")));
            bodyArray[answerIndex].push(toCell(answerField(responseValue, "testimonial")));
            if (question?.features?.[defaultLanguage]) {
              Object.entries(question?.features?.[defaultLanguage])
                .filter(([_key, value]) => value)
                .forEach(([key, _value]) => {
                  const subAnswer = answerField(responseValue, key);
                  if (subAnswer) {
                    bodyArray[answerIndex].push(
                      key === "photo"
                        ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${toCell(subAnswer)}`
                        : toCell(subAnswer),
                    );
                  } else {
                    bodyArray[answerIndex].push("");
                  }
                });
            }
            flag = false;
          } else if (!tempArray.includes({ [answerIndex]: questionId })) {
            if (ChoiceTypeQuestions.includes(responseType)) {
              responseValue = Array.isArray(responseValue)
                ? responseValue
                    ?.map(
                      (res) =>
                        answerField(res, "value") ||
                        `${question?.features?.[defaultLanguage]?.other?.title}:${toCell(answerField(res, "other"))}`,
                    )
                    .join(", ")
                : responseType == QuestionType.MCQ
                  ? answerField(responseValue, "value") ||
                    `${question?.features?.[defaultLanguage]?.other?.title}:${toCell(answerField(responseValue, "other"))}`
                  : answerField(responseValue, "value");
            } else if (typeof responseValue === "object") {
              const nested = answerField(responseValue, "value");
              responseValue = nested ? toCell(nested) : toCell(responseValue);
            }
          }
        } else if (question === createdAt) {
          const createdAtFormatted = dayjs(response.createdAt).tz(tz).format("DD-MM-YYYY hh:mm A");
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
                columnEntries.pop();
              }
              headerArray.push(tagColumnName);
              columnEntries.push(tagColumnName);
            }
            bodyArray[answerIndex].push(tag.trim());
          });
        } else if (typeof question !== "string") {
          if (question.type === QuestionType.MCQGrid) {
            question?.features?.[defaultLanguage]?.questions?.map((_q: string) =>
              bodyArray[answerIndex].push(""),
            );
            flag = false;
          } else if (question.type === QuestionType.Contact) {
            Object.entries(question.features?.[defaultLanguage] || {}).forEach(
              ([_key, feature]) => {
                if ((feature as QuestionFeatureToggle | undefined)?.isEnabled)
                  bodyArray[answerIndex].push("");
              },
            );
            flag = false;
          } else if (question.type === QuestionType.Testimonial) {
            bodyArray[answerIndex].push("", "");
            const features = question.features?.[defaultLanguage];
            if (features) {
              Object.values(features ?? {}).forEach((key) => {
                if (key) bodyArray[answerIndex].push("");
              });
              flag = false;
            }
          } else if (question.type === QuestionType.MultiTextInput) {
            question?.features?.[defaultLanguage]?.fields?.forEach((_field: unknown) =>
              bodyArray[answerIndex].push(""),
            );
            flag = false;
          }
          responseValue = "";
        }
        if (flag) {
          bodyArray[answerIndex].push(toCell(responseValue));
        }
      });
    });
    const columns = headerArray.map((header, i) => ({
      header,
      key: `col${i}`,
      autoWidth: true,
    }));
    const data = bodyArray.map((row) =>
      Object.fromEntries(row.map((value, i) => [`col${i}`, value])),
    );

    const buffer = await write({
      sheets: [
        {
          name: "Sheet1",
          columns,
          data,
        },
      ],
      format,
    });

    return buffer;
  }
}

type V2ExcelQuestion = Partial<WaFlowFormElement> & { header?: string; metaType?: WaQuestions };

export async function downloadExcelResponseV2(
  allResponses: Awaited<ReturnType<typeof getAllResponses>>,
  questions: V2ExcelQuestion[],
  visibleColumn: string[] = [],
  tz = "Asia/Calcutta",
  format: "xlsx" | "ods" = "xlsx",
) {
  const responses = allResponses?.flatMap((data) => data?.responses) || [];

  const filteredQuestions = questions;
  // .filter((item) =>
  //   visibleColumn.includes(item?.label || ""),
  // );

  if (filteredQuestions && responses.length) {
    const headerArray = filteredQuestions.map((question) =>
      markdownToPlainText(question?.header || question?.label || ""),
    );

    const createdAt = "Date";
    const responseTag = "Tags";
    const whatsappRespondentNumber = "Respondent Mobile";

    if (visibleColumn.includes("Created At")) {
      headerArray.unshift(createdAt);
      filteredQuestions.unshift({ label: createdAt });
    }

    if (visibleColumn.includes(whatsappRespondentNumber)) {
      headerArray.push(whatsappRespondentNumber);
      filteredQuestions.push({ label: whatsappRespondentNumber });
    }

    // Split tags into multiple columns if necessary
    const tagColumns: string[] = [];
    if (visibleColumn.includes(responseTag)) {
      const maxTags = Math.max(
        ...responses.map((response) => (response.tag || "").split(",").filter(Boolean).length),
      );
      for (let i = 0; i < maxTags; i++) {
        const tagColumnName = `Tag ${i + 1}`;
        headerArray.push(tagColumnName);
        tagColumns.push(tagColumnName);
        filteredQuestions.push({ label: tagColumnName });
      }
    }

    const bodyArray = responses.map((response) => {
      const row: CellValue[] = [];

      filteredQuestions.forEach((question) => {
        const questionId = question.id;
        const responseObj = response.responses?.find(
          (answerObj) => answerObj.questionId === questionId,
        );
        let responseValue;

        if (responseObj) {
          responseValue = getCellData(responseObj.response, question);
        } else if (question.label === createdAt) {
          responseValue = dayjs(response.createdAt).tz(tz).format("DD-MM-YYYY hh:mm A");
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

    const columns = headerArray.map((header, i) => ({
      header,
      key: `col${i}`,
      autoWidth: true,
    }));
    const data = bodyArray.map((row) =>
      Object.fromEntries(row.map((value, i) => [`col${i}`, value])),
    );

    const buffer = await write({
      sheets: [
        {
          name: "Sheet1",
          columns,
          data,
        },
      ],
      format,
    });
    return buffer;
  }
}

export async function resetResponsesStats(surveyId: string) {
  const maps = await prisma.surveyTeamMap.findMany({
    where: { surveyId },
    select: { id: true },
  });

  const mapIds = maps.map((m) => m.id);

  const deleteResponses = await prisma.surveyResponse.deleteMany({
    where: {
      surveyTeamMapId: { in: mapIds },
    },
  });

  await prisma.surveyStats.deleteMany({
    where: {
      surveyTeamMapId: { in: mapIds },
    },
  });

  return `Deleted ${deleteResponses.count} responses for surveyId: ${surveyId}`;
}

/**
 * The route is `DELETE /:surveyTeamMapId/delete/:id`, and verifyAccess checks the
 * MAP. Nothing compared the response to it, so a caller supplied a map id they
 * legitimately held and a response id belonging to any survey on the platform:
 * the check passed on the first, the delete acted on the second. Both ids have
 * to agree now, and a mismatch is P2025 rather than a silent cross-tenant
 * deletion. See issues.txt 37.2.
 */
export async function deleteResponse(id: string, surveyTeamMapId: string) {
  const deleteResponse = await prisma.surveyResponse.delete({
    where: {
      id,
      surveyTeamMapId,
    },
  });

  return deleteResponse;
}

export async function createResponse(
  input: CreateResponseInput,
  shouldRaiseTicket = false,
  checkUniqueDevice = false,
  ip: string | null = null,
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
    const contact = surveyTeamMap
      ? await prisma.contact.findFirst({
          where: { phone: phone, orgId: surveyTeamMap.team.orgId },
          select: { id: true },
        })
      : null;
    if (!contact)
      log.error({
        message: "no contact found",
        phone,
        orgId: surveyTeamMap?.team?.orgId,
      });
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
              title: true,
            },
          },
          team: {
            select: {
              orgId: true,
              id: true,
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
    },
  });

  if (surveyResponse) {
    updateMonthlyStat(
      surveyResponse.platform === "WHATSAPP" ? SubscriptionFeaturePathName.Whatsapp : "survey",
      surveyResponse.surveyTeamMap?.team.orgId,
    );
  }

  if (shouldRaiseTicket && input?.responses?.length > 0 && columnId) {
    //generate ticket
    await autoGenerateTicket({
      ticketColumnId: columnId,
      surveyResponseId: surveyResponse.id,
      type: surveyResponse.platform === "WEB" ? "SURVEY_RESPONSE" : "FLOW_RESPONSE",
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
  data: { ip?: string | null; location?: Location },
) {
  const response = await prisma.surveyResponse.update({
    where: {
      id: responseId,
    },
    data: {
      ip: data.ip,
      location: data.location,
    },
  });
  return response;
}

export async function sendEmailOnResponseCreation(
  id: string,
  surveyResponse: Awaited<ReturnType<typeof createResponse>>,
) {
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
  if (!response) return "response";
  const { survey, team } = response;

  if (
    survey?.enableNotificationEmail &&
    survey.notificationEmail &&
    (await hasFeature(team.orgId, SubscriptionFeaturePathName.EmailNotification))
  ) {
    const { notificationEmail } = survey;
    const surveyQuestion = surveyResponse?.surveyTeamMap?.survey?.questions ?? [];
    const surveyAnswer = surveyResponse?.responses ?? [];
    const language = surveyResponse?.language;
    const combineArray = surveyQuestion.map((qs) => ({
      ...qs,
      response:
        surveyAnswer.find((ans: { questionId: string }) => ans.questionId === qs.id)?.response ||
        {},
    }));
    const bodyJsx = combineArray
      ?.map((data) => {
        const questionText = language ? data?.title[language] : Object.values(data?.title)[0];
        const answerText = generateAnswerHtml(Object.values(data?.response)[0], data.type);
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
    await notificationQueue.add("notification", {
      emailData: msg,
    });
  }
  return "response";
}

export const generateResponse = async (body: GenerateBodyInput) => {
  let data: Prisma.SurveyResponseCreateManyInput[] = [];
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

  if (!surveyTeamMap) throw new Error("Survey Not Found");

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
export async function syncResponseToGoogleSheet(surveyId: string, orgId: string) {
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
  if (!survey) throw new Error(`Could not find survey with id ${surveyId}`);
  const authClient = await initializeAuthClient();
  const tokenFromIntgration = (await getIntegrationByName(
    orgId,
    IntegratedApps.googlesheet,
  )) as unknown as GoogleSheetIntegration;
  authClient.credentials.refresh_token = tokenFromIntgration.credential?.refreshToken;
  const drive = google.drive({ version: "v3", auth: authClient });
  const isDocExist = survey?.spreadSheetId
    ? await checkFileExistInDrive(survey?.spreadSheetId, drive)
    : false;
  let doc =
    isDocExist && survey.spreadSheetId
      ? new GoogleSpreadsheet(survey.spreadSheetId, authClient)
      : null;
  if (!doc) {
    const driveFolderId = await getDriveFolderId(orgId, authClient, drive, tokenFromIntgration);
    const existingFiles = await drive.files.list({
      q: `mimeType = 'application/vnd.google-apps.spreadsheet' and name = '${survey.title}' and '${driveFolderId}' in parents`,
      fields: "nextPageToken, files(id, name)",
      spaces: "drive",
    });
    const existingFile = existingFiles.data.files?.[0];
    if (existingFile?.id) {
      doc = new GoogleSpreadsheet(existingFile.id, authClient);
    } else {
      doc = await GoogleSpreadsheet.createNewSpreadsheetDocument(authClient, {
        title: survey.title,
      });
      let fileId = doc.spreadsheetId;
      const file = await drive.files.get({
        fileId: fileId,
        fields: "parents",
      });
      const previousParents = (file.data.parents ?? []).join(",");
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
  let flow = await getFlowBySurveyId(surveyId, orgId);
  const filteredSecondArray = flow?.json?.screens?.flatMap(
    (screen) => screen?.layout?.children?.filter((child) => child?.type !== "Footer" && child.name),
    // The sheet's leading/trailing columns (created-at, respondent, tag, team) are pushed in
    // below as plain header strings rather than flow elements.
  ) as Array<WaFlowForm | string>;
  const checkVersion = flow ? flow.version === 1 : true;

  if (checkVersion) {
    const languages = survey?.languages;
    let questions = survey?.questions as unknown as Array<Question>;
    // Precompute question titles for each language
    const languageQuestionTitles: Record<string, string[]> = {};
    for (const lang of languages) {
      let questionTitles: string[] = [];
      questions.map((q: Question, index: number) => {
        if ([QuestionType.InfoMessage, ...Object.values(PageType)].includes(q.type)) return false;
        let qsTitle = q?.title[lang] || q?.description[lang] || q?.label?.[lang] || "";
        const qstnTitle = index + 1 + "_" + getContent(qsTitle)?.trim();
        if ([QuestionType.Contact, QuestionType.Email, QuestionType.Phone].includes(q.type))
          Object.entries(q.features?.[lang] ?? {}).map(([key, value]) =>
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
          Object.entries(q.features?.[lang] ?? {}).map(([key, value]) =>
            value ? questionTitles.push((qstnTitle + ":" + key).trim()) : null,
          );
        } else if (q.type === QuestionType.MCQGrid) {
          const subQs: string[] | undefined = q.features?.[lang]?.questions;
          subQs?.map((qstn) => questionTitles.push((qstnTitle + ":" + qstn).trim()));
        } else if (q.type === QuestionType.MultiTextInput) {
          const fields: { fieldKey?: string }[] | undefined = q.features?.[lang]?.fields;
          fields?.map((field) => questionTitles.push((qstnTitle + ":" + field?.fieldKey).trim()));
        } else questionTitles.push(qstnTitle);
      });
      languageQuestionTitles[lang] = questionTitles;
    }

    // For each language, process responses in batches
    for (const lang of languages) {
      const additionalColumns = ["Team", "Respondent's Mobile Number", "Tags"];
      const headerRow = ["Created At", ...languageQuestionTitles[lang], ...additionalColumns];
      const totalColumnCount = headerRow.length;
      let sheet =
        (await doc.sheetsByTitle[lang]) ??
        (await doc.addSheet({
          title: lang,
          headerValues: headerRow,
          gridProperties: totalColumnCount > 26 ? { columnCount: totalColumnCount } : undefined,
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
          const resObj: SheetRow = {
            Team: response.surveyTeamMap.team.name,
            "Created At": dayjs(response.createdAt).format("DD-MM-YYYY HH:mm"),
          };
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if ([QuestionType.InfoMessage, ...Object.values(PageType)].includes(q.type)) continue;
            let qsTitle = q?.title[lang] || q?.description[lang] || q?.label?.[lang] || "";
            const qstnTitle = i + 1 + "_" + getContent(qsTitle)?.trim();
            const res = response.responses.find((r) => r.questionId === q.id);
            if (res) {
              const answerValue = getAnswerValue(res.response, res.type);
              if ([QuestionType.Contact, QuestionType.Email, QuestionType.Phone].includes(q.type))
                Object.entries(answerValue as Record<string, unknown>).map(
                  ([key, value]) => (resObj[(qstnTitle + ":" + key).trim()] = toCell(value)),
                );
              else if (q.type === QuestionType.Testimonial)
                Object.entries(answerValue as Record<string, unknown>).map(
                  ([key, value]) =>
                    (resObj[(qstnTitle + ":" + key).trim()] =
                      key == "photo"
                        ? `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${value}`
                        : toCell(value)),
                );
              else if (q.type === QuestionType.MCQGrid)
                Object.entries(answerValue as Record<string, Choice>).map(
                  ([key, value]) => (resObj[(qstnTitle + ":" + key).trim()] = value?.value),
                );
              else if (q.type === QuestionType.MultiTextInput)
                Object.entries(answerValue as Record<string, unknown>).map(
                  ([key, value]) => (resObj[(qstnTitle + ":" + key).trim()] = toCell(value)),
                );
              else resObj[qstnTitle] = getFormattedResponse(answerValue, q, lang);
            }
          }
          resObj["Respondent's Mobile Number"] = toCell(response?.Contact?.phone);
          resObj["Tag"] = toCell(response?.tag);
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
      typeof question === "string"
        ? question
        : markdownToPlainText(question?.header || question?.label || ""),
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
        gridProperties: totalColumnCount > 26 ? { columnCount: totalColumnCount } : undefined,
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
          const questionId = typeof question === "string" ? undefined : question.id;
          const responseObj = response.responses.find(
            (answerObj: { questionId: string }) => answerObj.questionId === questionId,
          );
          let responseValue: string;
          if (responseObj) {
            responseValue = getCellData(
              responseObj.response,
              question as { type?: QuestionType; metaType?: WaQuestions },
            );
          } else if (question === createdAt) {
            const createdAtFormatted = dayjs(response.createdAt).format("DD-MM-YYYY HH:mm");
            responseValue = createdAtFormatted;
          } else if (question === whatsappRespondentNumber) {
            responseValue = response?.Contact?.phone || "";
          } else if (question === responseTag) {
            responseValue = response.tag || "";
          } else if (question === teamTag) {
            // Try to get team name from survey.teams
            let teamName = "";
            if (response?.surveyTeamMapId && survey.teams) {
              const found = survey.teams.find((t) => t.team.id === response?.surveyTeamMap?.teamId);
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
  authClient: Awaited<ReturnType<typeof initializeAuthClient>>,
  drive: ReturnType<typeof google.drive>,
  token: GoogleSheetIntegration,
) {
  let { driveFolderId } = token?.credential || {};

  const isFolderExist = driveFolderId ? await checkFileExistInDrive(driveFolderId, drive) : null;
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
    if (folderList.data.files?.length) {
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
  if (!driveFolderId) throw new Error("Could not resolve a Google Drive folder id");
  return driveFolderId;
}

async function checkFileExistInDrive(fileId: string, drive: ReturnType<typeof google.drive>) {
  try {
    await drive.files.get({ fileId });
    return true;
  } catch (e) {
    console.log(e);
    const statusText =
      e && typeof e === "object" && "response" in e
        ? (e.response as { statusText?: string } | undefined)?.statusText
        : undefined;
    if (statusText === "Not Found") return false;
  }
}
interface IsheetResponse {
  surveyTeamMapId: string;
  responses: QuestionResponse[];
  language: string;
  createdAt: Date;
  respondent?: string | null | false;
  tag?: string | null;
}
export async function saveResponseToGoogleSheet(responseData: IsheetResponse) {
  try {
    const { GoogleSpreadsheet } = await import("google-spreadsheet");
    const { respondent, tag, ...response } = responseData;
    const surveyTeamMap = await prisma.surveyTeamMap.findUnique({
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
    if (!surveyTeamMap) return;
    const {
      survey: { spreadSheetId, questions, id: surveyId },
      team,
    } = surveyTeamMap;
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
      const resObj: SheetRow = {
        Team: team.name,
        team: team.name, // for old synced response
      };
      resObj["Created At"] = dayjs(response.createdAt).format("DD-MM-YYYY HH:mm");

      let flow = await getFlowBySurveyId(surveyId, team.orgId);
      const filteredSecondArray = flow?.json?.screens?.flatMap((screen) =>
        screen?.layout?.children?.filter((child) => child?.type !== "Footer" && child.name),
      ) as unknown as Question2[];
      const checkVersion = flow ? flow.version === 1 : true;
      response.responses.map((res: QuestionResponse) => {
        if (checkVersion) {
          let QIndex;
          let qstn = (questions as unknown as Question[]).find((q: Question, index: number) => {
            if (q.id === res.questionId) {
              QIndex = index + 1;
              return q;
            }
          });
          if (!qstn) return;
          let qsTitle =
            qstn?.title[response.language] ||
            qstn?.description[response.language] ||
            qstn?.label?.[response.language] ||
            "";
          let qstnTitle = QIndex + "_" + getContent(qsTitle).trim();
          const answerValue = getAnswerValue(res.response, res.type);
          if ([QuestionType.Contact, QuestionType.Email, QuestionType.Phone].includes(qstn.type))
            Object.entries(answerValue as Record<string, unknown>).map(
              ([key, value]) => (resObj[(qstnTitle + ":" + key).trim()] = toCell(value)),
            );
          else if (qstn.type === QuestionType.Testimonial)
            Object.entries(answerValue as Record<string, unknown>).map(
              ([key, value]) =>
                (resObj[(qstnTitle + ":" + key).trim()] =
                  key == "photo"
                    ? `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${value}`
                    : toCell(value)),
            );
          else if (qstn.type === QuestionType.MCQGrid)
            Object.entries(answerValue as Record<string, Choice>).map(
              ([key, value]) => (resObj[(qstnTitle + ":" + key).trim()] = value?.value),
            );
          else if (qstn.type === QuestionType.MultiTextInput)
            Object.entries(answerValue as Record<string, unknown>).map(
              ([key, value]) => (resObj[(qstnTitle + ":" + key).trim()] = toCell(value)),
            );
          else resObj[qstnTitle] = getFormattedResponse(answerValue, qstn, response.language);
        } else {
          const questionId = res.questionId;
          let question = filteredSecondArray.find(
            (q) => q.id === questionId,
          ) as unknown as Question2;
          let qstnTitle = markdownToPlainText(question?.header || question?.label || "");
          const responseObj = response.responses.find(
            (answerObj) => answerObj.questionId === questionId,
          );
          let responseValue: string;
          if (responseObj) {
            responseValue = getCellData(
              responseObj.response,
              question as { type?: QuestionType; metaType?: WaQuestions },
            );
          } else {
            responseValue = "";
          }
          resObj[qstnTitle] = responseValue;
        }
      });
      resObj["Respondent's Mobile Number"] = toCell(respondent);
      resObj["Tag"] = toCell(tag);
      resObj["tag"] = toCell(tag); // for old synced response
      await sheet.addRow(resObj);
    }
    return spreadSheetId;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/** Coerces one exported answer (or sub-answer) to the string a spreadsheet cell holds. */
function toCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(toCell).join(", ");
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(toCell)
      .join(", ");
  }
  return String(value);
}

/** Reads one key off an answer that is stored as a keyed sub-answer map. */
function answerField(value: unknown, key: string): unknown {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

// `response` shape varies per QuestionType (string, {value}, array, boolean); the switch
// on qstn.type below is the real runtime type discrimination, so each branch narrows for
// itself rather than the parameter claiming one shape.
export function getFormattedResponse(response: unknown, qstn: Question, language: string) {
  const choice = response as { value?: string; other?: string } | undefined;
  const choices = response as Array<{ value?: string; other?: string }> | undefined;
  const otherTitle = qstn?.features?.[language]?.other?.title;
  let formattedResponse = "";
  switch (qstn?.type) {
    case QuestionType.MCQ:
      formattedResponse = choice?.value?.trim() || `${otherTitle}: ${choice?.other?.trim()}`;
      break;
    case QuestionType.CustomNPS:
    case QuestionType.DDSS:
      formattedResponse = choice?.value?.trim() ?? "";
      break;
    case QuestionType.DDMS:
    case QuestionType.MSQ:
      formattedResponse = (choices ?? [])
        .map((item) => item?.value?.trim() || `${otherTitle}: ${item?.other?.trim()}`)
        .join(", ");
      break;
    case QuestionType.Date:
      formattedResponse = dayjs(response as string | number | Date).format("DD, MMM YYYY");
      break;
    case QuestionType.Photo:
    case QuestionType.File:
      formattedResponse = `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${toCell(response)}`;
      break;
    case QuestionType.PCQ:
      formattedResponse = toCell(answerField(answerField(response, "value"), "value"));
      break;
    case QuestionType.TnC:
      formattedResponse = response == true ? "accepted" : "Not accepted";
      break;
    case QuestionType.EmailOtp:
      formattedResponse = `verified email Id: ${toCell(answerField(response, "email"))}`;
      break;
    default:
      formattedResponse = toCell(response);
  }
  return formattedResponse;
}

export async function getAIResponseSummaryBySurveyId(surveyId: string, _questionId: string) {
  const survey = await prisma.survey.findUnique({
    where: {
      id: surveyId,
    },
    select: {
      aiResponseSummary: true,
    },
  });
  return survey?.aiResponseSummary as unknown as ResponseSummary[];
}

export async function updateSummaryOnSurvey(surveyId: string, updatedSummary: ResponseSummary[]) {
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
  allowedTokens: { completionTokens: number; promptTokens: number },
  usedTokens: { aiCompletionTokensCount: number; aiPromptTokensCount: number } | null,
  type: ResponseSummaryType,
  questionId: string,
  teamId?: string,
) {
  const allResponses = await getAllResponses(surveyId);

  const aiResponseSummary = await getAIResponseSummaryBySurveyId(surveyId, questionId);

  let questionIndex: number | null = null;
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
  const deletedResponses = existingSummary
    ? existingSummary.responseIds.filter((responseId) => !responseIds.includes(responseId))
    : [];
  let responsesNotSummarised = [];
  if (deletedResponses.length) {
    responsesNotSummarised = [...filteredResponses];
  } else {
    responsesNotSummarised = existingSummary
      ? filteredResponses.filter((r) => !existingSummary.responseIds.includes(r.responseId))
      : filteredResponses;
  }

  if (!responsesNotSummarised.length) return;
  const responseTexts = responsesNotSummarised.map((r) =>
    r.response.type ? getAnswerValue(r.response.response, r.response.type) : r.response.response,
  );
  if (existingSummary && !deletedResponses.length) responseTexts.push(existingSummary.summary);
  const res = await getTextSummaryByAI(responseTexts, request, allowedTokens, usedTokens);
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
    if (!teamId) throw new Error("TeamId not found");
    let updatedTeamSummary = responseSummary?.team ?? [];
    if (existingSummary) {
      const teamSummaryIndex = updatedTeamSummary.findIndex((t) => t.teamId === teamId);
      updatedTeamSummary[teamSummaryIndex].summary = res.summary;
      updatedTeamSummary[teamSummaryIndex].responseIds = responseIds;
    } else {
      updatedTeamSummary.push({ teamId, responseIds, summary: res.summary });
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
        questionId,
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

export async function exportContactResponseToContacts(surveyId: string, orgId: string) {
  const allResponse = await getAllResponses(surveyId);
  const surveyTitle = allResponse[0].survey.title;
  const contactResponses = allResponse.map((r) => ({
    team: {
      id: r.team.id,
      name: r.team.name,
    },
    responses: r.responses.flatMap((res) =>
      res.responses.filter((r) => (r as unknown as QuestionResponse).type === QuestionType.Contact),
    ),
  }));

  if (!contactResponses.length) return;

  await Promise.all(
    contactResponses.map(async (team) => {
      let groupName = `_${surveyTitle}_${team.team.name}`;
      const teamId = team.team.id;
      const contacts = team.responses
        .map((res) => (res as unknown as QuestionResponse).response[QuestionType.Contact])
        .filter((c): c is { name?: string; phone: string; email?: string } => Boolean(c?.phone))
        .map((c) => {
          const email: string | undefined = undefined;
          return {
            ...c,
            phone: c.phone.slice(1),
            source: `survey_import: ${surveyTitle}`,
            email,
          };
        });
      if (!contacts.length) return;
      let contactGroup = await getContactGroupByNameAndTeam(groupName, teamId);
      if (!contactGroup)
        contactGroup = await createContactGroup(
          {
            name: groupName,
            teamId,
            tags: [],
            type: ContactGroupType.NORMAL,
          },
          orgId,
        );
      // Ensure each contact has required fields: name, source
      const contactsWithRequired = contacts.map((c) => ({
        ...c,
        name: c.name || "Unknown",
        source: c.source || "imported",
      }));
      await addNewContactsToGroup(contactGroup.id, contactsWithRequired, orgId);
    }),
  );
}

export async function sendResponseToWebhook(
  responseObj: Awaited<ReturnType<typeof createResponse>>,
  orgId: string,
) {
  if (!hasFeature(orgId, SubscriptionFeaturePathName.Webhook)) {
    return;
  }
  const endpoint = responseObj.surveyTeamMap.survey.responseWebhookEndpoint;
  if (!endpoint) return;
  const questionMap = responseObj.surveyTeamMap.survey.questions.reduce<Record<string, string>>(
    (map, { id, title, description, label }) => {
      map[id] =
        title[responseObj?.language] ||
        description[responseObj?.language] ||
        label?.[responseObj?.language] ||
        "";
      return map;
    },
    {},
  );
  const responses = responseObj.responses.map(({ questionId, response, type }) => ({
    type,
    response: getAnswerValue(response, type),
    title: questionMap[questionId],
  }));
  const payload = {
    tag: responseObj?.tag,
    createdAt: responseObj.createdAt,
    phone: responseObj?.Contact?.phone,
    language: responseObj?.language,
    responses,
    teamId: responseObj.surveyTeamMap.team.id,
    surveyId: responseObj.surveyTeamMap.surveyId,
  };
  await sendWebhook(endpoint, payload, orgId);
}

export function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/[#_*~>]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/!\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/`{1,3}.*?`{1,3}/g, "");
}

// Called with heterogeneous question shapes (web Question, WaFlow Question2, flow form
// elements) across different export paths, so the shape here is intentionally permissive.
const getCellData = (
  response: unknown,
  question: {
    type?: QuestionType | WaQuestions | WaFlowFormElementType;
    metaType?: WaQuestions;
    "data-source"?: Array<{ id: string; title: string }>;
  },
): string => {
  const answer = toCell(response);
  // The scale maps are keyed by the 1..5 option number the flow sends back.
  const scaleKey = Number(answer);
  switch (question?.type || question?.metaType) {
    case WaQuestions.LD:
      return LDResponseMap[scaleKey] || "";
    case WaQuestions.YN:
      return YNResponseMap[scaleKey] || "";
    case WaQuestions.Smiley:
      return SmileyResponseMap[scaleKey] || "";
    case WaQuestions.Rating:
      return RatingScaleMap[scaleKey] || "";
    case WaQuestions.Opinion:
      return answer || "";
    case WaQuestions.RadioButtonsGroup:
    case WaQuestions.Dropdown:
      return question["data-source"]?.find((data) => data.id === answer)?.title || "";
    case WaQuestions.CheckboxGroup:
    case WaQuestions.ChipsSelector:
      return (
        (Array.isArray(response) &&
          response
            ?.map((i) => question["data-source"]?.find((data) => data.id === i)?.title)
            ?.join(",")) ||
        ""
      );
    case WaQuestions.DocumentPicker:
    case WaQuestions.PhotoPicker:
      return response ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${answer}` : "";
    case WaQuestions.DatePicker:
      return response ? dayjs(response as string | number | Date).format("DD-MM-YYYY") : "";
    default:
      return answer;
  }
};

export async function getSurveyResponseCount(surveyId: string, teamIds: string[]) {
  const teamWiseCount = (await prisma.$queryRaw`SELECT st.id,t.code as "teamCode", 
  COUNT(sr.id)::INTEGER
  FROM "SurveyTeamMap" st
  LEFT JOIN "SurveyResponse" sr ON st.id = sr."surveyTeamMapId" 
  LEFT JOIN "Team" t ON t.id = st."teamId"
  WHERE st."surveyId"=${surveyId}::uuid 
  AND st."teamId" = ANY(${teamIds}::uuid[])
  GROUP BY st.id, t.code
  ;`) as { id: string; teamCode: string; count: number }[];

  return {
    all: teamWiseCount.reduce((total, teamMap) => (total += teamMap.count), 0),
    teamWiseCount,
  };
}

interface SurveyResponseRawRow {
  count: number;
  id: string;
  contactId: string | null;
  language: string;
  tag: string | null;
  responses: QuestionResponse[];
  createdAt: Date;
  encryptedResponses: string | null;
  platform: string;
  surveyTeamMapId: string;
  phone: string | null;
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
    const [startDate, endDate] = dateRange?.split(",") || [];
    if (startDate)
      filterQuery += ` AND sr."createdAt" >= '${dayjs(startDate).startOf("day").toISOString()}'`;
    if (endDate)
      filterQuery += ` AND sr."createdAt" <= '${dayjs(endDate).endOf("day").toISOString()}'`;
  }

  if (mobile?.length) {
    filterQuery += ` AND c."phone" LIKE '%${mobile}%'`;
  }

  if (Object.keys(rest)?.length) {
    const { createdAt: createdAtFilter, ...responseFilters } = rest as Record<string, string>;

    if (createdAtFilter?.length) {
      const startDate = dayjs
        .utc(createdAtFilter)
        .startOf("day")
        .toISOString()
        .replaceAll("'", "''");
      const endDate = dayjs.utc(createdAtFilter).endOf("day").toISOString().replaceAll("'", "''");
      filterQuery += ` AND sr."createdAt" >= '${startDate}' AND sr."createdAt" <= '${endDate}'`;
    }

    let query: string[] = [];
    Object.entries(responseFilters).forEach(([questionId, search]) => {
      const rawSearch = (search || "").trim();
      const isDateSearch = /^\d{4}-\d{2}-\d{2}$/.test(rawSearch);
      let escapedSearch = rawSearch.replaceAll("'", "''");
      const escapedQuestionId = questionId.replaceAll("'", "''");
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
            (s."type" = '${SurveyType.WaFlow}' AND ${
              isDateSearch
                ? `LEFT(responseobj->>'response', 10) = '${escapedSearch}'`
                : `cast(responseobj->'response' AS text) LIKE '%${escapedSearch}%'`
            })
            OR
            ${
              isDateSearch
                ? `LEFT(responseobj->'response'->>(responseobj->>'type'), 10) = '${escapedSearch}'`
                : `responseobj->'response'->>(responseobj->>'type') LIKE '%${escapedSearch}%'`
            }
          )
      )`);
      }
    });
    if (query.length) {
      filterQuery += ` AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(to_jsonb(sr."responses")) AS responseobj
        WHERE
          ${query.join(` AND `)}
      )`;
    }
  }

  const responses = await prisma.$queryRaw<
    SurveyResponseRawRow[]
  >`SELECT COUNT(*) OVER()::INTEGER , sr.id, sr."contactId", sr."language",
  sr."tag", sr."responses", sr."createdAt",sr."encryptedResponses",sr."platform", sr."surveyTeamMapId", c."phone" FROM "SurveyResponse" sr
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
  surveyId: string,
  teamIds: string[],
  teamMapIds: string[] = [],
  dateRange = "",
) {
  let where: Prisma.SurveyResponseWhereInput = {
    surveyTeamMap: {
      surveyId,
      teamId: {
        in: teamIds,
      },
    },
  };
  if (teamMapIds.length)
    where.surveyTeamMap = {
      ...(where.surveyTeamMap as Prisma.SurveyTeamMapWhereInput),
      id: { in: teamMapIds },
    };
  if (dateRange?.length) {
    const [startDate, endDate] = dateRange?.split(",") || [];
    where.createdAt = {
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
    ? surveyInfo.survey.questions.filter((q) => barGraphQuestions.includes(q.type))
    : ((surveyInfo.survey.WaFlow?.json.screens.flatMap((screen) =>
        screen.layout.children.filter(
          (child) => barGraphQuestions2.includes(child.metaType as WaQuestions) && child.name,
        ),
      ) ?? []) as unknown as Question2[]);

  const npsQuestionIds = version
    ? questions
        .filter((q) => npsQuestionTypes.includes(q.type as QuestionType) && q.enableNpsAnalytics)
        .map((q) => q.id)
    : questions
        // This branch only ever holds v2 (Question2) entries, which are the
        // ones carrying `metaType`.
        .filter(
          (q) =>
            "metaType" in q &&
            npsQuestionTypes2.includes(q.metaType as WaQuestions) &&
            q.enableNpsAnalytics,
        )
        .map((q) => q?.id);
  const barGraphQuestionIds = questions.map((q) => q.id);

  // Initialize result object
  const result: { nps: Record<string, NpsResult>; choiceWise: Record<string, ChoiceWiseResult> } = {
    nps: {},
    choiceWise: {},
  };

  // Set up counters for each question
  const counters: Record<string, AnalyticsCounter> = {};
  barGraphQuestionIds.forEach((qId) => {
    const question = questions.find((q) => q.id === qId);
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
        if (!barGraphQuestionIds.includes(questionId) || !counters[questionId]) continue;

        const question = questions.find((q) => q.id === questionId);
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
    const question = questions.find((q) => q.id === qId);
    // qId came from questions itself, so this only proves it to the type system.
    if (!question) return;

    if (npsQuestionIds.includes(qId)) {
      const total = counter.promoters + counter.passives + counter.detractors;
      const nps = total ? ((counter.promoters - counter.detractors) / total) * 100 : null;
      const csatScore = counter.total ? Math.round((counter.csat / counter.total) * 100) : 0;

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
      result.choiceWise[qId] = finalizeChoiceWiseData(counter.choiceWise, question, version);
      result.choiceWise[qId].responseCount = counter.total;
    }
  });

  return result;
}

// Helper functions
/**
 * The subset of a question the analytics pipeline below reads. That pipeline
 * handles both web surveys (Question/QuestionType) and WhatsApp Flow v2
 * (Question2/WaQuestions), so the fields of both shapes appear here and callers
 * pass whichever they have.
 */
interface AnalyticsQuestion {
  id?: string;
  type?: QuestionType;
  metaType?: WaQuestions;
  features?: Record<string, QuestionFeatures>;
  choices?: Record<string, Choice[]>;
  "data-source"?: Array<{ id: string; title: string }>;
}

/**
 * A stored choice. Most rows keep a plain label in `value`, but legacy rows
 * keep an object carrying the label under `title` — every reader below handles
 * both.
 */
interface StoredChoice {
  value: string | { title?: string };
}

/** One choice's running tally. */
interface ChoiceTally {
  count: number;
  choice: unknown;
}

/**
 * Choice tallies for a question: a single map for an ordinary choice question,
 * or one map per sub-question for an MCQGrid.
 */
type ChoiceWiseCounter =
  | Map<number | string, ChoiceTally>
  | Record<number, Record<string, Map<number, ChoiceTally>>>;

/** One question's finished NPS/CSAT block in the analytics payload. */
interface NpsResult {
  csatScore: number;
  npsData: {
    npsScore: number | null;
    passives: number;
    detractors: number;
    promoters: number;
    total: number;
  };
  responseCount: number;
}

/** One question's finished choice breakdown; `subData` is only set for grids. */
interface ChoiceWiseResult {
  data: ChoiceTally[];
  subData?: Record<string, ChoiceTally[]>;
  responseCount?: number;
}

/** Running tallies kept per question while streaming responses. */
interface AnalyticsCounter {
  promoters: number;
  detractors: number;
  passives: number;
  csat: number;
  total: number;
  choiceWise: ChoiceWiseCounter;
}

/** True when a stored answer is a Choice object rather than a scalar. */
function isChoice(value: unknown): value is Choice {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "value" in value;
}

/**
 * A stored answer's value. Which member applies depends on the question type,
 * which the switches in processResponse dispatch on.
 */
type AnalyticsValue =
  | QuestionResponse["response"][keyof QuestionResponse["response"]]
  // MCQGrid answers are keyed by sub-question label rather than by question
  // type, so they have no entry in QuestionResponse["response"].
  | Record<string, Choice>;

/** True when a stored answer is an MCQGrid's sub-question -> choice map. */
function isGridValue(value: unknown): value is Record<string, Choice> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value) && !("value" in value)
  );
}

// This analytics pipeline handles both web (Question/QuestionType) and WhatsApp Flow
// (Question2/WaQuestions) survey shapes; ChoiceWiseCounter's union mirrors that duality.
function initializeChoiceCounter(question: AnalyticsQuestion, version: boolean): ChoiceWiseCounter {
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
        ? ((Object.values(question.choices ?? [])[0] ?? []) as StoredChoice[]).map((c) =>
            typeof c.value === "object" ? c.value?.title : c.value,
          )
        : getChoicesForNpsQuestions(type);

      return subQuestions.reduce(
        (acc: Record<number, Record<string, Map<number, ChoiceTally>>>, subQ, idx) => {
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
        },
        {},
      );
    } else {
      const choices = question.choices
        ? ((Object.values(question.choices)[0] ?? []) as StoredChoice[]).map((c) =>
            typeof c.value === "object" ? c.value?.title : c.value,
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
    const choices = question["data-source"] ?? [];
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
  r: QuestionResponse,
  language: string,
  question: AnalyticsQuestion,
  counter: AnalyticsCounter,
  version: boolean,
  isNpsQuestion: boolean,
) {
  const type = version ? r.type : question.metaType;
  // v1 answers are keyed by question type; v2 answers hold the raw value.
  const responsesByType = r.response as Partial<Record<QuestionType, AnalyticsValue>>;
  const value: AnalyticsValue = responsesByType[r.type] ?? (r.response as AnalyticsValue);
  // Scale answers (Rating/Opinion) are stored as numbers on some rows and as
  // numeric strings on others, so compare numerically rather than by type.
  const numericValue = Number(value);
  const stringValue = typeof value === "string" ? value : String(value);

  counter.total++;

  // Process NPS responses
  if (isNpsQuestion) {
    if (version) {
      switch (type) {
        case QuestionType.Rating:
          if (numericValue >= 4) {
            counter.promoters++;
            counter.csat++;
          } else if (numericValue === 3) counter.passives++;
          else counter.detractors++;
          break;
        case QuestionType.Opinion:
          if (numericValue >= 9) {
            counter.promoters++;
            counter.csat++;
          } else if (numericValue >= 7) counter.passives++;
          else counter.detractors++;
          break;
        case QuestionType.Smiley:
          if (
            [SmileyResponse.VeryHappy, SmileyResponse.Happy].includes(stringValue as SmileyResponse)
          ) {
            counter.promoters++;
            counter.csat++;
          } else if (stringValue === SmileyResponse.Neutral) counter.passives++;
          else counter.detractors++;
          break;
        case QuestionType.LD:
          if (value === LDResponse.Like) {
            counter.promoters++;
            counter.csat++;
          } else counter.detractors++;
          break;
        case QuestionType.YN:
          if (stringValue === YNResponse.Yes) {
            counter.promoters++;
            counter.csat++;
          } else counter.detractors++;
          break;
        case QuestionType.CustomNPS:
          if (isChoice(value) && value.weightage === NPSWeightage.PROMOTER) {
            counter.csat++;
            counter.promoters++;
          }
          if (isChoice(value) && value.weightage === NPSWeightage.PASSIVE) counter.passives++;
          if (isChoice(value) && value.weightage === NPSWeightage.DETRACTOR) counter.detractors++;
          break;
      }
    } else {
      switch (type) {
        case WaQuestions.Rating:
          if (numericValue >= 4) {
            counter.promoters++;
            counter.csat++;
          } else if (numericValue === 3) counter.passives++;
          else counter.detractors++;
          break;
        case WaQuestions.Opinion:
          if (numericValue >= 9) {
            counter.promoters++;
            counter.csat++;
          } else if (numericValue >= 7) counter.passives++;
          else counter.detractors++;
          break;
        case WaQuestions.Smiley:
          if (["4", "5"].includes(stringValue)) {
            counter.promoters++;
            counter.csat++;
          } else if (stringValue === "3") counter.passives++;
          else counter.detractors++;
          break;
        case WaQuestions.LD:
          if (stringValue === "1") {
            counter.promoters++;
            counter.csat++;
          } else counter.detractors++;
          break;
        case WaQuestions.YN:
          if (stringValue === "1") {
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
      const resp: unknown[] = Array.isArray(value)
        ? value.map((v) => (isChoice(v) ? v.value : v))
        : isChoice(value)
          ? [value.value]
          : [value];

      resp.forEach((res) => {
        if (!res) return;
        const choiceIndex = getChoiceIndex(question, language, res.toString(), type);
        // Non-MCQGrid questions always get the single-Map counter shape.
        if (!(counter.choiceWise instanceof Map)) return;
        const mapValue = counter.choiceWise.get(choiceIndex);
        if (choiceIndex !== -1 && mapValue) {
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
      // An MCQGrid's counter is keyed by sub-question, not a single Map.
      if (!isGridValue(value) || counter.choiceWise instanceof Map) return;
      const gridCounter = counter.choiceWise;
      subQuestions.forEach((subQ, index) => {
        const resp = value[subQ]?.value;
        if (!resp) return;

        const choiceIndex = getChoiceIndex(question, language, resp, type);
        const subCounter = gridCounter[index]?.[subQ];
        const mapValue = subCounter?.get(choiceIndex);
        if (choiceIndex !== -1 && subCounter && mapValue) {
          subCounter.set(choiceIndex, {
            ...mapValue,
            count: mapValue.count + 1,
          });
        }
      });
    }
  } else {
    const resp: unknown[] = Array.isArray(value) ? value : [value];
    // v2 (flow) questions always get the single-Map counter shape.
    if (!(counter.choiceWise instanceof Map)) return;
    const choiceCounter = counter.choiceWise;
    resp.forEach((res) => {
      if (!res) return;
      const mapValue = choiceCounter.get(res as string | number);
      if (!mapValue) return;
      choiceCounter.set(res as string | number, {
        ...mapValue,
        count: mapValue.count + 1,
      });
    });
  }
}

function getChoiceIndex(
  question: AnalyticsQuestion,
  language: string,
  resp: unknown,
  type: QuestionType | WaQuestions | undefined,
) {
  const choices = question.choices
    ? (question.choices[language] as StoredChoice[] | undefined)?.map((c) =>
        typeof c.value === "object" ? c.value?.title : c.value,
      )
    : getChoicesForNpsQuestions(type);

  return choices?.findIndex((c: unknown) => c === resp) ?? -1;
}

function finalizeChoiceWiseData(
  choiceWise: ChoiceWiseCounter,
  question: AnalyticsQuestion,
  version: boolean,
): ChoiceWiseResult {
  // A grid question counts per row; every other type counts into a flat Map.
  if (version && question.type === QuestionType.MCQGrid && !(choiceWise instanceof Map)) {
    const subData = Object.keys(choiceWise).reduce((acc: Record<string, ChoiceTally[]>, idx) => {
      const row = choiceWise[Number(idx)];
      const key = Object.keys(row)[0];
      if (key === undefined) return acc;
      acc[key] = Array.from(row[key].values());
      return acc;
    }, {});

    return { data: [], subData };
  }

  return {
    data: choiceWise instanceof Map ? Array.from(choiceWise.values()) : [],
    subData: undefined,
  };
}

// Types with no fixed choice set (including WhatsApp Flow types) yield [].
function getChoicesForNpsQuestions(type: QuestionType | WaQuestions | undefined) {
  let choices: string[] = [];
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

export async function getResponseCountForCamparison(surveyId: string, teamIds: string[]) {
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
  const version1 = !teamRes[0].survey.WaFlow || teamRes[0].survey.WaFlow.version === 1;
  // The dual web-survey (Question) / WhatsApp-flow (Question2) shape is handled dynamically
  // via `version1` throughout this function, matching the pattern used elsewhere in this file.
  const questions: Array<Question | WaFlowForm> = version1
    ? teamRes[0].survey.questions.filter((q) => npsQuestionTypes.includes(q.type))
    : (teamRes[0].survey.WaFlow?.json.screens.flatMap((screen) =>
        screen.layout.children.filter(
          (child) => npsQuestionTypes2.includes(child.metaType as WaQuestions) && child.name,
        ),
      ) ?? []);

  const data = questions.map((q) => {
    // v1 entries are Survey questions (carrying `type`); v2 entries are flow
    // layout children (carrying `metaType`).
    const metaType = "metaType" in q ? q.metaType : undefined;
    return {
      questionId: q.id,
      type: (version1 ? q.type : metaType) as QuestionType | WaQuestions | undefined,
      responseObj: getResponseObjectByQuestionType(
        version1
          ? (q.type as QuestionType)
          : (QuestionType2 as Record<string, QuestionType2 | undefined>)[metaType as string],
        version1,
      ),
      data: [] as unknown[],
    };
  });
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
        if (questionIndex === -1 || !q) return;
        const resp = version1 ? getAnswerValue(r.response, r.type) : r.response;
        let currentResponseObj: Record<string, number> = { ...data[questionIndex].responseObj };
        if (q.type === QuestionType.CustomNPS) {
          const weightage = toCell(answerField(resp, "weightage"));
          currentResponseObj[weightage] = currentResponseObj[weightage] + 1;
        } else {
          const key = toCell(resp);
          currentResponseObj[key] = currentResponseObj[key] + 1;
        }
        data[questionIndex].responseObj = currentResponseObj;
      });
      skip += batchSize;
    }
    data.forEach((d) => {
      const resObj = version1
        ? { ...d.responseObj }
        : getFlowVersion2MappedObj(d.responseObj ?? {}, d.type);
      d.data = [...d.data, { teamCode: t.team.code, mapId: t.id, ...resObj }];
      d.responseObj = getResponseObjectByQuestionType(d.type, version1);
    });
  }
  return data.map((d) => ({ questionId: d.questionId, data: d.data }));
}

function getFlowVersion2MappedObj(
  responseObj: Record<string, number>,
  type: QuestionType | QuestionType2 | WaQuestions | undefined,
): Record<string, number> {
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
export function getResponseObjectByQuestionType(
  questionType: QuestionType | QuestionType2 | WaQuestions | undefined,
  version: boolean,
): Record<string, number> | null {
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

const smileyMap: Record<string, number> = {
  "Very Sad": 0,
  Sad: 2,
  Neutral: 5,
  Happy: 8,
  "Very Happy": 10,
};
const smileyMap2: Record<number, number> = {
  1: 0,
  2: 2,
  3: 5,
  4: 8,
  5: 10,
};

const likeDislikeAndYNMap: Record<number, number> = {
  1: 10,
  2: 0,
};

const MAX_SCORE = 10;

export async function happyIndexResponsesBySurveyId(
  surveyId: string,
  teamMapIds: string[] | any,
  teamIds: string[],
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
  const maxScore = MAX_SCORE;
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

  const isFlow = surveyInfo.survey.type === SurveyType.WaFlow;
  const version = !isFlow || surveyInfo.survey.WaFlow?.version === 1;
  const questions = version
    ? surveyInfo.survey.questions.filter((q) => barGraphQuestions.includes(q.type))
    : ((surveyInfo.survey.WaFlow?.json.screens.flatMap((screen) =>
        screen.layout.children.filter(
          (child) => barGraphQuestions2.includes(child.metaType as WaQuestions) && child.name,
        ),
      ) ?? []) as unknown as Question2[]);

  responses.forEach((resp) => {
    resp.responses.forEach((r) => {
      let score = null;
      const matchedQuestion = questions.find((q) => q.id === r.questionId);
      if (!matchedQuestion) return;

      const questionType =
        "metaType" in matchedQuestion && matchedQuestion.metaType
          ? (QuestionType as Record<string, QuestionType>)[matchedQuestion.metaType]
          : matchedQuestion.type;

      if (questionType === QuestionType.Opinion) {
        const val = version ? Number(r.response[QuestionType.Opinion]) : Number(r.response);
        if (!isNaN(val)) score = val;
      }

      if (questionType === QuestionType.Rating) {
        const val = version ? r.response[QuestionType.Rating] : Number(r.response);
        if (val === 5) score = 10;
        else if (val === 4) score = 9;
        else if (val === 3) score = 6;
        else if (val === 2) score = 5;
        else score = 0;
      }

      if (questionType === QuestionType.Smiley) {
        if (version) {
          const val = r.response[QuestionType.Smiley];
          score = (val !== undefined ? smileyMap[val] : undefined) ?? null;
        } else {
          const val = Number(r.response);
          score = smileyMap2[val] ?? null;
        }
      }

      if (questionType === QuestionType.LD) {
        if (version) {
          const val = r.response[QuestionType.LD];
          if (val === "Like") score = 10;
          else if (val === "Dislike") score = 0;
        } else {
          const val = Number(r.response);
          score = likeDislikeAndYNMap[val] ?? null;
        }
      }

      if (questionType === QuestionType.YN) {
        if (version) {
          const val = r.response[QuestionType.YN];
          if (val === "Yes") score = 10;
          else if (val === "No") score = 0;
        } else {
          const val = Number(r.response);
          score = likeDislikeAndYNMap[val] ?? null;
        }
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
  const promoterPercentage = npsCount > 0 ? Math.round((promoters / npsCount) * 100) : null;
  const passivePercentage = npsCount > 0 ? Math.round((passives / npsCount) * 100) : null;
  const detractorPercentage = npsCount > 0 ? Math.round((detractors / npsCount) * 100) : null;
  const happinessIndex =
    totalCount > 0 ? Math.round((scoreSum / (totalCount * maxScore)) * 100) : null;
  const veryHappyPercentage = totalCount > 0 ? +((veryHappy / totalCount) * 100).toFixed(2) : null;
  const happyPercentage = totalCount > 0 ? +((happy / totalCount) * 100).toFixed(2) : null;
  const neutralPercentage = totalCount > 0 ? +((neutral / totalCount) * 100).toFixed(2) : null;
  const sadPercentage = totalCount > 0 ? +((sad / totalCount) * 100).toFixed(2) : null;
  const verySadPercentage = totalCount > 0 ? +((verySad / totalCount) * 100).toFixed(2) : null;

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

export async function getSurveyResponseByIp(surveyTeamMapId: string, ip: string) {
  return await prisma.surveyResponse.findFirst({
    where: {
      surveyTeamMapId,
      ip,
    },
  });
}
