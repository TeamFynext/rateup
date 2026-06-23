import type { UseFormReturnType } from "@mantine/form";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

import {
  LDResponse,
  QuestionType as qt,
  QuestionType,
  SmileyResponse,
  WaFlowFormElementType,
  WaFlowLayoutType,
  WaFlowFormElementType as wft,
  YNResponse,
} from "@/types/enums.ts";
import type {
  WaFlowFormChoice,
  WaFlowFormElement,
  WaFlowJson,
  WaFlowMap,
  WaFlowScreen,
} from "@/types/global";
import {
  WA_FLOW_BODY_CHAR_LIMIT,
  WA_FLOW_CAPTION_CHAR_LIMIT,
  WA_FLOW_EMBEDDED_LINK_LIMIT,
  WA_FLOW_HEADING_CHAR_LIMIT,
  WA_FLOW_SUBHEADING_CHAR_LIMIT,
} from "@/components/whatsapp/whatsappConfig.tsx";

import { getNestedProperty } from "../misc/obj.utils";
import {
  OpinionResponses,
  ratingEmoji,
  RatingResponses,
} from "../questions.ts";

dayjs.extend(utc);
dayjs.extend(timezone);
// Since flow doesn't support multiple languages, we will use 'en' as the default language.
const lang = "en";

/**
 * Used while importing a flow. It maps the flowFormElementType to the possible question types.
 */
export const waFlowFormToQuestionTypeMaps = {
  [wft.textInput]: [qt.Text, qt.Email, qt.Phone, qt.Number],
  [wft.textArea]: [qt.TextArea],
  [wft.radioButtonsGroup]: [
    qt.YN,
    qt.LD,
    qt.MCQ,
    qt.Rating,
    qt.Smiley,
    qt.Opinion,
  ],
  [wft.dropDown]: [qt.YN, qt.LD, qt.MCQ, qt.Rating, qt.Smiley, qt.Opinion],
  [wft.checkboxGroup]: [qt.MSQ],
  [wft.datePicker]: [qt.Date],
  [wft.optIn]: [qt.YN, qt.LD],
};

// TODO: remove either this or the above
export function getQuestionTypesFromFlowElement(
  formElement: WaFlowFormElement,
): string[] {
  switch (formElement.type) {
    case wft.textInput:
      return [qt.Text, qt.Email, qt.Phone, qt.Number];
    case wft.textArea:
      return [qt.TextArea];
    case wft.dropDown:
    case wft.radioButtonsGroup: {
      const choices = formElement["data-source"];
      const types = [qt.MCQ, qt.CustomNPS];
      if (choices.length === 2) return types.concat([qt.YN, qt.LD]);
      else if (choices.length === 5)
        return types.concat([qt.Rating, qt.Smiley]);
      else if (choices.length === 10) return types.concat([qt.Opinion]);
      return types;
    }
    case wft.checkboxGroup:
      return [qt.MSQ];
    case wft.datePicker:
      return [qt.Date];
    case wft.optIn:
      return [qt.YN, qt.LD];
    default:
      throw new Error("Invalid form element type");
  }
}

export function getQuestionResponses(qType: qt) {
  switch (qType) {
    case qt.YN:
      return Object.values(YNResponse);
    case qt.LD:
      return Object.values(LDResponse);
    case qt.Rating:
      return [1, 2, 3, 4, 5].map((i) => `${i}`);
    case qt.Smiley:
      return Object.values(SmileyResponse);
    case qt.Opinion:
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => `${i}`);
  }
}

/**
 * While importing, if user marks a flowQuestion as a type in this list, then we need to further ask
 * the user to map the choices as well.
 * eg: waFlowForm => type: radioButtons, with choices: [absolutely, never]
 * In this case, we need to ask the user to map the choices to the question type. (absolutely -> Yes, never -> No)
 */
export const qTypesWithAmbiguousChoices = [
  qt.YN,
  qt.LD,
  qt.Rating,
  qt.Smiley,
  qt.Opinion,
];

