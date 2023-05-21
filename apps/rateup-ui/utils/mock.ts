import { faker } from '@faker-js/faker';
import { QuestionType } from '../types/enums';

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