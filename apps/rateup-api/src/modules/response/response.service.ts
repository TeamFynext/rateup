import { generateAnswerHtml } from "../../utils/email/emailTemplateGenerateFunction";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail";
import { createEmailBodySurveyResponse } from "../../utils/email/supertoken/surveyResponseEmail";
import prisma from "../../utils/prisma";
import {
  generateResponseData,
  getContent,
  getReplacedTitleFromVariable,
} from "../../utils/survey/response.data";
import { CreateResponseInput, GenerateBodyInput } from "./response.schema";
import {
  ChoiceTypeQuestions,
  IntegratedApps,
  QuestionType,
  ResponseSummaryType,
  SubscriptionFeaturePathName,
  WaQuestions,
} from "../../types/enums";
import dayjs from "dayjs";
import { saveSheetIdToSurvey } from "../survey/survey.service";
import { google } from "googleapis";
import xlsx from "node-xlsx";
import { autoGenerateTicket } from "../ticket/ticket.service";
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
import { UpdateQuestionInput } from "../question/question.schema";
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
  LDResponseMap,
  RatingScaleMap,
  SmileyResponseMap,
  YNResponseMap,
} from "../../utils/enumMap";
import { getFlowBySurveyId } from "../whatsapp/flows/flow.service";

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
) {
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
                teamId: surveyTeamMap.teamId,
              }))
          : responses.map(({ surveyTeamMap, ...restD }) => ({
              ...restD,
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
    if (visibleColumn.includes("createdAt")) {
      headerArray.unshift(createdAt);
      filteredSecondArray.unshift(createdAt);
    }
    if (
      platform === "WHATSAPP" &&
      visibleColumn.includes(whatsappRespondentNumber)
    ) {
      headerArray.push(whatsappRespondentNumber);
      filteredSecondArray.push(whatsappRespondentNumber);
    }
    //TODO REMOVE LATER: MYG GIFT VISHU
    if (process.env.VISHU_SURVEY === surveyId) {
      headerArray.push("Gift won");
      filteredSecondArray.push({ id: "win_item", type: QuestionType.WinItem });
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

        const responses = response.responses;
        const responseObj = responses.find(
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
            case QuestionType.WinItem:
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
            Object.values(responseValue)?.map((value) =>
              bodyArray[answerIndex].push(value),
            );
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
                ? Object.values(responseValue?.value).join(", ")
                : Object.values(responseValue).join(", ");
            }
          }
        } else if (question === createdAt) {
          const createdAtFormatted = dayjs(response.createdAt)
            .tz(tz)
            .format("DD-MM-YYYY hh:mm A");
          responseValue = createdAtFormatted;
        } else if (question === "Respondent's Mobile Number") {
          responseValue = response?.Contact?.phone;
        } else if (question === responseTag) {
          responseValue = response.tag;
        } else {
          if (question.type === QuestionType.MCQGrid) {
            question?.features?.[defaultLanguage]?.questions?.map((q) =>
              bodyArray[answerIndex].push(""),
            );
            flag = false;
          } else if (question.type === QuestionType.Contact) {
            Object.values(question.features?.[defaultLanguage]).forEach(
              (key: any) => {
                if (key?.isEnabled) bodyArray[answerIndex].push("");
              },
            );
            flag = false;
          } else if (question.type === QuestionType.Testimonial) {
            bodyArray[answerIndex].push("", "");
            const features = question.features?.[defaultLanguage];
            if (features) {
              Object.values(features).forEach((key: any) => {
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
    let fileName = allResponses?.[0].survey?.title ?? "download";
    let buffer = xlsx.build([
      {
        name: "Sheet1",
        data: [headerArray, ...bodyArray],
        options: {
          "!cols": options,
        },
      },
    ]);

    return [fileName, buffer];
  }
}
export async function downloadExcelResponseV2(
  allResponses,
  questions,
  visibleColumn = [],
  tz = "Asia/Calcutta",
) {
  const responses =
    (allResponses && allResponses?.flatMap((data) => data?.responses)) || [];

  const filteredSecondArray = questions.filter((item) =>
    visibleColumn.includes(item?.label || ""),
  );

  if (filteredSecondArray && responses) {
    const headerArray = filteredSecondArray.map((question) =>
      markdownToPlainText(question?.header || question?.label || ""),
    );
    const createdAt = "Date";
    const responseTag = "tag";
    let whatsappRespondentNumber = "Respondent Mobile";
    if (visibleColumn.includes("createdAt")) {
      headerArray.unshift(createdAt);
      filteredSecondArray.unshift(createdAt);
    }
    if (visibleColumn.includes(whatsappRespondentNumber)) {
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
      responses.forEach((response, answerIndex) => {
        bodyArray.push([]);
        const responses = response.responses;
        const responseObj = responses.find(
          (answerObj) => answerObj.questionId === questionId,
        );
        let responseValue;

        if (responseObj) {
          responseValue = getCellData(responseObj.response, question);
        } else if (question === createdAt) {
          const createdAtFormatted = dayjs(response.createdAt)
            .tz(tz)
            .format("DD-MM-YYYY hh:mm A");
          responseValue = createdAtFormatted;
        } else if (question === "Respondent Mobile") {
          responseValue = response?.Contact?.phone;
        } else if (question === responseTag) {
          responseValue = response.tag;
        } else {
          responseValue = "";
        }
        bodyArray[answerIndex].push(responseValue);
      });
    });
    let options = [];
    headerArray.map((data, i) => {
      const headingWidth = String(data)?.length + 2;
      const dataWidth = getMaxContentWidth(bodyArray, i);
      const width = Math.max(headingWidth, dataWidth);
      options.push({ width: width > 40 ? 40 : width });
    });
    let fileName = allResponses?.[0].survey?.title ?? "download";
    let buffer = xlsx.build([
      {
        name: "Sheet1",
        data: [headerArray, ...bodyArray],
        options: {
          "!cols": options,
        },
      },
    ]);

    return [fileName, buffer];
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

  if (shouldRaiseTicket && input?.responses?.length > 0) {
    //generate ticket
    let generatedTicket = await autoGenerateTicket(
      surveyResponse?.surveyTeamMap?.teamId,
      surveyResponse.id,
    );
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

export async function syncResponseToGoogleSheet(surveyId: string, orgId) {
  const { GoogleSpreadsheet } = await import("google-spreadsheet");
  const survey = await prisma.survey.findUnique({
    where: {
      id: surveyId,
    },
    select: {
      spreadSheetId: true,
      teams: {
        select: {
          team: {
            select: {
              id: true,
            },
          },
        },
      },
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
  const token = tokenFromIntgration;
  authClient.credentials.refresh_token = token.credential?.refreshToken;
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
      // Move the file to the new folder
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
  const allResponses = await getAllResponses(surveyId);
  let flow = await getFlowBySurveyId(surveyId);
  const filteredSecondArray = flow?.json?.screens?.flatMap((screen) =>
    screen?.layout?.children?.filter(
      (child) => child?.type !== "Footer" && child.name,
    ),
  ) as any[];
  const checkVersion = flow.version === 1;

  if (checkVersion) {
    const languages = survey?.languages;
    let questions = survey?.questions as unknown as Array<Question>;
    questions = questions.filter((q) => q.type !== QuestionType.InfoMessage);
    //TODO REMOVE LATER: MYG GIFT VISHU
    if (process.env.VISHU_SURVEY === surveyId) {
      questions.push({
        id: "win_item",
        type: QuestionType.WinItem,
        title: { English: "Gift won" },
        description: {},
        required: true,
      });
    }
    const formattedResByTeam = allResponses.map((res) => ({
      team: res.team.name,
      responses: res.responses,
    }));
    const languageWiseResponse = {};
    languages.map((lang) => {
      const teamAndResponse = [];
      formattedResByTeam.map((teamRes) => {
        const langRes = teamRes?.responses.filter(
          (res) => res.language === lang,
        );
        teamAndResponse.push({
          team: teamRes.team,
          teamWiseResponses: langRes
            .map((res) => ({
              createdAt: res.createdAt,
              responses: res.responses,
              respondentPhone: res?.Contact?.phone,
              tag: res?.tag,
            }))
            .sort((a, b) => dayjs(a.createdAt).diff(dayjs(b.createdAt))),
        });
      });
      languageWiseResponse[lang] = teamAndResponse;
    });
    for (const lang of languages) {
      let questionTitles = [];
      questions.map((q: Question, index: number) => {
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
            value?.isEnabled
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

      const totalColumnCount = questionTitles.length + 3;
      const sheet =
        (await doc.sheetsByTitle[lang]) ??
        (await doc.addSheet({
          title: lang,
          headerValues: [
            "Created At",
            ...questionTitles,
            "team",
            "Respondent's Mobile Number",
            "tag",
          ],
          gridProperties:
            totalColumnCount > 26
              ? {
                  columnCount: totalColumnCount,
                }
              : undefined,
        }));
      const initialRowCount = await sheet.rowCount;
      if (totalColumnCount > sheet.columnCount)
        await sheet.resize({
          columnCount: totalColumnCount,
          rowCount: initialRowCount,
        });
      await sheet.setHeaderRow([
        "Created At",
        ...questionTitles,
        "team",
        "Respondent's Mobile Number",
        "tag",
      ]);
      await sheet.loadCells();
      const columnCount = await sheet.columnCount;
      for (var i = 0; i < columnCount; i++) {
        sheet.getCell(0, i).textFormat = { bold: true };
      }
      await sheet.saveUpdatedCells();
      await sheet.clearRows();
      const responseForSheet = [];
      for (const langRes of languageWiseResponse[lang]) {
        langRes.teamWiseResponses.map((response) => {
          const resObj = { team: langRes.team };
          resObj["Created At"] = dayjs(response.createdAt).format(
            "DD-MM-YYYY hh:mm A",
          );
          response.responses.map((res: QuestionResponse) => {
            let QIndex;
            let qstn = questions.find((q: Question, index: number) => {
              if (q.id === res.questionId) {
                QIndex = index + 1;
                return q;
              }
            });
            if (qstn) {
              let qsTitle =
                qstn?.title[lang] ||
                qstn?.description[lang] ||
                qstn?.label?.[lang] ||
                "";
              let qstnTitle = QIndex + "_" + getContent(qsTitle)?.trim();
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
                  lang,
                );
            }
          });
          resObj["Respondent's Mobile Number"] = response?.respondentPhone;
          resObj["tag"] = response?.tag;
          responseForSheet.push(resObj);
        });
      }

      await sheet.addRows(responseForSheet);
      const dateColumnIndex = sheet.headerValues.indexOf("Created At");
      await sheet.loadCells();
      for (var i = 0; i <= responseForSheet.length; i++) {
        sheet.getCell(i, dateColumnIndex).numberFormat = {
          type: "DATE",
          pattern: 'dd-mm-yyyy hh:mm A/P"M"',
        };
      }
      await sheet.saveUpdatedCells();
    }
  } else {
    const responses =
      (allResponses && allResponses?.flatMap((data) => data?.responses)) || [];

    if (filteredSecondArray && responses) {
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

      const bodyArray: string[][] = [];
      responses.forEach((response, answerIndex) => {
        bodyArray.push([]);
        filteredSecondArray.forEach((question) => {
          const questionId = question.id;
          const responseObj = response.responses.find(
            (answerObj) => answerObj.questionId === questionId,
          );
          let responseValue: string;
          if (responseObj) {
            responseValue = getCellData(responseObj.response, question);
          } else if (question === createdAt) {
            const createdAtFormatted = dayjs(response.createdAt).format(
              "DD-MM-YYYY hh:mm A",
            );
            responseValue = createdAtFormatted;
          } else if (question === whatsappRespondentNumber) {
            responseValue = response?.Contact?.phone || "";
          } else if (question === responseTag) {
            responseValue = response.tag || "";
          } else if (question === teamTag) {
            responseValue = survey.teams.map((t) => t.team.id).join("\n") || "";
          } else {
            responseValue = "";
          }
          bodyArray[answerIndex].push(responseValue);
        });
      });

      const totalColumnCount = filteredSecondArray.length;
      let lang = "en";
      const sheet =
        (await doc.sheetsByTitle[lang]) ??
        (await doc.addSheet({
          title: lang,
          headerValues: headerArray,
          gridProperties:
            totalColumnCount > 26
              ? {
                  columnCount: totalColumnCount,
                }
              : undefined,
        }));
      const initialRowCount = await sheet.rowCount;
      if (totalColumnCount > sheet.columnCount)
        await sheet.resize({
          columnCount: totalColumnCount,
          rowCount: initialRowCount,
        });
      await sheet.setHeaderRow(headerArray);
      await sheet.loadCells();
      const columnCount = await sheet.columnCount;
      for (var i = 0; i < columnCount; i++) {
        sheet.getCell(0, i).textFormat = { bold: true };
      }
      await sheet.saveUpdatedCells();
      await sheet.clearRows();
      await sheet.addRows(bodyArray);
      await sheet.saveUpdatedCells();
    }
  }
  const sheetToRemove = await doc.sheetsByTitle["Sheet1"];
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
    //TODO REMOVE LATER: MYG GIFT VISHU
    if (process.env.VISHU_SURVEY === surveyId) {
      questions.push({
        id: "win_item",
        type: QuestionType.WinItem,
        title: { English: "Gift won" },
        description: {},
        required: true,
      });
    }
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
      const resObj = { team: team.name };
      resObj["Created At"] = dayjs(response.createdAt).format(
        "DD-MM-YYYY hh:mm A",
      );
      let flow = await getFlowBySurveyId(surveyId);
      const filteredSecondArray = flow?.json?.screens?.flatMap((screen) =>
        screen?.layout?.children?.filter(
          (child) => child?.type !== "Footer" && child.name,
        ),
      ) as unknown as Question2[];
      const checkVersion = flow.version === 1;
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
      const newRow = await sheet.addRow(resObj);
      const dateColumnIndex = sheet.headerValues.indexOf("Created At");
      await sheet.loadCells();
      sheet.getCell(newRow.rowNumber - 1, dateColumnIndex).numberFormat = {
        type: "DATE",
        pattern: 'dd-mm-yyyy hh:mm A/P"M"',
      };
      await sheet.saveUpdatedCells();
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

export async function getResponseSummary(
  surveyId: string,
  request: FastifyRequest,
  allowedTokens,
  type: ResponseSummaryType,
  questionId: string,
  teamId?: string,
) {
  const allResponses = await getAllResponses(surveyId);
  const questions = await getQuestionsBySurveyId(surveyId);
  const question = questions.find((q) => q.id === questionId);
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
  if (type === ResponseSummaryType.All) {
    existingSummary = question.responseSummary?.all;
  } else if (type === ResponseSummaryType.Team) {
    if (!teamId) throw new Error("TeamId not found");
    filteredResponses = questionResponses.filter((r) => r.teamId === teamId);
    existingSummary = question.responseSummary?.team?.find(
      (t) => t.teamId === teamId,
    );
  }
  const responseIds = filteredResponses.map((r) => r.responseId);
  const responsesNotSummarised = existingSummary
    ? filteredResponses.filter(
        (r) => !existingSummary.responseIds.includes(r.responseId),
      )
    : filteredResponses;
  if (!responsesNotSummarised.length) return;
  const responseTexts = responsesNotSummarised.map(
    (r) => r.response.response[r.response.type],
  );
  if (existingSummary) responseTexts.push(existingSummary.summary);
  const res = await getTextSummaryByAI(responseTexts, request, allowedTokens);
  if (!res) throw new Error("Unable to get Summary");
  let updateData = null;
  if (type === ResponseSummaryType.All) {
    updateData = {
      responseSummary: {
        ...question.responseSummary,
        all: {
          summary: res.summary,
          responseIds,
        },
      },
    };
  } else if (type === ResponseSummaryType.Team) {
    let updatedTeamSummary = question.responseSummary?.team ?? [];
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
      responseSummary: {
        ...question.responseSummary,
        team: updatedTeamSummary,
      },
    };
  }
  if (updateData && res.tokenUsage)
    await Promise.all([
      updateQuestion(
        surveyId,
        questionId,
        updateData as unknown as UpdateQuestionInput,
      ),
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
