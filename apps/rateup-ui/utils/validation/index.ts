export function validateLength(input, min, max) {
  if (input.toString().length < min || input.toString().length > max) {
    return false;
  }
  return true;
}


export function validateWordCount(input, min, max) {
  var words = input.split(' ');
  if (words.length < min || words.length > max) {
    return false;
  }
  return true;
}

export function validateTextType(input, type) {
  if (type === 'Letters') {
    var regex = /^[a-zA-Z\s]+$/;
    return regex.test(input);
  } else if (type === 'Letters_&_Numbers') {
    var regex = /^[a-zA-Z0-9\s]+$/;
    return regex.test(input);
  }
  return true;
}

export function validateQuestion(question, input) {
  if (question?.validationRules) {
    if (question?.validationRules?.length) {
          if (!validateLength(input, question?.validationRules?.length?.min, question?.validationRules?.length?.max)) {
        return question?.validationRules?.length?.errorMessage;
      }
    }
    if (question.validationRules.wordCount) {
      if (!validateWordCount(input, question?.validationRules?.wordCount?.min, question?.validationRules?.wordCount?.max)) {
        return question?.validationRules?.wordCount?.errorMessage;
      }
    }
    if (question.validationRules.textType) {
      if (!validateTextType(input, question?.validationRules?.textType?.type)) {
        return question?.validationRules?.textType?.errorMessage;
      }
    }
  }
  return null;
}