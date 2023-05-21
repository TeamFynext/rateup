export {};

declare global {
  type Question = {
    title: Zod.RecordType<string, string>;
    description?: Zod.RecordType<string, string>;
    required?: boolean;
    type: QuestionType;
    choices?: Zod.RecordType<string, Array<string>>;
    id: string;
  };
}
