import { faker } from "@faker-js/faker";
import {
  LDResponse,
  QuestionType,
  SmileyResponse,
  YNResponse,
} from "../../types/enums";
import { ResponsePlatform } from "@prisma/client";

export const generateResponseData = (surveyTeamMapId, survey) => {
  return {
    surveyTeamMapId: surveyTeamMapId,
    responses: getResponseFromQuestion(survey.questions),
    language: survey.languages[0],
    platform: ResponsePlatform.WEB,
    tag: "",
    ip: faker.internet.ipv4(),
    location: {},
    deviceData: null,
    contactId: null,
  };
};

const getResponseFromQuestion = (question = []) => {
  return question?.map((data) => {
    let response;

    switch (data.type as QuestionType) {
      case QuestionType.Contact:
        const features = data?.features;

        response = {
          ...(Object.values(features as { name: { isEnabled: boolean } }[])?.[0]
            ?.name?.isEnabled && {
            name: faker.person.fullName(),
          }),
          ...(Object.values(
            features as { email: { isEnabled: boolean } }[],
          )?.[0]?.email?.isEnabled && {
            email: faker.internet.email(),
          }),
          ...(Object.values(
            features as { phone: { isEnabled: boolean } }[],
          )?.[0]?.phone?.isEnabled && {
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

      case QuestionType.DateTime:
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
        const singleValue: any = Object.values(data?.choices ?? {})[0] ?? [];

        response = faker.helpers.arrayElement(singleValue);
        break;

      case QuestionType.MSQ:
      case QuestionType.DDMS:
        const multipleValues: any = Object.values(data?.choices ?? {})[0] ?? [];
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
