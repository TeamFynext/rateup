import { QuestionType } from "@/types/enums.ts";

function validateLength(input, min, max) {
  if (input.toString().length < min || input.toString().length > max) {
    return false;
  }
  return true;
}

function passwordValidation(value) {
  if (!value) {
    return "Password is required";
  }
  if (value.length < 5) {
    return "Password should be at least 5 characters long";
  }
  if (!/\d/.test(value) || !/[a-zA-Z]/.test(value)) {
    return "Password should contain at least one letter and one number";
  }
  return null; // Validation passed
}

function validateWordCount(input, min, max) {
  const words = input.split(" ");
  if (words.length < min || words.length > max) {
    return false;
  }
  return true;
}

function validateTextType(input, type) {
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

export function validateQuestion(question, input, selectedLanguage) {
  if (question?.validationRules) {
    if ([QuestionType.MultiTextInput].includes(question?.type)) {
      const fields = question?.features?.[selectedLanguage]?.fields;
      for (const field of fields) {
        if (question?.validationRules?.[field?.fieldKey]) {
          const validationRules = question?.validationRules?.[field?.fieldKey];
          for (const rule of validationRules) {
            if (rule?.ruleType === "length") {
              if (
                !input?.[field?.fieldKey] ||
                !validateLength(input?.[field?.fieldKey], rule?.min, rule?.max)
              ) {
                return rule?.errorMessage;
              }
            } else if (rule?.ruleType === "textType") {
              if (
                !input?.[field?.fieldKey] ||
                !validateTextType(input?.[field?.fieldKey], rule?.type)
              ) {
                return rule?.errorMessage;
              }
            } else if (rule?.ruleType === "required") {
              if (
                !input?.[field?.fieldKey] ||
                !input?.[field?.fieldKey]?.trim().length
              ) {
                return rule?.errorMessage;
              }
            }
          }
        }
      }
    } else {
      if (question?.validationRules?.length) {
        if (
          !validateLength(
            input,
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
            input,
            question?.validationRules?.wordCount?.min,
            question?.validationRules?.wordCount?.max,
          )
        ) {
          return question?.validationRules?.wordCount?.errorMessage;
        }
      }
      if (question.validationRules.textType) {
        if (
          !validateTextType(input, question?.validationRules?.textType?.type)
        ) {
          return question?.validationRules?.textType?.errorMessage;
        }
      }
    }
  }
  return null;
}
