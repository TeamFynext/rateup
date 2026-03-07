import { faker } from "@faker-js/faker";

import { QuestionType as Q } from "../types/enums";

export function mockQuestion() {
  return {
    type: Q.Text,
    title: {
      English: faker.lorem.sentence(4),
    },
    description: {
      English: faker.lorem.sentence(10),
    },
  };
}
