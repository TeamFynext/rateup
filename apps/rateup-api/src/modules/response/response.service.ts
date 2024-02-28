import { GoogleSpreadsheet } from "google-spreadsheet";
import { generateAnswerHtml } from "../../utils/email/emailTemplateGenerateFunction";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail";
import { createEmailBodySurveyResponse } from "../../utils/email/supertoken/surveyResponseEmail";
import prisma from "../../utils/prisma";
import { generateResponseData } from "../../utils/survey/response.data";
import { getAccessToken, initializeAuthClient } from "../org/org.services";
import { CreateResponseInput, GenerateBodyInput } from "./response.schema";
import { QuestionType } from "../../types/enums";
import dayjs from "dayjs";
import { saveSheetIdToSurvey } from "../survey/survey.service";
import { google } from "googleapis";

export async function getResponses(surveyTeamMapId: string) {
  const responses = await prisma.surveyResponse.findMany({
    where: {
      surveyTeamMapId,
    },
  });
  return responses;
}

export async function getAllResponses(
  surveyId: string,
  teamIds: Array<string>,
) {
  const responses = await prisma.surveyTeamMap.findMany({
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
        },
      },
    },
  });
  return responses;
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

export async function createResponse(input: CreateResponseInput) {
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
        },
      },
    },
  });

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
    },
  });
  const { survey } = response ?? {};

  if (survey?.enableNotificationEmail && survey.notificationEmail) {
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
    },
  });
  const authClient = await initializeAuthClient();
  const token = await getAccessToken(orgId);
  authClient.credentials.refresh_token = token.refreshToken;
  let doc;
  if (!survey.spreadSheetId) {
    doc = await GoogleSpreadsheet.createNewSpreadsheetDocument(authClient, {
      title: survey.title,
    });
    const driveFolderId = await getDriveFolderId(orgId, authClient);
    const drive = google.drive({ version: "v3", auth: authClient });
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
    await saveSheetIdToSurvey(doc.spreadsheetId, surveyId);
  } else {
    doc = new GoogleSpreadsheet(survey.spreadSheetId, authClient);
  }
  await doc.loadInfo();
  const languages = survey?.languages;
  const questions = survey?.questions as unknown as Array<Question>;
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
        teamWiseResponses: langRes.map((res) => ({
          createdAt: new Date(res.createdAt).toLocaleString(),
          responses: res.responses,
        })),
      });
    });
    languageWiseResponse[lang] = teamAndResponse;
  });
  for (const lang of languages) {
    let questionTitles = [];
    questions.map((q: Question, index: number) => {
      const qstnTitle =
        index + 1 + "_" + q?.title[lang].trim() ||
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
    let sheet = await doc.sheetsByTitle[lang];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: lang,
        headerValues: ["Date", ...questionTitles, "team"],
      });
    }
    await sheet.setHeaderRow(["Date", ...questionTitles, "team"]);
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
        resObj["Date"] = response.createdAt;
        response.responses.map((res: QuestionResponse) => {
          let QIndex;
          let qstn = questions.find((q: Question, index: number) => {
            if (q.id === res.questionId) {
              QIndex = index + 1;
              return q;
            }
          });
          let qstnTitle = QIndex + "_" + qstn.title[lang].trim();
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
              res.type,
            );
        });
        responseForSheet.push(resObj);
      });
    }
    await sheet.addRows(responseForSheet);
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
    const fileMetadata = {
      name: "RateUp",
      mimeType: "application/vnd.google-apps.folder",
    };
    const drive = google.drive({ version: "v3", auth: authClient });
    const file = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });
    driveFolderId = file.data.id;
    await prisma.org.update({
      where: {
        id: orgId,
      },
      data: {
        driveFolderId: file.data.id,
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
  const {
    survey: { spreadSheetId, questions },
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
    const token = await getAccessToken(team.orgId);
    authClient.credentials.refresh_token = token.refreshToken;
    const doc = new GoogleSpreadsheet(spreadSheetId, authClient);
    await doc.loadInfo();
    let sheet = await doc.sheetsByTitle[response.language];
    const resObj = { team: team.name };
    resObj["Date"] = new Date(response.createdAt).toLocaleString();
    response.responses.map((res: QuestionResponse) => {
      let QIndex;
      let qstn = questions.find((q: Question, index: number) => {
        if (q.id === res.questionId) {
          QIndex = index + 1;
          return q;
        }
      });
      let qstnTitle = QIndex + "_" + qstn.title[response.language].trim();
      if (
        [QuestionType.Contact, QuestionType.Email, QuestionType.Phone].includes(
          qstn.type,
        )
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
        resObj[QIndex + "_" + qstn.title[response.language].trim()] =
          getFormattedResponse(res.response[res.type], res.type);
    });
    sheet.addRow(resObj);
  }
  return spreadSheetId;
}

export function getFormattedResponse(response, type) {
  let formattedResponse = "";
  switch (type) {
    case QuestionType.CustomNPS:
    case QuestionType.MCQ:
    case QuestionType.DDSS:
      formattedResponse = response.value.trim();
      break;
    case QuestionType.DDMS:
    case QuestionType.MSQ:
      formattedResponse = response
        .map((item) => item?.value?.trim())
        .join(", ");
      break;
    case QuestionType.DateTime:
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
