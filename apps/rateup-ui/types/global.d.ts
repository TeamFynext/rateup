// Any modification to this file should be reflected in the backend
import { QuestionType } from "./enums";
export {};
declare global {
  type Question = {
    title: Zod.RecordType<string, string>;
    description: Zod.RecordType<string, string>;
    required: boolean;
    type: QuestionType;
    choices?: Zod.RecordType<string, Array<string>>;
    id: string;
  };

  type Survey = {
    id: string
    title: string
    description: string | null
    questions: Question[]
    languages: string[]
    active: boolean,
    createdBy: string
    createdAt: string
    teamId: string
  }
}