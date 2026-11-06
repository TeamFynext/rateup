import dayjs from "dayjs";

import type { Integration } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { PageType, QuestionType, WaQuestions } from "../../../types/enums.js";
import { getContent } from "../../../utils/survey/response.data.js";
import {
  getAnswerValue,
  getCellData,
  getFormattedResponse,
  markdownToPlainText,
  toCell,
} from "../../response/response.service.js";
import { getFlowBySurveyId } from "../../whatsapp/flows/flow.service.js";
import { googleClientFor } from "./googlesheet.auth.js";

/**
 * One row handed to google-spreadsheet's addRow/addRows, keyed by column header.
 * The library writes each value into a cell, so only cell-shaped scalars belong here.
 */
export type SheetRow = Record<string, string | number | boolean | Date>;

type SurveyFlow = Awaited<ReturnType<typeof getFlowBySurveyId>>;

/** The tab a WhatsApp Flow (version 2) survey's responses go in, whatever their language. */
export const FLOW_SHEET_TITLE = "en";

const isSkipped = (q: Question) =>
  [QuestionType.InfoMessage, ...Object.values(PageType)].includes(q.type);

/** A question's column title in one language: its 1-based position and its text. */
function questionColumnTitle(q: Question, index: number, lang: string) {
  const qsTitle = q?.title[lang] || q?.description[lang] || q?.label?.[lang] || "";
  return index + 1 + "_" + getContent(qsTitle)?.trim();
}

/** The header of one language's tab, for a survey built in the RateUp editor. */
export function surveyHeaderRow(questions: Question[], lang: string): string[] {
  const questionTitles: string[] = [];
  questions.forEach((q, index) => {
    if (isSkipped(q)) return;
    const qstnTitle = questionColumnTitle(q, index, lang);
    if ([QuestionType.Contact, QuestionType.Email, QuestionType.Phone].includes(q.type))
      Object.entries(q.features?.[lang] ?? {}).forEach(([key, value]) => {
        if (
          typeof value === "object" &&
          value !== null &&
          "isEnabled" in value &&
          (value as { isEnabled: boolean }).isEnabled
        )
          questionTitles.push((qstnTitle + ":" + key).trim());
      });
    else if (q.type === QuestionType.Testimonial) {
      questionTitles.push((qstnTitle + ":name").trim());
      questionTitles.push((qstnTitle + ":testimonial").trim());
      Object.entries(q.features?.[lang] ?? {}).forEach(([key, value]) => {
        if (value) questionTitles.push((qstnTitle + ":" + key).trim());
      });
    } else if (q.type === QuestionType.MCQGrid) {
      const subQs: string[] | undefined = q.features?.[lang]?.questions;
      subQs?.forEach((qstn) => questionTitles.push((qstnTitle + ":" + qstn).trim()));
    } else if (q.type === QuestionType.MultiTextInput) {
      const fields: { fieldKey?: string }[] | undefined = q.features?.[lang]?.fields;
      fields?.forEach((field) => questionTitles.push((qstnTitle + ":" + field?.fieldKey).trim()));
    } else questionTitles.push(qstnTitle);
  });
  return ["Created At", ...questionTitles, "Team", "Respondent's Mobile Number", "Tags"];
}

export const CREATED_AT = "Created At";
export const RESPONDENT = "Respondent's Mobile Number";
export const TAG = "Tag";
export const TEAM = "Team";

/**
 * The columns of a WhatsApp Flow (version 2) survey's tab: the flow's inputs
 * between the fixed created-at and respondent/tag/team columns. `columns` holds
 * each input itself, for reading its answers; `header` its title.
 */
export function flowColumns(flow: SurveyFlow) {
  const inputs = (flow?.json?.screens?.flatMap((screen) =>
    screen?.layout?.children?.filter((child) => child?.type !== "Footer" && child.name),
  ) ?? []) as Array<WaFlowForm | string>;
  const columns: Array<WaFlowForm | string> = [CREATED_AT, ...inputs, RESPONDENT, TAG, TEAM];
  const header = columns.map((question) =>
    typeof question === "string"
      ? question
      : markdownToPlainText(question?.header || question?.label || ""),
  );
  return { header, columns };
}

/** True for a survey answered through a WhatsApp Flow (version 2), whose columns come from the flow. */
export const isFlowSurvey = (flow: SurveyFlow) => (flow ? flow.version !== 1 : false);

