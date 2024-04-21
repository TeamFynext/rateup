import { GoogleSpreadsheet } from "google-spreadsheet";
import { generateAnswerHtml } from "../../utils/email/emailTemplateGenerateFunction";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail";
import { createEmailBodySurveyResponse } from "../../utils/email/supertoken/surveyResponseEmail";
import prisma from "../../utils/prisma";
import {
  extractText,
  generateResponseData,
  isHtml,
} from "../../utils/survey/response.data";
import { getAccessToken, initializeAuthClient } from "../org/org.services";
import { CreateResponseInput, GenerateBodyInput } from "./response.schema";
import {
  ChoiceTypeQuestions,
  QuestionType,
  SubscriptionFeaturePathName,
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
  teamIds: Array<string>,
) {
  const responsesQuery = await prisma.surveyTeamMap.findMany({
    where: {
      surveyId: surveyId,
      teamId: {
        in: teamIds,
      },
    },
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
        },
      },
      responses: {
        select: {
          id: true,
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
      responses: responses.map(({ surveyTeamMap, ...restD }) => ({
        ...restD,
        teamId: surveyTeamMap.teamId,
      })),
    };
  });

  return responseData;
}
const getContent = (title: string) => {
  if (isHtml(title)) return extractText(title);
  else return title;
};

