import { Survey, SurveyResponse, WaFlow } from "@prisma/client";
import { WaSendMessageBody } from "../../../types/whatsapp.types";
import {
  QuestionType as qt,
  SurveyType,
  WaFlowFormElementType,
} from "../../../types/enums";
import { CreateSurveyInput } from "../../survey/survey.schema";
import { CreateQuestionInput } from "../../question/question.schema";
import { ChoiceTypeQuestions } from "../../../utils/survey/question/question.utils";
import { createSurvey, getSurveyById } from "../../survey/survey.service";
import { createQuestion } from "../../question/question.service";
import prisma from "../../../utils/prisma";
import { CreateResponseInput } from "../../response/response.schema";
import { log } from "../../../utils/logger";

interface generateFlowMessageDataProps {
  to: string;
  flow_id: string;
  flow_cta: string;
  screen_id: string;
  body: string;
}
export function generateFlowMessageData({
  to,
  flow_id,
  flow_cta,
  screen_id,
  body,
}: generateFlowMessageDataProps): WaSendMessageBody {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "flow",
      body: {
        text: body,
      },
      action: {
        name: "flow",
        parameters: {
          flow_message_version: 3,
          flow_token: flow_id,
          flow_id,
          flow_cta,
          flow_action_payload: {
            screen: screen_id,
          },
        },
      },
    },
  };
}

interface generateSurveyMessageDataProps {
  flow: WaFlow;
  flowResponses: any;
  surveyTeamMapId: string;
}

/**
 * Generates a survey response from a flow response
 * @param param0
 * @returns
 *
 * flowMap must contain questionId for each formElement
 */
export function generateQuestionResponsesFromFlowResponse({
  flow,
  flowResponses,
}: generateSurveyMessageDataProps) {
  const flowMap = flow.map;

  log.trace(
    "Generating question-responses from flow response\nflowResopnse => %o\nflowMap",
    flowResponses,
    flowMap,
  );
  let responses = [];
  for (const [payloadName, value] of Object.entries(flowResponses)) {
    if (payloadName === "flow_token") continue;
    try {
      const elementName = findElementNameFromPayloadName(
        payloadName,
        flow.json as any,
      );

      const questionResponse: QuestionResponse = {
        questionId: flowMap[elementName].questionId,
        type: flowMap[elementName].type,
        response: {
          [flowMap[elementName].type]: parseFlowResponse({
            elementName,
            flowMap,
            flowJson: flow.json as any,
            response: value,
          }),
        },
      };

      responses.push(questionResponse);
    } catch (e) {
      log.error(
        "Error generating question response for payload %s\nvalue => %o",
        payloadName,
        value,
      );
      log.trace(
        `elementName => %s \n flowMap => %o\nflowResopnse => %o`,
        findElementNameFromPayloadName(payloadName, flow.json as any),
      );
      throw e;
    }
  }

  log.trace("Generated question-responses %o", responses);
  return responses;
}

// Form payload format
const r_formPayload = /\$\{form\.(.+)\}/; // ${form.MATCH_DATA}

interface parseFlowResponseProps {
  elementName: string;
  flowMap: any;
  flowJson: WaFlowJson;
  response: any;
}
export function parseFlowResponse({
  elementName,
  flowMap,
  flowJson,
  response,
}: parseFlowResponseProps) {
  const qType = flowMap[elementName].type;
  switch (qType) {
    case qt.Email:
      return { email: response };
    case qt.Text:
    case qt.TextArea:
    case qt.Number:
      return response;
    case qt.Phone:
      return { phone: response };
    case qt.DateTime:
      return new Date(parseInt(response));
    case qt.YN:
    case qt.LD:
    case qt.Smiley:
    case qt.Rating:
    case qt.Opinion:
      return flowMap[elementName][response.toString()];
    case qt.MCQ:
    case qt.DDSS: {
      const el = getElementJson(flowJson, elementName);
      const choice = el["data-source"].find((c) => c.id === response);
      return { value: choice.title } as Choice;
    }
    case qt.MSQ: {
      const el = getElementJson(flowJson, elementName);
      const choices = el["data-source"].filter((c) => response.includes(c.id));
      return choices.map((c) => ({ value: c.title }));
    }
    default:
      log.error(`Unhandled question type ${qType}`);
      return response;
  }
}

export function getElementJson(flowJson: WaFlowJson, elementName: string) {
  for (const formElement of waFlowFormElementIterator(flowJson, false)) {
    if (formElement.name === elementName) {
      return formElement;
    }
  }
}

export function findElementNameFromPayloadName(
  payloadName: string,
  flowJson: WaFlowJson,
) {
  for (const formElement of waFlowFormElementIterator(flowJson, false)) {
    if (formElement && formElement.type === WaFlowFormElementType.footer) {
      const { payload } = formElement["on-click-action"];

      if (payload[payloadName] && payload[payloadName].match(r_formPayload)) {
        const match = payload[payloadName].match(r_formPayload);

        return match[1];
      }
    }
  }
}

interface createSurveyFromFlowProps {
  flowJson: WaFlowJson;
  flowMap: any;
  userId: string;
  teamIds: string[];
}
export async function createSurveyFromFlow({
  flowJson,
  flowMap,
  userId,
  teamIds,
}: createSurveyFromFlowProps) {
  const lang: string = "en";
  const survey: CreateSurveyInput = {
    title: flowJson.screens[0].title,
    type: SurveyType.WaFlow,
    welcomePageEnabled: false,
    getLocation: false,
    languages: [lang], // TODO: add language support
    teamIds: teamIds,
  };

  const surveyRes = (await createSurvey(survey, userId)) as Survey;

  for (const formElement of waFlowFormElementIterator(flowJson)) {
    console.log(formElement);
    console.log("fmap", flowMap);
    console.log(flowMap[formElement.name]);
    const qType = flowMap[formElement.name].type;
    const question: CreateQuestionInput = {
      title: {
        [lang]: formElement.label,
      },
      description: {
        [lang]: "",
      },
      type: qType,
      required: formElement.required,
      choices: ChoiceTypeQuestions.includes(qType)
        ? {
            [lang]: formElement["data-source"]?.map((choice) => ({
              value: choice.title,
            })),
          }
        : undefined,
    };

    const questionRes = await createQuestion(surveyRes.id, question);
    flowMap[formElement.name].questionId = questionRes.id;
  }

  return { flowMap, survey: surveyRes };
}

// Since the form elements are deeply nested in the flow json & we need to iterate over them a lot
// we can use a generator to flatten the structure and iterate over it
/**
 *
 * @param flowJson
 * @param onlyInteractive set to false to include all form elements, including
 * those that are not interactive (e.g. TextBody, TextHeading, etc..)
 */
export function* waFlowFormElementIterator(
  flowJson: WaFlowJson,
  onlyInteractive = true,
) {
  for (const screen of flowJson.screens) {
    for (const screenElement of screen.layout.children) {
      if (screenElement.type === "Form") {
        for (const formElement of screenElement.children) {
          if (!onlyInteractive || formElement.name !== undefined) {
            yield formElement;
          }
        }
      }
    }
  }
}