/**
 * Adds one response to its survey's spreadsheet, as the last row of its
 * language's tab — or of the flow's single tab. Does nothing for a survey that
 * has never been synced: the full sync is what creates the spreadsheet.
 *
 * A tab the spreadsheet does not have yet is created with its header, so a
 * response in a language nobody has synced is not lost.
 */
export async function appendResponseToSheet(
  integration: Pick<Integration, "credential">,
  responseId: string,
): Promise<"no_sheet" | "appended"> {
  const response = await prisma.surveyResponse.findUnique({
    where: { id: responseId },
    select: {
      responses: true,
      language: true,
      createdAt: true,
      tag: true,
      Contact: { select: { phone: true } },
      surveyTeamMap: {
        select: {
          survey: { select: { spreadSheetId: true, questions: true, id: true } },
          team: { select: { name: true, orgId: true } },
        },
      },
    },
  });
  const spreadSheetId = response?.surveyTeamMap.survey.spreadSheetId;
  if (!response || !spreadSheetId) return "no_sheet";

  const {
    survey: { id: surveyId },
    team,
  } = response.surveyTeamMap;
  const questions = response.surveyTeamMap.survey.questions as unknown as Question[];
  const answers = response.responses as unknown as QuestionResponse[];
  const language = response.language;

  const { GoogleSpreadsheet } = await import("google-spreadsheet");
  const doc = new GoogleSpreadsheet(spreadSheetId, googleClientFor(integration.credential));
  await doc.loadInfo();

  const flow = await getFlowBySurveyId(surveyId, team.orgId);
  const fromFlow = isFlowSurvey(flow);
  const flowInputs = flowColumns(flow).columns.filter(
    (column): column is WaFlowForm => typeof column !== "string",
  ) as unknown as Question2[];

  const resObj: SheetRow = {
    Team: team.name,
    team: team.name, // for old synced response
  };
  resObj["Created At"] = dayjs(response.createdAt).format("DD-MM-YYYY HH:mm");

  answers.forEach((res) => {
    if (!fromFlow) {
      const index = questions.findIndex((q) => q.id === res.questionId);
      const qstn = questions[index];
      if (!qstn) return;
      const qstnTitle = questionColumnTitle(qstn, index, language).trim();
      const answerValue = getAnswerValue(res.response, res.type);
      if ([QuestionType.Contact, QuestionType.Email, QuestionType.Phone].includes(qstn.type))
        Object.entries(answerValue as Record<string, unknown>).forEach(
          ([key, value]) => (resObj[(qstnTitle + ":" + key).trim()] = toCell(value)),
        );
      else if (qstn.type === QuestionType.Testimonial)
        Object.entries(answerValue as Record<string, unknown>).forEach(
          ([key, value]) =>
            (resObj[(qstnTitle + ":" + key).trim()] =
              key == "photo"
                ? `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${value}`
                : toCell(value)),
        );
      else if (qstn.type === QuestionType.MCQGrid)
        Object.entries(answerValue as Record<string, Choice>).forEach(
          ([key, value]) => (resObj[(qstnTitle + ":" + key).trim()] = value?.value),
        );
      else if (qstn.type === QuestionType.MultiTextInput)
        Object.entries(answerValue as Record<string, unknown>).forEach(
          ([key, value]) => (resObj[(qstnTitle + ":" + key).trim()] = toCell(value)),
        );
      else resObj[qstnTitle] = getFormattedResponse(answerValue, qstn, language);
    } else {
      const question = flowInputs.find((q) => q.id === res.questionId);
      const qstnTitle = markdownToPlainText(question?.header || question?.label || "");
      resObj[qstnTitle] = getCellData(
        res.response,
        question as { type?: QuestionType; metaType?: WaQuestions },
      );
    }
  });
  resObj["Respondent's Mobile Number"] = toCell(response.Contact?.phone);
  resObj["Tag"] = toCell(response.tag);
  resObj["tag"] = toCell(response.tag); // for old synced response

  const title = fromFlow ? FLOW_SHEET_TITLE : language;
  const header = fromFlow ? flowColumns(flow).header : surveyHeaderRow(questions, language);
  const sheet =
    doc.sheetsByTitle[title] ??
    (await doc.addSheet({
      title,
      headerValues: header,
      gridProperties: header.length > 26 ? { columnCount: header.length } : undefined,
    }));
  await sheet.addRow(resObj);
  return "appended";
}