export async function downloadExcelResponse(
  surveyId,
  allResponses,
  questions,
  defaultLanguage,
  visibleColumn = [],
  tz = "Asia/Calcutta",
) {
  const responses = allResponses && allResponses[0].responses;
  const platform = responses?.[0]?.platform;

  const filteredSecondArray = questions.filter((item) =>
    visibleColumn.includes(item.title[defaultLanguage]),
  );
  if (filteredSecondArray && responses) {
    const headerArray = filteredSecondArray.flatMap((question) =>
      question.type === QuestionType.Contact
        ? Object.entries(question.features?.[defaultLanguage])
            ?.filter((data: any) => data[1].isEnabled)
            .map(
              (data) =>
                `${getContent(question.title[defaultLanguage])}: ${data[0]}`,
            ) ?? []
        : [getContent(question.title[defaultLanguage])],
    );
    const createdAt = "Date";
    if (visibleColumn.includes("createdAt")) {
      headerArray.unshift(createdAt);
      filteredSecondArray.unshift(createdAt);
    }
    if (platform === "WHATSAPP") {
      headerArray.push("Respondent's Mobile Number");
      filteredSecondArray.push("Respondent's Mobile Number");
    }
    //TODO REMOVE LATER: MYG GIFT VISHU
    if (process.env.VISHU_SURVEY === surveyId) {
      headerArray.push("Gift won");
      filteredSecondArray.push({ id: "win_item", type: QuestionType.WinItem });
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
            case QuestionType.Photo: {
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
        } else {
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

  const surveyResponse = await prisma.surveyResponse.create({
    data: {
      ...input,
      tag: input.tag,
      surveyTeamMapId: input.surveyTeamMapId,
      language: input.language,
      responses: input.responses as QuestionResponse[],
      encryptedResponses: input.encryptedResponses,
    },
    include: {
      surveyTeamMap: {
        include: {
          survey: {
            select: {
              questions: true,
            },
          },
          team: {
            select: {
              orgId: true,
            },
          },
        },
      },
    },
  });

  surveyResponse &&
    updateMonthlyStat("survey", surveyResponse?.surveyTeamMap?.team.orgId);

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
  const token = await getAccessToken(orgId);
  authClient.credentials.refresh_token = token.refreshToken;
  let doc = survey.spreadSheetId
    ? new GoogleSpreadsheet(survey.spreadSheetId, authClient)
    : null;
  if (!survey.spreadSheetId) {
    const driveFolderId = await getDriveFolderId(orgId, authClient);
    const drive = google.drive({ version: "v3", auth: authClient });
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
  const allResponses = await getAllResponses(
    surveyId,
    survey.teams.map((t) => t.team.id),
  );
  const formattedResByTeam = allResponses.map((res) => ({
    team: res.team.name,
    responses: res.responses,
  }));
  const languageWiseResponse = {};
  languages.map((lang) => {
    const teamAndResponse = [];
    formattedResByTeam.map((teamRes) => {
      const langRes = teamRes?.responses.filter((res) => res.language === lang);
      teamAndResponse.push({
        team: teamRes.team,
        teamWiseResponses: langRes
          .map((res) => ({
            createdAt: res.createdAt,
            responses: res.responses,
          }))
          .sort((a, b) => dayjs(a.createdAt).diff(dayjs(b.createdAt))),
      });
    });
    languageWiseResponse[lang] = teamAndResponse;
  });
  for (const lang of languages) {
    let questionTitles = [];
    questions.map((q: Question, index: number) => {
      const qstnTitle =
        index + 1 + "_" + getContent(q?.title[lang])?.trim() ||
        index + 1 + "_" + q?.description[lang].trim();
      if (
        [QuestionType.Contact, QuestionType.Email, QuestionType.Phone].includes(
          q.type,
        )
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
      } else questionTitles.push(qstnTitle);
    });

    const sheet =
      (await doc.sheetsByTitle[lang]) ??
      (await doc.addSheet({
        title: lang,
        headerValues: ["Created At", ...questionTitles, "team"],
      }));
    await sheet.setHeaderRow(["Created At", ...questionTitles, "team"]);
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
          let qstnTitle = QIndex + "_" + getContent(qstn.title[lang])?.trim();
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
          else
            resObj[qstnTitle] = getFormattedResponse(
              res.response[res.type],
              qstn,
              lang,
            );
        });
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
  const sheetToRemove = await doc.sheetsByTitle["Sheet1"];
  if (sheetToRemove) sheetToRemove.delete();
  return survey;
}

export async function getDriveFolderId(orgId: string, authClient) {
  let { driveFolderId } = await prisma.org.findUnique({
    where: {
      id: orgId,
    },
    select: {
      driveFolderId: true,
    },
  });
  if (!driveFolderId) {
    const folderName = "RateUp";
    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    };
    const drive = google.drive({ version: "v3", auth: authClient });
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
    await prisma.org.update({
      where: {
        id: orgId,
      },
      data: {
        driveFolderId,
      },
    });
  }
  return driveFolderId;
}
interface IsheetResponse {
  surveyTeamMapId: string;
  responses: QuestionResponse[];
  language: string;
  createdAt: Date;
}
export async function saveResponseToGoogleSheet(response: IsheetResponse) {
  try {
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
      const token = await getAccessToken(team.orgId);
      authClient.credentials.refresh_token = token.refreshToken;
      const doc = new GoogleSpreadsheet(spreadSheetId, authClient);
      await doc.loadInfo();
      let sheet = await doc.sheetsByTitle[response.language];
      const resObj = { team: team.name };
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
        let qstnTitle =
          QIndex + "_" + getContent(qstn.title[response.language]).trim();
        if (
          [
            QuestionType.Contact,
            QuestionType.Email,
            QuestionType.Phone,
          ].includes(qstn.type)
        )
          Object.entries(res.response[res.type]).map(
            ([key, value]) => (resObj[(qstnTitle + ":" + key).trim()] = value),
          );
        else if (qstn.type === QuestionType.Testimonial)
          Object.entries(res.response[res.type]).map(
            ([key, value]) =>
              (resObj[(qstnTitle + ":" + key).trim()] =
                key == "photo"
                  ? `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${value}`
                  : value),
          );
        else
          resObj[
            QIndex + "_" + getContent(qstn.title[response.language]).trim()
          ] = getFormattedResponse(
            res.response[res.type],
            qstn,
            response.language,
          );
      });
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
    case QuestionType.Address:
      formattedResponse = Object.entries(response)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(", ");
      break;
    case QuestionType.MCQ:
      formattedResponse =
        response?.value?.trim() ||
        `${qstn?.features?.[language]?.other
          ?.title}: ${response?.other?.trim()}`;
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
            `${qstn?.features?.[language]?.other
              ?.title}: ${item?.other?.trim()}`,
        )
        .join(", ");
      break;
    case QuestionType.Date:
      formattedResponse = dayjs(response).format("DD, MMM YYYY");
      break;
    case QuestionType.Photo:
      formattedResponse = `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${response}`;
      break;
    case QuestionType.PCQ:
      formattedResponse = response.value.value;
      break;
    case QuestionType.TnC:
      formattedResponse = response == true ? "accepted" : "Not accepted";
      break;
    default:
      formattedResponse = response;
  }
  return formattedResponse;
}
