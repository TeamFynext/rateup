import { Survey, WaFlow } from "../../../../generated/prisma/client";
import { WaSendMessageBody } from "../../../types/whatsapp.types";
import {
  LDResponse,
  LogicCondition,
  QuestionType as qt,
  SmileyResponse,
  SubscriptionFeaturePathName,
  SurveyType,
  WaFlowFormElementType,
  WaFlowStatus,
  WaQuestions,
  YNResponse,
} from "../../../types/enums";
import { CreateSurveyInput } from "../../survey/survey.schema";
import { CreateQuestionInput } from "../../question/question.schema";
import { ChoiceTypeQuestions } from "../../../utils/survey/question/question.utils";
import { createSurvey } from "../../survey/survey.service";
import { createQuestion } from "../../question/question.service";
import { log } from "../../../utils/logger";
import { getUniqueRandomAlphaId } from "../../../utils/misc/random.utils";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload";
import { FastifyReply, FastifyRequest } from "fastify";
import prisma from "../../../utils/prisma";
import { getNestedProperty } from "../../../utils/misc/obj.utils";

interface generateFlowMessageDataProps {
  to: string;
  dbFlow: WaFlow;
}
export function generateFlowMessageData({
  to,
  dbFlow,
}: generateFlowMessageDataProps): WaSendMessageBody {
  const flow_id = dbFlow.flowId;
  const mode = dbFlow.status as WaFlowStatus;

  // TODO: only use status in lowercase
  if (![WaFlowStatus.DRAFT, WaFlowStatus.PUBLISHED].includes(mode)) {
    throw new Error(`Cant send a flow in '${mode}' state`);
  }

  let message: Partial<WaSendMessageBody["interactive"]> = {};

  let { body, header, cta, footer, headerImage } = dbFlow.templateMessage;

  // setting defaults for old waFlow
  if (!body) {
    body = "Would you like to start survey?";
  }
  if (!cta) {
    cta = "Open";
  }

  if (body) {
    message.body = {
      text: body,
    };
  }
  if (header) {
    message.header = {
      type: "text",
      text: header,
    };
  }

  if (headerImage) {
    message.header = {
      type: "image",
      image: {
        link: getFileUrlFromKey(headerImage),
      },
    };
  }
  if (footer) {
    message.footer = {
      text: footer,
    };
  } else {
    // TODO
    message.footer = {
      text: "Powered by RateUp",
    };
  }

  if (dbFlow.json.screens.length === 0) {
    throw new Error("Flow has no screens");
  }
  const screen_id = dbFlow.json.screens[0].id;

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "flow",
      ...message,
      action: {
        name: "flow",
        parameters: {
          mode: mode.toLowerCase() as any,
          flow_message_version: 3,
          flow_token: to,
          flow_id,
          flow_cta: cta,
          flow_action_payload: {
            screen: screen_id,
          },
        },
      },
    },
  };
}
export const OpinionResponses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const RatingResponses = [1, 2, 3, 4, 5];
export const ratingEmoji = "⭐️";

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
    if (
      payloadName === "flow_token" ||
      payloadName === "wa_flow_response_params"
    )
      continue;
    if (!value) {
      log.trace(
        "Empty value for payload %s. Question must have been skipped",
        payloadName,
      );
      continue;
    }
    try {
      const elementName = findElementNameFromPayloadName(
        payloadName,
        flow.json as any,
      );

      let questionResponse;

      if (flow.version === 1) {
        questionResponse = {
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
      } else {
        questionResponse = {
          questionId: payloadName,
          response: value,
        };
      }

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
  log.trace(
    "Parsing response for element %s\nresponse => %o",
    elementName,
    response,
  );

  const qType = flowMap[elementName].type;
  log.trace("Question type: %s", qType);
  if (!response) {
    log.fatal("Unhandled empty response found for element %s", elementName);
  }
  switch (qType) {
    case qt.Email:
      return { email: response };
    case qt.Text:
    case qt.TextArea:
    case qt.Number:
    case qt.PhotoPicker:
    case qt.DocumentPicker:
      return response;
    case qt.Phone:
      return { phone: response };
    case qt.Date:
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
      if (!choice) {
        log.error("Choice not found for response %s", response);
        return undefined;
      }
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
export function parseFlowResponseV2(metaType, response, dataSource) {
  log.trace("Parsing response for element %s\nresponse => %o", response);

  if (!response) {
    log.fatal("Unhandled empty response found for element %s", metaType);
  }
  switch (metaType) {
    case WaQuestions.TextInput:
    case WaQuestions.TextArea:
    case WaQuestions.PhotoPicker:
    case WaQuestions.DocumentPicker:
      return response;
    case WaQuestions.DatePicker:
      return new Date(parseInt(response));
    case WaQuestions.YN:
    case WaQuestions.LD:
    case WaQuestions.Smiley:
    case WaQuestions.Rating:
    case WaQuestions.Opinion:
    case WaQuestions.RadioButtonsGroup:
    case WaQuestions.Dropdown: {
      const choice = dataSource.find((c) => c.id === response);
      if (!choice) {
        log.error("Choice not found for response %s", response);
        return undefined;
      }
      return choice.title;
    }
    case WaQuestions.CheckboxGroup: {
      const choices = dataSource.filter((c) => response.includes(c.id));
      return choices.map((c) => c.title);
    }
    default:
      log.error(`Unhandled question type ${metaType}`);
      return response;
  }
}

export function getElementJson(flowJson: WaFlowJson, elementName: string) {
  log.trace("Getting element json for %s", elementName);
  for (const formElement of waFlowFormElementIterator({ flowJson })) {
    if (formElement.name === elementName) {
      log.trace("Found element %o", formElement);
      return formElement;
    }
  }
}

export function findElementNameFromPayloadName(
  payloadName: string,
  flowJson: WaFlowJson,
) {
  for (const formElement of waFlowFormElementIterator({
    flowJson,
    onlyInteractive: false,
    includeFooter: true,
  })) {
    if (formElement && formElement.type === WaFlowFormElementType.footer) {
      const { payload } = formElement["on-click-action"];

      if (payload[payloadName] && payload[payloadName].match(r_formPayload)) {
        const match = payload[payloadName].match(r_formPayload);

        return match[1];
      }
    }
  }
}

interface CreateSurveyFromFlowProps {
  flowJson: WaFlowJson;
  flowMap: any;
  req: any;
  teamIds: string[];
  title: string;
  orgId: string;
}
export async function createSurveyFromFlow({
  flowJson,
  flowMap,
  req,
  teamIds,
  title,
  orgId,
}: CreateSurveyFromFlowProps) {
  const lang: string = "en";
  const survey = {
    title: title,
    type: SurveyType.WaFlow,
    welcomePageEnabled: false,
    getLocation: false,
    languages: [lang], // TODO: add language support
    teamIds: teamIds,
    orgId,
  };

  const surveyRes = (await createSurvey(survey, req)) as Survey;

  for (const formElement of waFlowFormElementIterator({
    flowJson,
  })) {
    const qType = flowMap[formElement.name].type;
    const question: CreateQuestionInput = {
      title: {
        [lang]: "",
      },
      description: {
        [lang]: "",
      },
      label: {
        [lang]: formElement.label,
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
interface waFlowFormElementIteratorProps {
  flowJson: WaFlowJson;
  onlyInteractive?: boolean;
  includeFooter?: boolean;
}
export function* waFlowFormElementIterator({
  flowJson,
  onlyInteractive = true,
  includeFooter = true,
}: waFlowFormElementIteratorProps) {
  for (const screen of flowJson.screens) {
    for (const screenElement of screen.layout.children) {
      if (screenElement.type === "Form") {
        for (const formElement of screenElement.children) {
          if (!onlyInteractive || formElement.name !== undefined) {
            // if onlyInteractive is true, only include interactive elements
            if (
              includeFooter ||
              formElement.type !== WaFlowFormElementType.footer
            ) {
              // if includeFooter is false, exclude footer element
              yield formElement;
            }
          }
        }
      }
    }
  }
}

/**
 * Injects title & description for each question in the flowJson from the Survey.Question
 *
 * We represent flows as a Survey. Since our questions have title & description and flowElements don't,
 *  we need to add title & description as separate flowElements (textHeading, textBody etc...).
 * If we add them separately & show user then it would be confusing to the user.
 * Therefore we don't add title&description at the time of creating flow and only adds them to the json
 * just before sending the flowjson to whatsapp.
 * @param flowJson
 * @param map
 * @param survey
 * @returns
 */
export function getFlowJsonWithTitleAndDescription(
  flowJson: WaFlowJson,
  map: any,
  survey: Survey,
  logicJumps: any,
): WaFlowJson {
  let fj = JSON.parse(JSON.stringify(flowJson));
  for (const screen of fj.screens) {
    for (let screenElement of screen.layout.children) {
      if (screenElement.type === "Form") {
        for (let i = 0; i < screenElement.children.length; i++) {
          const formElement = screenElement.children[i];
          if (
            formElement.name !== undefined &&
            formElement.type !== WaFlowFormElementType.footer &&
            formElement.type !== WaFlowFormElementType.optIn
          ) {
            const question = getQuestionFromFlowFormElementName(
              formElement.name,
              survey.questions as unknown as Question[],
              map,
            );
            if (!question) {
              log.fatal(
                `Question not found for formElement ${formElement.name}\n%o`,
                formElement,
              );
              throw new Error(
                `Question not found for formElement ${formElement.name}`,
              );
            }
            if (
              formElement.type === WaFlowFormElementType.datePicker &&
              formElement["min-date"]
            ) {
              screen.data = {
                available_slots: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                      },
                      title: {
                        type: "string",
                      },
                    },
                  },
                  __example__: [
                    {
                      id: "1",
                      title: "08:00",
                    },
                    {
                      id: "2",
                      title: "09:00",
                    },
                  ],
                },
              };
            }
            const {
              formElements: { titleElement, descriptionElement },
            } = getFlowElementJsonFromQuestion(question);
            if (titleElement) {
              screenElement.children.splice(i, 0, titleElement);
              i++;
            }
            if (descriptionElement) {
              screenElement.children.splice(i, 0, descriptionElement);
              i++;
            }
            for (let logicJump of (logicJumps?.[screen?.id] ?? [])?.filter(
              (item) =>
                item.conditions.some(
                  (condition) => condition.questionId === formElement.id,
                ),
            )) {
              if (!logicJump || typeof logicJump.action === "string") continue;
              let { id, ...restFail } =
                screenElement?.children?.find(
                  (data) => data.id === logicJump.action.fail,
                ) ?? {};
              const { id: s_id, ...restSuccess } =
                screenElement?.children.find(
                  (data) => data.id === logicJump.action.success,
                ) ?? {};
              let conditions = logicJump.conditions?.map((condition) => {
                const elementName = screenElement?.children?.[i]?.name;
                const isNumberType = formElement?.["input-type"] === "number";
                const responseValue = isNumberType
                  ? condition.response
                  : `'${condition.response}'`;

                return `(\$\{form.${elementName}\} ${condition.condition} ${responseValue})`;
              });

              // Define the new element you want to insert
              const newLogicElement = {
                type: WaFlowFormElementType.if,
                condition: conditions.join(" && "),
                then: [restSuccess].filter(Boolean),
                else: [restFail].filter(Boolean),
              };

              // First, insert the new element at the specified position
              screenElement.children.splice(i + 1, 0, newLogicElement);

              // Then, filter out any existing logic jumps
              screenElement.children = screenElement.children.filter(
                (child) =>
                  ![logicJump.action.success, logicJump.action.fail].includes(
                    child.id,
                  ),
              );
            }
          }
        }
      }
    }
  }
  return fj;
}
const lang = "en";
export function getQuestionIdFromFlowFormElementName(
  name: string,
  map: any,
): string {
  return map[name]?.questionId;
}
export function getQuestionFromFlowFormElementName(
  name: string,
  questions: Question[],
  map: any,
): Question {
  const questionId = getQuestionIdFromFlowFormElementName(name, map);
  return questions.find((q) => q.id === questionId);
}

export function getQuestionFromFlowElementId(
  id: string,
  flowJson: WaFlowJson,
  questions: Question[],
  map: any,
) {
  const formElement = getFlowFormElementById(id, flowJson);
  return getQuestionFromFlowFormElementName(formElement.name, questions, map);
}

export function getFlowFormElementById(id: string, flowJson: WaFlowJson) {
  for (const screen of flowJson.screens) {
    const form = screen.layout.children.find((se) => se.type === "Form");
    for (const fe of form.children) {
      if (fe.id === id) return fe;
    }
  }
}

/**
 * Generates the flow-json representation of our question
 * @returns
 */
export function getFlowElementJsonFromQuestion(question: Question) {
  const { dataSource, mapData } = generateDataSourceFromQuestion(question);
  const type = questionTypeToFlowFormElementType(question.type);
  const questionElement: WaFlowFormElement = {
    label: question.label[lang],
    name: question.id,
    id: question.id,
    type,
    "data-source": dataSource.length ? dataSource : undefined,
    required: !!question.required,
  };
  let titleElement: WaFlowFormElement | undefined;
  let descriptionElement: WaFlowFormElement | undefined;

  if (question.title[lang]) {
    titleElement = {
      text: question.title[lang],
      type: WaFlowFormElementType.textSubHeading,
      id: `${question.id}_title`,
    };
  }
  if (question.description[lang]) {
    descriptionElement = {
      id: `${question.id}_description`,
      text: question.description[lang],
      type: WaFlowFormElementType.textBody,
    };
  }

  mapData.type = question.type;
  mapData.questionId = question.id;

  return {
    formElements: {
      questionElement,
      titleElement,
      descriptionElement,
    },
    map: {
      [question.id]: mapData,
    },
  };
}

export function questionTypeToFlowFormElementType(
  qtype: qt,
): WaFlowFormElementType {
  switch (qtype) {
    case qt.Text:
    case qt.Email:
    case qt.Phone:
    case qt.Number:
      return WaFlowFormElementType.textInput;
    case qt.TextArea:
      return WaFlowFormElementType.textArea;
    case qt.Date:
      return WaFlowFormElementType.datePicker;
    case qt.DDSS:
    case qt.WaTimeSlot:
      return WaFlowFormElementType.dropDown;
    case qt.MCQ:
    case qt.YN:
    case qt.LD:
    case qt.Rating:
    case qt.Opinion:
    case qt.Smiley:
      return WaFlowFormElementType.radioButtonsGroup;
    case qt.MSQ:
      return WaFlowFormElementType.checkboxGroup;
    case qt.PhotoPicker:
      return WaFlowFormElementType.photoPicker;
    case qt.DocumentPicker:
      return WaFlowFormElementType.documentPicker;
    default:
      throw Error("Not implemented");
  }
}
/**
 * Converts choices of question to 'data-source' json
 * FlowFormElement has a 'data-source' property containing data for the 'options' or 'choices'.
 * @returns DataSource[] | undefined
 */
export function generateDataSourceFromQuestion(q: Question) {
  let choices: string[] = [];

  if (q.type === qt.Rating) {
    choices = Object.values(RatingResponses)
      .map((v) => ratingEmoji.repeat(v))
      .reverse();
    const dataSource: WaFlowFormChoice[] = choices.map((c, index) => ({
      id: index.toString(),
      title: c,
    }));
    const mapData: any = choices.reduce(
      (prev, _choice, index) => ({ ...prev, [index]: `${5 - index}` }),
      {},
    );

    return { dataSource, mapData };
  } else {
    switch (q.type) {
      case qt.YN:
        choices = Object.values(YNResponse);
        break;
      case qt.LD:
        choices = Object.values(LDResponse);
        break;
      case qt.Opinion:
        choices = Object.values(OpinionResponses).map((v) => v.toString());
        break;
      case qt.Smiley:
        choices = Object.values(SmileyResponse);
        break;
      case qt.MCQ:
      case qt.MSQ:
      case qt.DDMS:
      case qt.DDSS:
        choices = q.choices?.[lang] ? q.choices[lang].map((c) => c.value) : [];
        break;
    }

    const dataSource: WaFlowFormChoice[] = choices.map((c, index) => ({
      id: index.toString(),
      title: c,
    }));
    const mapData: any = choices.reduce(
      (prev, choice, index) => ({ ...prev, [index]: choice }),
      {},
    );

    return { dataSource, mapData };
  }
}

/** Injects unique ids to formElements in the flowJson
 *
 * Since only some elements have unique identifiers(element.name) (why Meta, why?),
 * in the Form.children in flowJson, we are adding unique ids to each formElement.
 * This is done to make things easier in the ui for actions like drag & drop, updating, etc...
 *
 * These ids must be removed before sending the flowJson to whatsapp
 */
export function injectIdToFlowJson(json: WaFlowJson) {
  const ids = [];
  for (const element of waFlowFormElementIterator({
    flowJson: json,
    includeFooter: true,
    onlyInteractive: false,
  })) {
    if (!element.id) {
      element.id = getUniqueRandomAlphaId(6, ids);
      ids.push(element.id);
    } else {
      ids.push(element.id);
    }
  }
  return json;
}

/**
 * Removes auto-generated (by us for internal use) ids from flowJson
 */
export function removeIdFromFlowJson(json: WaFlowJson) {
  for (const element of waFlowFormElementIterator({
    flowJson: json,
    includeFooter: true,
    onlyInteractive: false,
  })) {
    if (element.id) {
      delete element.id;
    }
  }
  return json;
}

export function getFlowFormElementNameFromQuestionId(qId: string, map: any) {
  for (const [key, value] of Object.entries(map)) {
    //@ts-ignore
    if (value.questionId === qId) return key;
  }
}

export function validateFlowLogic(
  userResponse: string | number,
  condition: LogicCondition,
  response: string,
): boolean {
  try {
    switch (condition) {
      case LogicCondition.Equals:
        return userResponse === response;
      case LogicCondition.NotEquals:
        return userResponse !== response;
      case LogicCondition.IncludesAnyOf:

      default:
        return false;
    }
  } catch (error) {
    log.info(`Failed to validate logic: ${error}`);
    return false;
  }
}

export function parseResponseFromCurrentScreenResponse(
  dbFlow: WaFlow,
  questions: Question[],
  response_data: any,
) {
  const flowJson = dbFlow.json as WaFlowJson;
  const responses: QuestionResponse[] = [];

  for (const formElement of waFlowFormElementIterator({
    flowJson,
    onlyInteractive: true,
    includeFooter: false,
  })) {
    if (!response_data[formElement.name]) continue;
    const question = getQuestionFromFlowElementId(
      formElement.name,
      flowJson,
      questions,
      dbFlow.map,
    );

    const parsedResponse = parseFlowResponse({
      flowJson,
      flowMap: dbFlow.map,
      elementName: formElement.name,
      response: response_data[formElement.name],
    });

    const questionResponse: QuestionResponse = {
      questionId: question.id,
      type: question.type,
      response: {
        [question.type]: parsedResponse,
      },
    };
    log.trace("questionResponse", questionResponse);
    responses.push(questionResponse);
  }
  log.trace("responses", responses);
  return responses;
}
export function parseResponseFromCurrentScreenResponseV2(
  screens,
  response_data,
) {
  const responses = Object.keys(response_data).map((questionId) => {
    const question = screens
      .flatMap((screen) => screen.layout.children)
      .find((child) => child.id === questionId);

    return {
      questionId: question.id,
      response: response_data[questionId],
    };
  });
  log.trace("responses", responses);
  return responses;
}

export function sanitizeScreenData(data: any) {
  data.screens.forEach((screen: any) => {
    screen.layout.children.forEach((child: any) => {
      delete child.id;
      delete child.metaType;
      delete child.enableNpsAnalytics;
      delete child.googleReview;
      if (child.url) {
        child["on-click-action"] = {
          name: "open_url",
          url: child.url,
        };
        delete child.url;
      }
    });
  });
  return data;
}
export function removeEmptyStrings(obj) {
  for (const key in obj) {
    if (obj[key] && typeof obj[key] === "object") {
      removeEmptyStrings(obj[key]);
    } else if ((obj[key] === "" || !obj[key]) && key !== "visible") {
      delete obj[key];
    }
  }
}
export function convertHeaderToNewQuestion(flow) {
  let transformedFlow = JSON.parse(JSON.stringify(flow));
  transformedFlow.screens.forEach((screen) => {
    screen.layout.children = screen.layout.children.reduce((acc, child) => {
      if (child.header) {
        acc.push({
          text: child.header,
          type: "TextBody",
          markdown: true,
        });
        delete child.header;
      }
      acc.push(child);
      return acc;
    }, []);
  });
  return transformedFlow;
}
export function transformFlowAndLogicJumps(transformedFlow, logicJump) {
  // Clone the flow object to avoid mutating the original
  const routing_model = transformedFlow.screens.reduce(
    (acc, screen, index, array) => {
      acc[screen.id] = array.slice(index + 1).map((s) => s.id);
      return acc;
    },
    {},
  );

  let flag = false;
  Object.entries(logicJump).forEach(([key, value]) => {
    let screen = transformedFlow?.screens?.find((screen) => screen.id === key);
    const currentScreenPayload = screen?.layout?.children?.reduce(
      (prev, fe) => {
        if (fe.name) {
          return {
            ...prev,
            [fe.name]: `\${form.${fe.name}}`,
          };
        }
        return prev;
      },
      {},
    );

    for (const element of value as Array<{
      action?: string;
      else?: string[];
      then?: string[];
      conditions?: Array<{
        field?: string;
        operator?: string;
        value?: string | number;
        isNumber?: boolean;
      }>;
    }>) {
      if (typeof element.action === "string") {
        let footer = screen.layout.children.find(
          (child) => child.type === "Footer",
        );
        footer["on-click-action"] = {
          name: "data_exchange",
          payload: currentScreenPayload,
        };
        flag = true;
      } else {
        // Find the index of the field in the screen's children

        let fieldIndex = screen.layout.children.findIndex(
          (child) => child.id === element.conditions[0].field,
        );
        if (fieldIndex !== -1) {
          // Create the logic jump object
          let logicJumpObject = {
            type: "If",
            condition: element.conditions
              ?.map((condition) => {
                const value =
                  (condition?.isNumber ?? false)
                    ? condition?.value
                    : `'${condition?.value}'`;
                return `(\${form.${condition.field}} ${condition.operator} ${value})`;
              })
              .join(" && "),
            then: element.then
              .map((action) => {
                let childIndex = screen.layout.children.findIndex(
                  (child) => child.id === action,
                );
                if (childIndex !== -1) {
                  let child = screen.layout.children[childIndex];
                  screen.layout.children.splice(childIndex, 1);
                  let {
                    id,
                    metaType,
                    enableNpsAnalytics,
                    googleReview,
                    ...rest
                  } = child;
                  return { ...rest };
                }
                return null;
              })
              .filter(Boolean),
            else: element.else
              .map((action) => {
                let childIndex = screen.layout.children.findIndex(
                  (child) => child.id === action,
                );
                if (childIndex !== -1) {
                  let child = screen.layout.children[childIndex];
                  screen.layout.children.splice(childIndex, 1); // Remove the child from the main array
                  let { id, metaType, enableNpsAnalytics, ...rest } = child;
                  return { ...rest };
                }
                return null;
              })
              .filter(Boolean),
          };

          // Insert the logic jump object into the screen's children
          screen.layout.children.splice(fieldIndex + 1, 0, logicJumpObject);
        }
      }
    }
  });
  if (flag) {
    transformedFlow["routing_model"] = routing_model;
    transformedFlow["data_api_version"] = "3.0";
  }
}

export async function verifyFlowSubscriptionLimit(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    let orgId = request.user.orgId;
    const subscription = request.subscription;
    if (!subscription) throw new Error("Subscription not found");

    const flowCount = await prisma.waFlow.count({
      where: {
        orgId: orgId,
      },
    });

    const whatsappFlowFeatures = getNestedProperty(
      subscription.features as any,
      SubscriptionFeaturePathName.WhatsAppFlow,
    );
    if (flowCount >= whatsappFlowFeatures?.count?.max) {
      throw new Error(
        `You have reached the maximum limit of ${whatsappFlowFeatures?.count?.max} Flows.`,
      );
    }
  } catch (e) {
    return reply.code(403).send({
      message: e?.message,
      displayMessageInClient: true,
    });
  }
}