interface validateOptionsProps {
  form: UseFormReturnType<any>;
  path: string;
}
/**
 * Validate the mapped options while importing a flow.
 * (eg: for a YN question, if user select both option as YES then it's invalid.)
 * @param param0
 * @returns
 */
export function validateOptions({ form, path }: validateOptionsProps) {
  const questions = getNestedProperty(form.values, path);
  if (!questions) {
    return false;
  }
  for (const qData of Object.values(questions)) {
    const { type: _, ...choices } = qData as any;
    const choiceValues = Object.values(choices);

    const uniqueChoices = new Set(choiceValues);
    if (uniqueChoices.size !== choiceValues.length) {
      return false;
    }
  }
  return true;
}

/**
 *
 * @param flowJson
 * @param onlyInteractive set to false to include all form elements, including
 * those that are not interactive (e.g. TextBody, TextHeading, etc..)
 */
function* waFlowFormElementIterator(
  flowJson: WaFlowJson,
  onlyInteractive = true,
) {
  for (const screen of flowJson.screens) {
    for (const screenElement of screen.layout.children) {
      if (screenElement.type === "Form") {
        for (const formElement of screenElement.children) {
          if (!onlyInteractive || formElement.name !== undefined) {
            console.log("yeild");
            yield formElement;
          }
        }
      }
    }
  }
}

export function getFlowFormElementsFromScreen(
  screen: WaFlowScreen,
  onlyInteractive = false,
  version = 1,
) {
  const children = screen?.layout?.children;
  const elementsWithoutFooter =
    version === 1
      ? children
          ?.find((se) => se.type === "Form")
          ?.children?.filter((fe) => fe.type !== WaFlowFormElementType.footer)
      : children?.filter((fe) => fe.type !== WaFlowFormElementType.footer);

  if (onlyInteractive) {
    return elementsWithoutFooter?.filter((fe) => fe.name !== undefined);
  } else {
    return elementsWithoutFooter;
  }
}

export function getFlowFooterElementsFromScreen(
  screen: WaFlowScreen,
  version = 1,
) {
  const children = screen?.layout?.children;
  const elementsWithoutFooter =
    version === 1
      ? children
          ?.find((se) => se.type === "Form")
          ?.children?.filter((fe) => fe.type === WaFlowFormElementType.footer)
      : children?.filter((fe) => fe.type === WaFlowFormElementType.footer);
  return elementsWithoutFooter;
}

export function getQuestionsFromScreen(
  screen: WaFlowScreen,
  survey: Survey,
  map: any,
) {
  const formElementIds = screen.layout.children
    .find((se) => se.type === "Form")
    ?.children?.map((q) => q.name);
  const qIds = formElementIds?.map((fid) => map[fid]?.questionId);
  const questions = qIds
    ?.map((qid) => survey.questions.find((q) => q.id === qid))
    .filter((q) => !!q);

  return questions;
}

export function getQuestionIdFromFlowFormElementName(
  name: string,
  map: any,
): string {
  return map[name]?.questionId;
}
export function getQuestionFromFlowFormElementName(
  name: string,
  questions: Question[],
  map: WaFlowMap,
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
  return getQuestionFromFlowFormElementName(formElement?.name, questions, map);
}

export function getFlowTextLimit(type: WaFlowFormElementType) {
  switch (type) {
    case WaFlowFormElementType.textHeading:
      return WA_FLOW_HEADING_CHAR_LIMIT;
    case WaFlowFormElementType.textBody:
      return WA_FLOW_BODY_CHAR_LIMIT;
    case WaFlowFormElementType.textSubHeading:
      return WA_FLOW_SUBHEADING_CHAR_LIMIT;
    case WaFlowFormElementType.textCaption:
      return WA_FLOW_CAPTION_CHAR_LIMIT;
    case WaFlowFormElementType.embeddedLink:
      return WA_FLOW_EMBEDDED_LINK_LIMIT;
    case WaFlowFormElementType.optIn:
      return WA_FLOW_EMBEDDED_LINK_LIMIT;
    default:
      throw new Error("Invalid form element type");
  }
}

