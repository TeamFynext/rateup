import { Survey, WaFlow } from "../../../../generated/prisma/client.js";
import { WaSendMessageBody } from "../../../types/whatsapp.types.js";
import {
  LDResponse,
  QuestionType as qt,
  SmileyResponse,
  SurveyType,
  WaFlowFormElementType,
  WaFlowStatus,
  WaQuestions,
  YNResponse,
} from "../../../types/enums.js";
import { CreateQuestionInput } from "../../question/question.schema.js";
import { ChoiceTypeQuestions } from "../../../utils/survey/question/question.utils.js";
import { createSurvey } from "../../survey/survey.service.js";
import { createQuestion } from "../../question/question.service.js";
import { log } from "../../../utils/logger.js";
import { getUniqueRandomAlphaId } from "../../../utils/misc/random.utils.js";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload.js";
import { FastifyReply, FastifyRequest } from "fastify";
import { enforceWhatsappCountLimit } from "../../../utils/subscriptionLimit.js";
import prisma from "../../../utils/prisma.js";

interface generateFlowMessageDataProps {
  to: string;
  dbFlow: WaFlow;
}
export function generateFlowMessageData({
  to,
  dbFlow,
}: generateFlowMessageDataProps): WaSendMessageBody {
  const flow_id = dbFlow.flowId;
  if (!flow_id) {
    // dbFlow.flowId is only populated once the flow has been created in
    // WhatsApp (createFlowInWa). Sending before that previously shipped
    // `flow_id: null` straight to the Meta Graph API instead of failing here.
    throw new Error(`Flow ${dbFlow.dbFlowId} has not been created in WhatsApp yet (no flowId)`);
  }
  const mode = dbFlow.status as WaFlowStatus;

  // TODO: only use status in lowercase
  if (![WaFlowStatus.DRAFT, WaFlowStatus.PUBLISHED].includes(mode)) {
    throw new Error(`Cant send a flow in '${mode}' state`);
  }

  let message: Partial<WaSendMessageBody["interactive"]> = {};

  let { body, header, cta, footer, headerImage } = dbFlow.templateMessage ?? {};

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
          mode: mode.toLowerCase() as "draft" | "published",
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
  flowResponses: WaFlowResponses;
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
}: generateSurveyMessageDataProps): WaFlowQuestionResponse[] {
  // WaFlow.map has no PrismaJson.* annotation in schema.prisma, so Prisma types
  // it as `unknown`; WaFlowMap describes the blob that's actually stored there.
  const flowMap = flow.map as WaFlowMap;

  log.trace(
    { flowResponses, flowMap },
    "Generating question-responses from flow response\nflowResopnse => %o\nflowMap",
  );
  let responses: WaFlowQuestionResponse[] = [];
  for (const [payloadName, value] of Object.entries(flowResponses)) {
    if (payloadName === "flow_token" || payloadName === "wa_flow_response_params") continue;
    if (!value) {
      log.trace("Empty value for payload %s. Question must have been skipped", payloadName);
      continue;
    }
    try {
      let questionResponse: WaFlowQuestionResponse;

      if (flow.version === 1) {
        const elementName = findElementNameFromPayloadName(payloadName, flow.json);
        // Previously `flowMap[undefined]` threw a raw TypeError here, which the
        // catch below rethrew; this reports the same failure explicitly.
        if (!elementName) {
          throw new Error(`No form element bound to flow payload '${payloadName}'`);
        }
        const mapEntry = flowMap[elementName];
        if (!mapEntry) {
          throw new Error(`Flow map has no entry for form element '${elementName}'`);
        }

        questionResponse = {
          questionId: mapEntry.questionId,
          type: mapEntry.type,
          response: {
            [mapEntry.type]: parseFlowResponse({
              elementName,
              flowMap,
              flowJson: flow.json,
              response: value,
            }),
          },
        };
      } else {
        // v2 flow responses are keyed by element name only and don't carry a
        // QuestionType — v2 uses a different type system (Question2/WaQuestions)
        // that downstream v2 consumers (shouldShowGoogleReviewV2, etc.) read
        // without needing `.type`.
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
        {
          flowPayload: findElementNameFromPayloadName(payloadName, flow.json),
          flowMap,
          flowResponses,
        },
        `elementName => %s \n flowMap => %o\nflowResopnse => %o`,
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
  flowMap: WaFlowMap;
  flowJson: WaFlowJson;
  response: WaFlowRawResponse;
}
export function parseFlowResponse({
  elementName,
  flowMap,
  flowJson,
  response,
}: parseFlowResponseProps) {
  log.trace("Parsing response for element %s\nresponse => %o", elementName, response);

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
      // WhatsApp sends the date picker's value as an epoch-milliseconds string.
      return new Date(parseInt(String(response)));
    case qt.YN:
    case qt.LD:
    case qt.Smiley:
    case qt.Rating:
    case qt.Opinion:
      return flowMap[elementName][response.toString()];
    case qt.MCQ:
    case qt.DDSS: {
      const el = getElementJson(flowJson, elementName);
      if (!el?.["data-source"]) {
        log.error("Element or data-source not found for %s", elementName);
        return undefined;
      }
      const choice = el["data-source"].find((c) => c.id === response);
      if (!choice) {
        log.error("Choice not found for response %s", response);
        return undefined;
      }
      return { value: choice.title } as Choice;
    }
    case qt.MSQ: {
      const el = getElementJson(flowJson, elementName);
      if (!el?.["data-source"]) {
        log.error("Element or data-source not found for %s", elementName);
        return [];
      }
      // MSQ answers arrive as an array of selected choice ids.
      const selectedIds = Array.isArray(response) ? response : [String(response)];
      const choices = el["data-source"].filter((c) => selectedIds.includes(c.id));
      return choices.map((c) => ({ value: c.title }));
    }
    default:
      log.error(`Unhandled question type ${qType}`);
      return undefined;
  }
}
export function parseFlowResponseV2(
  metaType: WaQuestions,
  // Shape varies by metaType (single string for text/date/single-choice,
  // string[] for CheckboxGroup) — discriminated below by the switch, same as
  // the untyped param this replaces.
  response: WaFlowRawResponse,
  dataSource: Array<{ title: string; id: string }>,
) {
  log.trace({ response }, "Parsing response for element %s\nresponse => %o");

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
      // WhatsApp sends the date picker's value as an epoch-milliseconds string.
      return new Date(parseInt(String(response)));
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
      // Checkbox answers arrive as an array of selected choice ids.
      const selectedIds = Array.isArray(response) ? response : [String(response)];
      const choices = dataSource.filter((c) => selectedIds.includes(c.id));
      return choices.map((c) => c.title);
    }
    default:
      log.error(`Unhandled question type ${metaType}`);
      return response;
  }
}

