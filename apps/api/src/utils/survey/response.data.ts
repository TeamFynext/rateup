import { faker } from "@faker-js/faker";
import { LDResponse, QuestionType, SmileyResponse, YNResponse } from "../../types/enums.js";
import { ResponsePlatform } from "../../../generated/prisma/client.js";
import { load } from "cheerio";
import { CreateResponseInput } from "../../modules/response/response.schema.js";

export const generateResponseData = (
  surveyTeamMapId: string,
  survey: { questions: Question[]; languages: string[] },
) => {
  const deviceData: CreateResponseInput["deviceData"] | null = null;
  const contactId: string | null = null;
  return {
    surveyTeamMapId: surveyTeamMapId,
    responses: getResponseFromQuestion(survey.questions),
    language: survey.languages[0],
    platform: ResponsePlatform.WEB,
    tag: "",
    ip: faker.internet.ipv4(),
    location: {},
    deviceData,
    contactId,
  };
};

const getResponseFromQuestion = (question: Question[] = []) => {
  return question?.map((data) => {
    let response;

    switch (data.type as QuestionType) {
      case QuestionType.Contact:
        // A Contact question's per-language features are keyed by sub-field
        // name (name/email/phone), each a QuestionFeatureToggle.
        const firstFeature: QuestionFeatures | undefined = Object.values(data?.features ?? {})[0];
        const isEnabled = (subField: string) =>
          (firstFeature?.[subField] as QuestionFeatureToggle | undefined)?.isEnabled === true;

        response = {
          ...(isEnabled("name") && {
            name: faker.person.fullName(),
          }),
          ...(isEnabled("email") && {
            email: faker.internet.email(),
          }),
          ...(isEnabled("phone") && {
            phone: faker.phone.number(),
          }),
        };
        break;
      case QuestionType.Rating:
        response = faker.number.int({ min: 1, max: 5 });
        break;

      case QuestionType.Smiley:
        response = faker.helpers.arrayElement(Object.values(SmileyResponse));
        break;

      case QuestionType.LD:
        response = faker.helpers.arrayElement(Object.values(LDResponse));
        break;

      case QuestionType.YN:
        response = faker.helpers.arrayElement(Object.values(YNResponse));
        break;

      case QuestionType.Opinion:
        response = faker.number.int({ min: 1, max: 10 });
        break;

      case QuestionType.Text:
        response = faker.lorem.lines(1);
        break;

      case QuestionType.TextArea:
        response = faker.lorem.paragraph();
        break;

      case QuestionType.Number:
        response = faker.number.bigInt();
        break;

      case QuestionType.Date:
        response = faker.date.anytime()?.toString();
        break;

      case QuestionType.Photo:
        //photo url need to be changed to an image key
        response = faker.lorem.lines(1);
        break;

      case QuestionType.Testimonial:
        response = {
          name: faker.person.fullName(),
          rating: faker.number.int({ min: 1, max: 5 }),
          jobTitle: faker.person.jobTitle(),
          testimonial: faker.lorem.sentence(),
        };
        break;

      case QuestionType.MCQ:
      case QuestionType.DDSS:
      case QuestionType.PCQ:
      case QuestionType.CustomNPS:
        const singleValue = (Object.values(data?.choices ?? {})[0] ?? []) as Choice[];

        response = faker.helpers.arrayElement(singleValue);
        break;

      case QuestionType.MSQ:
      case QuestionType.DDMS:
        const multipleValues = (Object.values(data?.choices ?? {})[0] ?? []) as Choice[];
        response = faker.helpers.arrayElements(multipleValues);
        break;
      case QuestionType.TnC:
        response = faker.helpers.arrayElement([true, false]);
        break;
      default:
        response = [];
        break;
    }
    return {
      type: data?.type,
      response: {
        [data.type]: response,
      },
      questionId: data?.id,
    };
  });
};
export function isHtml(str: string) {
  const regex = /<[^>]+>/g; // Matches any opening and closing tag (ignores content)
  return regex?.test(str);
}
export const extractText = (htmlContent: string) => {
  // Regular expression to remove htmlContent tags
  const regex = /(<([^>]+)>|&nbsp;)/gi;
  // Extract text from htmlContent by replacing htmlContent tags with an empty string
  return htmlContent?.replace(regex, "");
};

export const getContent = (title: string) => {
  if (isHtml(title)) return extractText(getReplacedTitleFromVariable({ title }) || title);
  else return title;
};

export const getPropValueFromQuestionCustomComponent = (
  str: string,
  componentName = "variable-component",
  prop = "label",
) => {
  const doc = load(str);
  const labels: string[] = [];
  const customComponents = doc(componentName);
  if (!customComponents?.length) return null;
  customComponents.each((index, component) => {
    const label = doc(component).attr(prop);
    if (label) {
      labels.push(label);
    }
  });
  return labels;
};

interface IReplaceTitleForVar {
  title: string;
  prop?: string;
  componentName?: string;
}

export const getReplacedTitleFromVariable = ({
  title,
  prop = "label",
  componentName = "variable-component",
}: IReplaceTitleForVar) => {
  const doc = load(title);
  const variables = getPropValueFromQuestionCustomComponent(title, componentName, prop);
  if (!variables) return null;
  variables.forEach((value) => {
    const component = doc(`${componentName}[${prop}="${value}"]`).first();
    if (component?.length) {
      component.replaceWith(`{${value}}`);
    }
  });
  return doc("body").html();
};