/**
 * Get the text of a flow element.
 * Used to display in questionSidebar
 * @param fe
 * @param questions
 * @param map
 * @returns
 */
export function getFlowElementText(
  fe: WaFlowFormElement,
  questions: Question[],
  map: any,
) {
  if (fe.type === WaFlowFormElementType.image) {
    return "IMAGE";
  } else if (fe.type === WaFlowFormElementType.optIn) {
    return fe.label;
  } else if (fe.text) {
    return fe.text;
  } else {
    try {
      const q = getQuestionFromFlowFormElementName(fe.name, questions, map);
      return q.title[lang] || q.description[lang] || q.label[lang];
    } catch (e) {
      return "";
    }
  }
}

export function getAllIdsFromFlowJson(flowJson: WaFlowJson) {
  const ids = [];
  for (const screen of flowJson.screens) {
    const form = screen.layout.children.find((se) => se.type === "Form");
    for (const fe of form.children) {
      ids.push(fe.id);
    }
  }
  return ids;
}

export function getFlowFormElementById(id: string, flowJson: WaFlowJson) {
  for (const screen of flowJson.screens) {
    const form = screen.layout.children.find((se) => se.type === "Form");
    for (const fe of form.children) {
      if (fe.id === id) return fe;
    }
  }
}
type newScreenDataObj = {
  screenId: string;
  screenTitle: string;
  footerBtnLabel: string;
};

export const getNewScreenObj = ({
  screenId,
  screenTitle,
  footerBtnLabel,
}: newScreenDataObj): WaFlowScreen => {
  return {
    id: screenId,
    title: screenTitle,
    // success: true,
    terminal: true,
    layout: {
      type: WaFlowLayoutType.scl,
      children: [
        {
          type: "Form",
          name: "form",
          children: [
            {
              id: "footer",
              type: WaFlowFormElementType.footer,
              label: footerBtnLabel,
              "on-click-action": {
                name: "complete",
                payload: {},
              },
            },
          ],
        },
      ],
    },
  };
};
// We need to pass the draft of immer(used useImmer as state in EditFlow).

