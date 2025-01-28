// import { describe, expect, test } from "@jest/globals";
// import {
//   LogicAction,
//   LogicCondition,
//   QuestionType,
// } from "../../../types/enums";
// import { parseLogicAction } from "./logic.utils";

// describe("MCQ", () => {
//   describe("EQUALS", () => {
//     const question: Question = {
//       id: "a",
//       type: QuestionType.MCQ,
//       logic: [
//         {
//           action: LogicAction.EndSurvey,
//           response: "1",
//           condition: LogicCondition.Equals,
//         },
//       ],
//       title: { English: "mcqE", Malayalam: "mcqM" },
//       choices: {
//         English: [{ value: "1" }, { value: "2" }, { value: "3" }],
//         Malayalam: [{ value: "mal1" }, { value: "mal2" }, { value: "3t" }],
//       },
//       required: false,
//       description: { English: "", Malayalam: "" },
//     };

//     test("lang1", () => {
//       let userResponse = { value: "2" };
//       let language = "English";
//       expect(parseLogicAction(question, userResponse, language)).toBe(
//         LogicAction.EndSurvey,
//       );
//     });
//     test("lang2", () => {
//       let userResponse = { value: "mal2" };
//       let language = "Malayalam";
//       expect(parseLogicAction(question, userResponse, language)).toBe(
//         LogicAction.EndSurvey,
//       );
//     });
//     test("lang2 choice-from-lang1-throws-error", () => {
//       let userResponse = { value: "2" };
//       let language = "Malayalam";
//       expect(parseLogicAction(question, userResponse, language)).toBe(
//         LogicAction.NextQ,
//       );
//     });
//     test("EQUALS lang1", () => {
//       let userResponse = { value: "1" };
//       let language = "English";
//       expect(parseLogicAction(question, userResponse, language)).toBe(
//         LogicAction.NextQ,
//       );
//     });
//   });

//   describe(`${LogicCondition.IncludesNoneOf} choice2 & choice3`, () => {
//     const q: Question = {
//       id: "a",
//       type: QuestionType.MCQ,
//       logic: [
//         {
//           action: LogicAction.EndSurvey,
//           response: ["1", "2"],
//           condition: LogicCondition.IncludesNoneOf,
//         },
//       ],
//       title: { English: "mcqE", Malayalam: "mcqM" },
//       choices: {
//         English: [{ value: "1" }, { value: "2" }, { value: "3" }],
//         Malayalam: [{ value: "mal1" }, { value: "mal2" }, { value: "3t" }],
//       },
//       required: false,
//       description: { English: "", Malayalam: "" },
//     };

//     test("lang1 choice1", () => {
//       let userResponse = { value: "1" };
//       let language = "English";
//       expect(parseLogicAction(q, userResponse, language)).toBe(
//         LogicAction.EndSurvey,
//       );
//     });
//     test("lang1 choice2", () => {
//       let userResponse = { value: "2" };
//       let language = "English";
//       expect(parseLogicAction(q, userResponse, language)).toBe(
//         LogicAction.NextQ,
//       );
//     });
//     test("lang2 choice3", () => {
//       let userResponse = { value: "3t" };
//       let language = "Malayalam";
//       expect(parseLogicAction(q, userResponse, language)).toBe(
//         LogicAction.NextQ,
//       );
//     });
//     test("lang2 choice1", () => {
//       let userResponse = { value: "mal1" };
//       let language = "Malayalam";
//       expect(parseLogicAction(q, userResponse, language)).toBe(
//         LogicAction.EndSurvey,
//       );
//     });
//   });
// });

// describe("MSQ", () => {
//   describe("EQUALS", () => {
//     const q: Question = {
//       id: "a",
//       type: QuestionType.MSQ,
//       logic: [
//         {
//           action: LogicAction.EndSurvey,
//           response: ["0"],
//           condition: LogicCondition.Equals,
//         },
//       ],
//       title: { English: "msqE", Malayalam: "msQM" },
//       choices: {
//         English: [{ value: "eng1" }, { value: "eng2" }],
//         Malayalam: [{ value: "mal1" }, { value: "mal2" }],
//       },
//       required: false,
//       description: { English: "", Malayalam: "" },
//     };
//     test("lang1", () => {
//       let userResponse = [{ value: "eng1" }];
//       let language = "English";
//       expect(parseLogicAction(q, userResponse, language)).toBe(
//         LogicAction.EndSurvey,
//       );
//     });
//     test("lang2", () => {
//       let userResponse = [{ value: "mal1" }];
//       let language = "Malayalam";
//       expect(parseLogicAction(q, userResponse, language)).toBe(
//         LogicAction.EndSurvey,
//       );
//     });
//     test("notEquals lang1", () => {
//       let userResponse = [{ value: "eng2" }];
//       let language = "English";
//       expect(parseLogicAction(q, userResponse, language)).toBe(
//         LogicAction.NextQ,
//       );
//     });
//   });

