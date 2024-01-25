import { UseFormReturnType } from "@mantine/form";
import {
  LDResponse,
  SmileyResponse,
  YNResponse,
  QuestionType as q,
  WaFlowFormElementType as wft,
} from "../../types/enums";
import { WaFlowFormElement, WaFlowJson } from "../../types/global";
import { getNestedProperty } from "../misc/obj.utils";

export const waFlowFormToQuestionTypeMaps = {
  [wft.textInput]: [q.Text, q.Email, q.Phone, q.Number],
  [wft.textArea]: [q.TextArea],
  [wft.radioButtonsGroup]: [q.YN, q.LD, q.MCQ, q.Rating, q.Smiley, q.Opinion],
  [wft.dropDown]: [q.YN, q.LD, q.MCQ, q.Rating, q.Smiley, q.Opinion],
  [wft.checkboxGroup]: [q.MSQ],
  [wft.datePicker]: [q.DateTime],
  [wft.optIn]: [q.YN, q.LD],
};
export function getQuestionTypesFromFlowElement(
  formElement: WaFlowFormElement,
): string[] {
  switch (formElement.type) {
    case wft.textInput:
      return [q.Text, q.Email, q.Phone, q.Number];
    case wft.textArea:
      return [q.TextArea];
    case wft.dropDown:
    case wft.radioButtonsGroup: {
      const choices = formElement["data-source"];
      let types = [q.MCQ, q.CustomNPS];
      if (choices.length === 2) return types.concat([q.YN, q.LD]);
      else if (choices.length === 5) return types.concat([q.Rating, q.Smiley]);
      else if (choices.length === 10) return types.concat([q.Opinion]);
      return types;
    }
    case wft.checkboxGroup:
      return [q.MSQ];
    case wft.datePicker:
      return [q.DateTime];
    case wft.optIn:
      return [q.YN, q.LD];
    default:
      throw new Error("Invalid form element type");
  }
}

export function getQuestionResponses(qType: q) {
  switch (qType) {
    case q.YN:
      return Object.values(YNResponse);
    case q.LD:
      return Object.values(LDResponse);
    case q.Rating:
      return [1, 2, 3, 4, 5].map((i) => `${i}`);
    case q.Smiley:
      return Object.values(SmileyResponse);
    case q.Opinion:
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => `${i}`);
  }
}

export const qTypesWithAmbiguousChoices = [
  q.YN,
  q.LD,
  q.Rating,
  q.Smiley,
  q.Opinion,
];

interface validateOptionsProps {
  form: UseFormReturnType<any>;
  path: string;
}
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
export function* waFlowFormElementIterator(
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
