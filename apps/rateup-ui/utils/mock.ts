import { QuestionType } from "../types";
import { faker } from '@faker-js/faker';
export function mockQuestion() {
  return {
    type: QuestionType.Text,
    title: {
      "English": faker.lorem.sentence(4)
    },
    description: {
      "English": faker.lorem.sentence(10)
    }
  }
}