//   describe(`${LogicCondition.IncludesAnyOf} choice2 or choice3`, () => {
//     const q: Question = {
//       id: "a",
//       type: QuestionType.MSQ,
//       logic: [
//         {
//           action: LogicAction.EndSurvey,
//           response: ["1", "2"],
//           condition: LogicCondition.IncludesAnyOf,
//         },
//       ],
//       title: { English: "msqE", Malayalam: "msQM" },
//       choices: {
//         English: [{ value: "eng1" }, { value: "eng2" }, { value: "eng3" }],
//         Malayalam: [{ value: "mal1" }, { value: "mal2" }, { value: "mal3" }],
//       },
//       required: false,
//       description: { English: "", Malayalam: "" },
//     };

//     test("lang1 choice2", () => {
//       let userResponse = [{ value: "eng2" }];
//       let language = "English";
//       expect(parseLogicAction(q, userResponse, language)).toBe(
//         LogicAction.EndSurvey,
//       );
//     });
//     test("lang2 choice3", () => {
//       let userResponse = [{ value: "mal3" }];
//       let language = "Malayalam";
//       expect(parseLogicAction(q, userResponse, language)).toBe(
//         LogicAction.EndSurvey,
//       );
//     });
//     test("lang1 choice2 & choice3", () => {
//       let userResponse = [{ value: "eng2" }, { value: "eng3" }];
//       let language = "English";
//       expect(parseLogicAction(q, userResponse, language)).toBe(
//         LogicAction.EndSurvey,
//       );
//     });
//     test("lang2 empty", () => {
//       let userResponse = [];
//       let language = "Malayalam";
//       expect(parseLogicAction(q, userResponse, language)).toBe(
//         LogicAction.NextQ,
//       );
//     });
//     test("lang1 choice1", () => {
//       let userResponse = [{ value: "eng1" }];
//       let language = "English";
//       expect(parseLogicAction(q, userResponse, language)).toBe(
//         LogicAction.NextQ,
//       );
//     });
//   });

//   describe(`${LogicCondition.IncludesNoneOf} choice2 and choice3`, () => {
//     const q: Question = {
//       id: "a",
//       type: QuestionType.MSQ,
//       logic: [
//         {
//           action: LogicAction.EndSurvey,
//           response: ["1", "2"],
//           condition: LogicCondition.IncludesNoneOf,
//         },
//       ],
//       title: { English: "msqE", Malayalam: "msQM" },
//       choices: {
//         English: [{ value: "eng1" }, { value: "eng2" }, { value: "eng3" }],
//         Malayalam: [{ value: "mal1" }, { value: "mal2" }, { value: "mal3" }],
//       },
//       required: false,
//       description: { English: "", Malayalam: "" },
//     };

//     test("lang1 choice1", () => {
//       let userResponse = [{ value: "eng1" }];
//       let language = "English";
//       expect(parseLogicAction(q, userResponse, language)).toBe(
//         LogicAction.EndSurvey,
//       );
//     });

//     test("lang1 choice2", () => {
//       let userResponse = [{ value: "eng2" }];
//       let language = "English";
//       expect(parseLogicAction(q, userResponse, language)).toBe(
//         LogicAction.NextQ,
//       );
//     });
//     test("lang2 choice3", () => {
//       let userResponse = [{ value: "mal3" }];
//       let language = "Malayalam";
//       expect(parseLogicAction(q, userResponse, language)).toBe(
//         LogicAction.NextQ,
//       );
//     });
//     test("lang1 choice2 & choice3", () => {
//       let userResponse = [{ value: "eng2" }, { value: "eng3" }];
//       let language = "English";
//       expect(parseLogicAction(q, userResponse, language)).toBe(
//         LogicAction.NextQ,
//       );
//     });
//   });
// });

// describe(`${QuestionType.Rating}`, () => {
//   const q: Question = {
//     id: "a",
//     type: QuestionType.Rating,
//     logic: [
//       {
//         action: LogicAction.EndSurvey,
//         response: "4",
//         condition: LogicCondition.Equals,
//       },
//     ],
//     title: { English: "rat", Malayalam: "ratM\n" },
//     required: false,
//     description: { English: "", Malayalam: "" },
//   };

//   test("lang1 correct-choice", () => {
//     let userResponse = 4;
//     let language = "English";
//     expect(parseLogicAction(q, userResponse, language)).toBe(
//       LogicAction.EndSurvey,
//     );
//   });
//   test("lang1 wrong-choice", () => {
//     let userResponse = 3;
//     let language = "English";
//     expect(parseLogicAction(q, userResponse, language)).toBe(LogicAction.NextQ);
//   });
// });