export function getElementJson(
  flowJson: WaFlowJson,
  elementName: string,
): WaFlowFormElement | undefined {
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
): string | undefined {
  for (const formElement of waFlowFormElementIterator({
    flowJson,
    onlyInteractive: false,
    includeFooter: true,
  })) {
    if (formElement && formElement.type === WaFlowFormElementType.footer) {
      const onClickAction = formElement["on-click-action"];
      if (!onClickAction) continue;

      const binding = onClickAction.payload?.[payloadName];
      if (!binding) continue;

      const match = binding.match(r_formPayload);
      if (match?.[1]) return match[1];
    }
  }
  return undefined;
}

interface CreateSurveyFromFlowProps {
  flowJson: WaFlowJson;
  // `questionId` is what this function fills in, so the incoming map need not carry it.
  flowMap: WaFlowMapDraft;
  req: FastifyRequest;
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
    active: true,
  };

  const surveyRes = (await createSurvey(survey, req)) as Survey;

  for (const formElement of waFlowFormElementIterator({
    flowJson,
  })) {
    // waFlowFormElementIterator's default onlyInteractive:true already
    // guarantees `name` is set at runtime; this is only a type narrowing
    // (the generator's yield type doesn't encode that invariant).
    if (!formElement.name) continue;
    const qType = flowMap[formElement.name].type;
    const question: CreateQuestionInput = {
      title: {
        [lang]: "",
      },
      description: {
        [lang]: "",
      },
      label: {
        [lang]: formElement.label ?? "",
      },
      type: qType,
      required: formElement.required ?? false,
      choices: ChoiceTypeQuestions.includes(qType)
        ? {
            [lang]:
              formElement["data-source"]?.map((choice) => ({
                value: choice.title,
              })) ?? [],
          }
        : undefined,
      enableNpsAnalytics: false,
      extraConfig: {},
    };

    const questionRes = await createQuestion(surveyRes.id, question);
    flowMap[formElement.name].questionId = questionRes.id;
  }

  // The loop above set `questionId` on every named form element, so the draft map
  // is now complete.
  return { flowMap: flowMap as WaFlowMap, survey: surveyRes };
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
      if (screenElement.type === "Form" && screenElement.children) {
        for (const formElement of screenElement.children) {
          if (!onlyInteractive || formElement.name !== undefined) {
            // if onlyInteractive is true, only include interactive elements
            if (includeFooter || formElement.type !== WaFlowFormElementType.footer) {
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
  map: WaFlowMap,
  survey: Survey,
  logicJumps: PrismaJson.PWaFlowLogicJumps | null | undefined,
): WaFlowJson {
  // Deep clone so the caller's json is left untouched.
  const fj: WaFlowJson = JSON.parse(JSON.stringify(flowJson));
  for (const screen of fj.screens) {
    for (let screenElement of screen.layout.children) {
      if (screenElement.type === "Form" && screenElement.children) {
        const formChildren = screenElement.children;
        for (let i = 0; i < formChildren.length; i++) {
          const formElement = formChildren[i];
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
              log.fatal(`Question not found for formElement ${formElement.name}\n%o`, formElement);
              throw new Error(`Question not found for formElement ${formElement.name}`);
            }
            if (formElement.type === WaFlowFormElementType.datePicker && formElement["min-date"]) {
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
            // `fj` is a JSON.parse(JSON.stringify(flowJson)) deep clone, so
            for (const logicJump of (logicJumps?.[screen?.id] ?? []).filter((item) =>
              item.conditions.some((condition) => condition.questionId === formElement.id),
            )) {
              // Only v2 branch actions name the elements to show per branch; a
              // string action is a v1 verb/screen id and has nothing to inline.
              const branch = logicJump?.action;
              if (!branch || typeof branch === "string") continue;
              let { ...restFail } =
                screenElement?.children?.find((data) => data.id === branch.fail) ?? {};
              const { ...restSuccess } =
                screenElement?.children.find((data) => data.id === branch.success) ?? {};
              let conditions = logicJump.conditions?.map((condition) => {
                const elementName = screenElement?.children?.[i]?.name;
                const isNumberType = formElement?.["input-type"] === "number";
                const responseValue = isNumberType ? condition.response : `'${condition.response}'`;

                return `($\{form.${elementName}} ${condition.condition} ${responseValue})`;
              });

              // Define the new element you want to insert
              const newLogicElement = {
                type: WaFlowFormElementType.if,
                condition: conditions.join(" && "),
                // eslint-disable-next-line unicorn/no-thenable
                then: [restSuccess].filter(Boolean),
                else: [restFail].filter(Boolean),
              };

              // First, insert the new element at the specified position
              screenElement.children.splice(i + 1, 0, newLogicElement);

              // Then, filter out any existing logic jumps
              screenElement.children = screenElement.children.filter(
                (child) => ![branch.success, branch.fail].includes(child.id),
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
  map: WaFlowMap,
): string | undefined {
  return map[name]?.questionId;
}
export function getQuestionFromFlowFormElementName(
  name: string,
  questions: Question[],
  map: WaFlowMap,
): Question | undefined {
  const questionId = getQuestionIdFromFlowFormElementName(name, map);
  return questions.find((q) => q.id === questionId);
}

export function getQuestionFromFlowElementId(
  id: string,
  flowJson: WaFlowJson,
  questions: Question[],
  map: WaFlowMap,
): Question | undefined {
  const formElement = getFlowFormElementById(id, flowJson);
  if (!formElement?.name) return undefined;
  return getQuestionFromFlowFormElementName(formElement.name, questions, map);
}

export function getFlowFormElementById(
  id: string,
  flowJson: WaFlowJson,
): WaFlowFormElement | undefined {
  for (const screen of flowJson.screens) {
    const form = screen.layout.children.find((se) => se.type === "Form");
    if (!form?.children) continue;
    for (const fe of form.children) {
      if (fe.id === id) return fe;
    }
  }
  return undefined;
}

/**
 * Generates the flow-json representation of our question
 * @returns
 */
export function getFlowElementJsonFromQuestion(question: Question) {
  const { dataSource, mapData } = generateDataSourceFromQuestion(question);
  const type = questionTypeToFlowFormElementType(question.type);
  const questionElement: WaFlowFormElement = {
    label: question.label?.[lang],
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

export function questionTypeToFlowFormElementType(qtype: qt): WaFlowFormElementType {
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
    // Choice-index -> label; `type`/`questionId` are filled in by the caller
    // once the backing Question exists, completing a WaFlowMapEntry.
    const mapData: Record<string, string | qt> = choices.reduce(
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
    // See the Rating branch above.
    const mapData: Record<string, string | qt> = choices.reduce(
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
  const copy: WaFlowJson = JSON.parse(JSON.stringify(json));
  const ids = [];
  for (const element of waFlowFormElementIterator({
    flowJson: copy,
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
  return copy;
}

/**
 * Removes auto-generated (by us for internal use) ids from flowJson
 */
export function removeIdFromFlowJson(json: WaFlowJson) {
  const copy: WaFlowJson = JSON.parse(JSON.stringify(json));
  for (const element of waFlowFormElementIterator({
    flowJson: copy,
    includeFooter: true,
    onlyInteractive: false,
  })) {
    if (element.id) {
      delete element.id;
    }
  }
  return copy;
}

export function getFlowFormElementNameFromQuestionId(qId: string, map: unknown) {
  if (!map || typeof map !== "object") return undefined;
  for (const [key, value] of Object.entries(map as Record<string, { questionId?: string }>)) {
    if (value?.questionId === qId) return key;
  }
}

export function parseResponseFromCurrentScreenResponse(
  dbFlow: WaFlow,
  questions: Question[],
  response_data: WaFlowResponses,
) {
  const flowJson = dbFlow.json as WaFlowJson;
  // WaFlow.map is `unknown` on the Prisma model; see WaFlowMap.
  const flowMap = dbFlow.map as WaFlowMap;
  const responses: QuestionResponse[] = [];

  for (const formElement of waFlowFormElementIterator({
    flowJson,
    onlyInteractive: true,
    includeFooter: false,
  })) {
    const elementName = formElement.name;
    if (!elementName) continue;
    const rawResponse = response_data[elementName];
    if (!rawResponse) continue;
    const question = getQuestionFromFlowElementId(elementName, flowJson, questions, flowMap);
    if (!question) {
      log.error("Question not found for flow element %s", elementName);
      continue;
    }

    const parsedResponse = parseFlowResponse({
      flowJson,
      flowMap,
      elementName,
      response: rawResponse,
    });
    if (parsedResponse === undefined) {
      log.error("Could not parse the answer for flow element %s", elementName);
      continue;
    }

    const questionResponse: QuestionResponse = {
      questionId: question.id,
      type: question.type,
      response: {
        [question.type]: parsedResponse,
      },
    };
    log.trace({ questionResponse }, "questionResponse");
    responses.push(questionResponse);
  }
  log.trace({ responses }, "responses");
  return responses;
}
// `screens` is dbFlow.json.screens for a v2 flow: its layout.children are
// WaFlowFormElement-shaped (carry `id`) at runtime, not the WaFlowForm shape
// WaFlowScreen declares — the same runtime/type gap already documented in
// wasurvey.service.ts's shouldShowGoogleReviewV2 — so this stays `any` rather
// than mistyped against WaFlowScreen.
export function parseResponseFromCurrentScreenResponseV2(
  screens: WaFlowScreen[],
  response_data: WaFlowResponses,
) {
  const responses = Object.keys(response_data).map((questionId) => {
    const question = screens
      .flatMap((screen) => screen.layout.children)
      .find((child) => child.id === questionId);

    return {
      // Falls back to the payload key when the element is no longer in the
      // screen (previously this threw a TypeError on `question.id`).
      questionId: question?.id ?? questionId,
      response: response_data[questionId],
    };
  });
  log.trace({ responses }, "responses");
  return responses;
}

export function sanitizeScreenData(data: WaFlowJson) {
  data.screens.forEach((screen) => {
    sanitizeScreenChildren(screen.layout.children);
  });
  return data;
}

function sanitizeScreenChildren(children: WaFlowForm[] | undefined) {
  children?.forEach((child) => {
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
    sanitizeScreenChildren(child.children);
  });
}
export function removeEmptyStrings(obj: object) {
  if (Array.isArray(obj)) {
    // Arrays are filtered, not `delete`d into: deleting an index leaves a hole,
    // and JSON.stringify — which updateFlowJsonInWa does next — renders a hole
    // as null, so ["a", "", "b"] reached Meta as ["a", null, "b"].
    const kept = obj.filter((entry) => !isEmptyFlowJsonValue(entry));
    for (const entry of kept) {
      if (entry && typeof entry === "object") removeEmptyStrings(entry);
    }
    obj.length = 0;
    obj.push(...kept);
    return;
  }
  const record = obj as Record<string, unknown>;
  for (const key in record) {
    const value = record[key];
    if (value && typeof value === "object") {
      removeEmptyStrings(value);
    } else if (isEmptyFlowJsonValue(value)) {
      delete record[key];
    }
  }
}

function isEmptyFlowJsonValue(value: unknown) {
  return value === null || value === undefined || value === "";
}
/**
 * Lifts each v2 element's inline `header` out into its own TextBody element,
 * which is how Meta expects headings to be expressed.
 */
export function convertHeaderToNewQuestion(flow: WaFlowJson): WaFlowJson {
  // Deep clone so the caller's json is left untouched.
  const transformedFlow: WaFlowJson = JSON.parse(JSON.stringify(flow));
  transformedFlow.screens.forEach((screen) => {
    screen.layout.children = screen.layout.children.reduce((acc: WaFlowForm[], child) => {
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
/**
 * Rewrites a v2 flow's screens in place so its logic jumps become Meta "If"
 * elements, and adds the routing model / data-api version when any screen needs
 * a data exchange.
 */
export function transformFlowAndLogicJumps(
  transformedFlow: WaFlowJson,
  logicJump: PrismaJson.PWaFlowLogicJumps,
) {
  // Each screen can route to any screen after it.
  const routing_model = transformedFlow.screens.reduce<Record<string, string[]>>(
    (acc, screen, index, array) => {
      acc[screen.id] = array.slice(index + 1).map((s) => s.id);
      return acc;
    },
    {},
  );

  let flag = false;
  Object.entries(logicJump).forEach(([key, value]) => {
    const screen = transformedFlow?.screens?.find((s) => s.id === key);
    if (!screen?.layout?.children) return;
    const screenChildren = screen.layout.children;
    const currentScreenPayload = screenChildren.reduce<Record<string, string>>((prev, fe) => {
      if (fe.name) {
        return {
          ...prev,
          [fe.name]: `\${form.${fe.name}}`,
        };
      }
      return prev;
    }, {});

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
        const footer = screenChildren.find((child) => child.type === "Footer");
        if (!footer) continue;
        footer["on-click-action"] = {
          name: "data_exchange",
          payload: currentScreenPayload,
        };
        flag = true;
      } else {
        // Find the index of the field in the screen's children

        const fieldIndex = screenChildren.findIndex(
          (child) => child.id === element.conditions?.[0]?.field,
        );
        if (fieldIndex !== -1) {
          // Create the logic jump object
          let logicJumpObject = {
            type: "If",
            condition: element.conditions
              ?.map((condition) => {
                const value =
                  (condition?.isNumber ?? false) ? condition?.value : `'${condition?.value}'`;
                return `(\${form.${condition.field}} ${condition.operator} ${value})`;
              })
              .join(" && "),
            then: (element.then ?? [])
              .map((action) => {
                const childIndex = screenChildren.findIndex((child) => child.id === action);
                if (childIndex !== -1) {
                  const child = screenChildren[childIndex];
                  screenChildren.splice(childIndex, 1);
                  const { metaType: _metaType, googleReview: _googleReview, ...rest } = child;
                  return { ...rest };
                }
                return null;
              })
              .filter(Boolean),
            else: (element.else ?? [])
              .map((action) => {
                const childIndex = screenChildren.findIndex((child) => child.id === action);
                if (childIndex !== -1) {
                  const child = screenChildren[childIndex];
                  screenChildren.splice(childIndex, 1); // Remove the child from the main array
                  const { metaType: _metaType, ...rest } = child;
                  return { ...rest };
                }
                return null;
              })
              .filter(Boolean),
          };

          // Insert the logic jump object into the screen's children
          screenChildren.splice(fieldIndex + 1, 0, logicJumpObject as WaFlowForm);
        }
      }
    }
  });
  if (flag) {
    transformedFlow["routing_model"] = routing_model;
    transformedFlow["data_api_version"] = "3.0";
  }
}

export async function verifyFlowSubscriptionLimit(request: FastifyRequest, reply: FastifyReply) {
  return await enforceWhatsappCountLimit(request, reply, {
    label: "Flows",
    count: (orgId) => prisma.waFlow.count({ where: { orgId } }),
  });
}
