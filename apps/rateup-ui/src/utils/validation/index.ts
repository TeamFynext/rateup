import { QuestionType } from "@/types/enums.ts";

/**
 * MultiTextInput questions store a rule list per field key; every other
 * question stores the named `length`/`wordCount`/`textType` rules.
 */
export function isFieldKeyedRules(
  rules: QuestionValidationRules,
): rules is Record<string, ValidationFieldRule[]> {
  return Object.values(rules).some((value) => Array.isArray(value));
}

function validateLength(input: string | number, min?: number | string, max?: number | string) {
  // Rules are stored as strings; `Number(undefined)` is NaN, so an unset bound
  // compares false and the rule passes — the same as the untyped comparison did.
  const length = input.toString().length;
  if (length < Number(min) || length > Number(max)) {
    return false;
  }
  return true;
}

function validateWordCount(input: string, min?: number | string, max?: number | string) {
  const words = input.split(" ");
  if (words.length < Number(min) || words.length > Number(max)) {
    return false;
  }
  return true;
}

function validateTextType(input: string, type?: string) {
  if (type === "Letters") {
    const regex = /^[a-zA-Z\s]+$/;
    return regex.test(input);
  } else if (type === "Letters_&_Numbers") {
    const regex = /^[a-zA-Z0-9\s]+$/;
    return regex.test(input);
  } else if (type === "Numbers") {
    const regex = /^[0-9\s]+$/;
    return regex.test(input);
  }
  return true;
}

/**
 * A submitted answer: MultiTextInput questions post a record keyed by field,
 * every other question posts the answer text on its own.
 */
type QuestionInput = string | Record<string, string>;

export function validateQuestion(
  question: Question,
  input: QuestionInput,
  selectedLanguage: string,
) {
  if (question?.validationRules) {
    if (
      question?.type === QuestionType.MultiTextInput &&
      isFieldKeyedRules(question.validationRules)
    ) {
      const fieldInput = typeof input === "object" ? input : undefined;
      const fields = question?.features?.[selectedLanguage]?.fields;
      for (const field of fields) {
        if (question?.validationRules?.[field?.fieldKey]) {
          const validationRules = question?.validationRules?.[field?.fieldKey];
          for (const rule of validationRules) {
            if (rule?.ruleType === "length") {
              if (
                !fieldInput?.[field?.fieldKey] ||
                !validateLength(fieldInput?.[field?.fieldKey], rule?.min, rule?.max)
              ) {
                return rule?.errorMessage;
              }
            } else if (rule?.ruleType === "textType") {
              if (
                !fieldInput?.[field?.fieldKey] ||
                !validateTextType(fieldInput?.[field?.fieldKey], rule?.type)
              ) {
                return rule?.errorMessage;
              }
            } else if (rule?.ruleType === "required") {
              if (!fieldInput?.[field?.fieldKey] || !fieldInput?.[field?.fieldKey]?.trim().length) {
                return rule?.errorMessage;
              }
            }
          }
        }
      }
    } else if (!isFieldKeyedRules(question.validationRules)) {
      // Only the branch above produces the field-keyed record form, so the
      // answer here is the plain text the question posted.
      const textInput = input as string;
      if (question?.validationRules?.length) {
        if (
          !validateLength(
            textInput,
            question?.validationRules?.length?.min,
            question?.validationRules?.length?.max,
          )
        ) {
          return question?.validationRules?.length?.errorMessage;
        }
      }
      if (question.validationRules.wordCount) {
        if (
          !validateWordCount(
            textInput,
            question?.validationRules?.wordCount?.min,
            question?.validationRules?.wordCount?.max,
          )
        ) {
          return question?.validationRules?.wordCount?.errorMessage;
        }
      }
      if (question.validationRules.textType) {
        if (!validateTextType(textInput, question?.validationRules?.textType?.type)) {
          return question?.validationRules?.textType?.errorMessage;
        }
      }
    }
  }
  return null;
}
