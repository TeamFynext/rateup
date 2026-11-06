import dayjs from "dayjs";
import { google } from "googleapis";

import prisma from "../../../utils/prisma.js";
import { IntegratedApps, PageType, QuestionType, WaQuestions } from "../../../types/enums.js";
import { getContent } from "../../../utils/survey/response.data.js";
import { getIntegrationByName, updateIntegrationByName } from "../integrations.service.js";
import {
  getAnswerValue,
  getCellData,
  getFormattedResponse,
  toCell,
} from "../../response/response.service.js";
import { saveSheetIdToSurvey } from "../../survey/survey.service.js";
import { getFlowBySurveyId } from "../../whatsapp/flows/flow.service.js";
import { googleClientFor, readGoogleSheetCredential } from "./googlesheet.auth.js";
import {
  CREATED_AT,
  FLOW_SHEET_TITLE,
  flowColumns,
  isFlowSurvey,
  RESPONDENT,
  surveyHeaderRow,
  TAG,
  TEAM,
  type SheetRow,
} from "./googlesheet.rows.js";

type Drive = ReturnType<typeof google.drive>;

/**
 * Rewrites a survey's whole spreadsheet from its responses: one tab per
 * language, or one tab for a WhatsApp Flow survey. Creates the spreadsheet, in
 * a "RateUp" folder in the account's Drive, the first time; every response
 * after that is appended as it arrives (`appendResponseToSheet`).
 *
 * Runs inside the request of the Responses page's sync button.
 */
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
  const integration = await getIntegrationByName(orgId, IntegratedApps.googlesheet);
  const authClient = googleClientFor(integration?.credential);
  const drive = google.drive({ version: "v3", auth: authClient });
  const isDocExist = survey?.spreadSheetId
    ? await checkFileExistInDrive(survey?.spreadSheetId, drive)
    : false;
  let doc =
    isDocExist && survey.spreadSheetId
      ? new GoogleSpreadsheet(survey.spreadSheetId, authClient)
      : null;
  if (!doc) {
    const driveFolderId = await getDriveFolderId(orgId, drive, integration?.credential);
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
  const flow = await getFlowBySurveyId(surveyId, orgId);

  if (!isFlowSurvey(flow)) {
    const languages = survey?.languages;
    let questions = survey?.questions as unknown as Array<Question>;

    // For each language, process responses in batches
    for (const lang of languages) {
      const headerRow = surveyHeaderRow(questions, lang);
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
    const responsesCount = await prisma.surveyResponse.count({
      where: { surveyTeamMap: { surveyId } },
    });
    const { header: headerArray, columns } = flowColumns(flow);

    const totalColumnCount = columns.length;
    let sheet =
      doc.sheetsByTitle[FLOW_SHEET_TITLE] ??
      (await doc.addSheet({
        title: FLOW_SHEET_TITLE,
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
        columns.forEach((question) => {
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
          } else if (question === CREATED_AT) {
            const createdAtFormatted = dayjs(response.createdAt).format("DD-MM-YYYY HH:mm");
            responseValue = createdAtFormatted;
          } else if (question === RESPONDENT) {
            responseValue = response?.Contact?.phone || "";
          } else if (question === TAG) {
            responseValue = response.tag || "";
          } else if (question === TEAM) {
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

/** The "RateUp" folder in the account's Drive, found or made, and remembered on the credential. */
async function getDriveFolderId(orgId: string, drive: Drive, credential: unknown) {
  const stored = readGoogleSheetCredential(credential);
  let driveFolderId = stored?.driveFolderId;

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
      credential: { ...stored, driveFolderId },
    });
  }
  if (!driveFolderId) throw new Error("Could not resolve a Google Drive folder id");
  return driveFolderId;
}

async function checkFileExistInDrive(fileId: string, drive: Drive) {
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