export const updateFlowJsonNavigationAndDataPassing = (
  draft: WaFlowJson,
  dbFlow: DbFlow,
) => {
  let screenData = null;
  let previousPayloadData = null;

  const routing_model = {};
  let datePickerDynamicFlag = false;

  const screens = draft.screens;
  const flowHasLogic = screens.some((screen) => {
    // Check if there are logic jumps for the screen
    const logicJumps = dbFlow.logicJumps[screen.id];

    // Ensure logicJumps exists and is an array
    if (Array.isArray(logicJumps)) {
      // Check if any object in logicJumps has an 'action' field that is a string
      return logicJumps.some((jump) => typeof jump.action === "string");
    }

    return false;
  });
  screens.forEach((screen, currentIndex) => {
    routing_model[screen.id] = draft.screens
      .slice(currentIndex + 1)
      .map((s) => s.id);

    delete screen["terminal"];
    delete screen["success"];
    if (screenData) {
      screen.data = screenData;
    } else {
      screenData = {};
    }

    const layoutForm = screen.layout.children.find((c) => c.type === "Form");
    const footerObject = layoutForm?.children?.find(
      (c) => c.type === WaFlowFormElementType.footer,
    );
    const formElements = getFlowFormElementsFromScreen(
      screen,
      true,
    ) as WaFlowFormElement[];
    if (!formElements) return;
    const currentScreenIsNotLast = currentIndex !== screens.length - 1;

    const currentScreenPayload = formElements?.reduce(
      (prev, fe) => ({
        ...prev,
        [fe.name]: `\${form.${fe.name}}`,
      }),
      {},
    );
    if (currentScreenIsNotLast) {
      footerObject["on-click-action"] = {
        name: flowHasLogic ? "data_exchange" : "navigate",
        next: flowHasLogic
          ? undefined
          : {
              type: "screen",
              name: screens[currentIndex + 1].id,
            },
        payload: { ...currentScreenPayload, ...previousPayloadData },
      };
      const payloadToNextScreen = flowHasLogic
        ? {}
        : formElements.reduce(
            (prev, fe) => ({
              ...prev,
              [fe.name]: `\${data.${fe.name}}`,
            }),
            {},
          );
      previousPayloadData = {
        ...previousPayloadData,
        ...payloadToNextScreen,
      };
      const screenDataForNextScreen = flowHasLogic
        ? {}
        : formElements.reduce(
            (prev, fe) => ({
              ...prev,
              [fe.name]: getScreenDataForFormElement(fe),
            }),
            {},
          );
      screenData = {
        ...screenData,
        ...screenDataForNextScreen,
      };
    } else {
      screen["terminal"] = true;
      footerObject["on-click-action"] = flowHasLogic
        ? {
            name: "data_exchange",
            payload: {
              ...currentScreenPayload,
              ...previousPayloadData,
            },
          }
        : {
            name: "complete",
            payload: {
              ...currentScreenPayload,
              ...previousPayloadData,
            },
          };
    }
    if (
      !datePickerDynamicFlag &&
      formElements.some(
        (formElement) =>
          formElement.type === WaFlowFormElementType.datePicker &&
          formElement["on-select-action"],
      )
    ) {
      datePickerDynamicFlag = true;
    }
  });

  draft.routing_model =
    flowHasLogic || datePickerDynamicFlag ? routing_model : undefined;
  draft.data_api_version =
    flowHasLogic || datePickerDynamicFlag ? "3.0" : undefined;
};
function getScreenDataForFormElement(fe: WaFlowFormElement): {
  type: string;
  ["__example__"]: string | Array<any> | boolean;
  items?: any;
} {
  if (fe.type === WaFlowFormElementType.checkboxGroup) {
    return {
      type: "array",
      items: {
        type: "string",
      },
      __example__: [],
    };
  }
  if (fe.type === WaFlowFormElementType.optIn) {
    return {
      type: "boolean",
      __example__: false,
    };
  } else {
    return {
      type: "string",
      __example__: "",
    };
  }
}

export function getFlowJsonWithTitleAndDescription(
  flowJson: WaFlowJson,
  map: WaFlowMap,
  survey: Survey,
): WaFlowJson {
  const fj = JSON.parse(JSON.stringify(flowJson));
  for (const screen of fj.screens) {
    for (const screenElement of screen.layout.children) {
      if (screenElement.type === "Form") {
        for (let i = 0; i < screenElement.children.length; i++) {
          const formElement = screenElement.children[i];
          if (
            formElement.name !== undefined &&
            formElement.type !== WaFlowFormElementType.footer
          ) {
            const question = getQuestionFromFlowFormElementName(
              formElement.name,
              survey.questions,
              map,
            );
            if (!question) {
              // hacky fix for questions which has been deleted
              // TODO: Fix this
              console.error("Question not found for form element", formElement);
              continue;
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
          }
        }
      }
    }
  }
  return fj;
}

export const getScreenObjById = (screens: WaFlowScreen[], screenId: string) => {
  return screens.find((screen) => screen.id === screenId);
};
export const getFormObjFromScreenId = (
  screens: WaFlowScreen[],
  screenId: string,
) => {
  return getScreenObjById(screens, screenId)?.layout.children.find(
    (c) => c.type === "Form",
  );
};

export function getFlowElementJsonFromQuestion(question: Question) {
  if (!question) {
    throw new Error("Question not found");
  }
  const { dataSource, mapData } = generateDataSourceFromQuestion(question);
  const type = questionTypeToFlowFormElementType(question.type as QuestionType);
  const questionElement: WaFlowFormElement = {
    label: question.label?.[lang] || "",
    name: question.id,
    id: question.id,
    type,
    "data-source": dataSource.length ? dataSource : undefined,
    required: !!question.required,
  };
  let titleElement: WaFlowFormElement | undefined;
  let descriptionElement: WaFlowFormElement | undefined;

  // Any updates here should also be updated in backend
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
  if (question.type === QuestionType.WaTimeSlot) {
    questionElement["data-source"] = "${data.available_slots}";
  } else if (question?.onSelectAction && question.waAppName) {
    const now = dayjs().tz("Asia/Kolkata").startOf("day");
    const afterSixMonth = dayjs().add(6, "M").startOf("day");
    questionElement["min-date"] = now.utc().valueOf().toString();
    questionElement["max-date"] = afterSixMonth.utc().valueOf().toString();
    questionElement["on-select-action"] = {
      name: "data_exchange",
      payload: {
        date: `\${form.${questionElement.name}}`,
        component_action: "update_date",
      },
    };
  } else if (question?.optinScreenId && question.type === QuestionType.Optin) {
    questionElement["on-click-action"] = {
      name: "navigate",
      next: {
        type: "screen",
        name: question.optinScreenId,
      },
      payload: {
        [questionElement.name]: `\${form.${questionElement.name}}`,
      },
    };
  } else if (
    [
      QuestionType.Text,
      QuestionType.PhotoPicker,
      QuestionType.DocumentPicker,
      QuestionType.Email,
      QuestionType.Phone,
    ].includes(question.type as QuestionType)
  ) {
    questionElement.required = ![
      QuestionType.PhotoPicker,
      QuestionType.DocumentPicker,
    ].includes(question.type as QuestionType)
      ? question.required
      : undefined;
    Object.entries(question?.extraConfig ?? {}).forEach(([key, value]) => {
      questionElement[key] = value;
    });
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

const flow_supported_questions = [
  qt.Text,
  qt.Email,
  qt.Phone,
  qt.Number,
  qt.TextArea,
  qt.Date,
  qt.DDSS,
  qt.MCQ,
  qt.YN,
  qt.LD,
  qt.Rating,
  qt.Opinion,
  qt.MSQ,
];
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
    case qt.Optin:
      return WaFlowFormElementType.optIn;
    case qt.WaTimeSlot:
      return WaFlowFormElementType.dropDown;
    case qt.PhotoPicker:
      return WaFlowFormElementType.photoPicker;
    case qt.DocumentPicker:
      return WaFlowFormElementType.documentPicker;
    default:
      throw Error(qtype + "Not implemented");
  }
}
/**
 * Converts choices of question to 'data-source' json
 * FlowFormElement has a 'data-source' property containing data for the 'options' or 'choices'.
 * @returns DataSource[] | undefined
 */
function generateDataSourceFromQuestion(q: Question) {
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

    const dataSource: WaFlowFormChoice[] = choices.map((c, index) => {
      const t = typeof c === "object" ? c : { title: c };
      return {
        id: index.toString(),
        ...t,
      };
    });
    const mapData: any = choices.reduce(
      (prev, choice, index) => ({ ...prev, [index]: choice }),
      {},
    );

    return { dataSource, mapData };
  }
}

function getWaFlowElementIdFromQuestionId(qId: string, map: WaFlowMap) {
  try {
    for (const [elementId, { questionId }] of Object.entries(map)) {
      if (questionId === qId) return elementId;
    }
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

/**
 * Moves a screen element to a new position.
 * @param screenId id of the screen to be moved
 * @param position index of where the screen is to be inserted.
 * @param draft UseImmer draft object to save the updated flowJson
 * */
function moveFlowScreen(screenId: string, position: number, draft: WaFlowJson) {
  const currentIndex = draft.screens.findIndex((s) => s.id === screenId);
  const currentScreen = draft.screens[currentIndex];

  draft.screens.splice(position, 0, currentScreen);

  if (position < currentIndex) {
    draft.screens.splice(currentIndex + 1, 1);
  } else {
    draft.screens.splice(currentIndex, 1);
  }
}
