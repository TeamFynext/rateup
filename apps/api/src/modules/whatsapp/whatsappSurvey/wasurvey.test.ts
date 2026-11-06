import { describe, expect, test } from "vitest";
import { parseStartMessage } from "./wasurvey.utils.js";

describe("wasurvey utils", () => {
  test("Should parse survey name with spaces from start message", () => {
    const surveyName = `Survey Name with spaces`;
    const teamCode = "MAIN";
    const startMessage = `Send this message to start the survey.
\`#${surveyName} @${teamCode}\`
some suffix text`;

    const res = parseStartMessage(startMessage);

    expect(res).not.toBeNull();
    if (!res) throw new Error("expected parseStartMessage to return a non-null result");
    expect(res.surveyName).toEqual(surveyName);
    expect(res.teamCode).toEqual(teamCode);
  });

  test("Should return null if surveyTeamMapId is not found", () => {
    const startMessage = `Send this message to start the survey. \`code\``;
    const res = parseStartMessage(startMessage);
    expect(res).toBeNull();
  });

  test("Should parse special characters in survey name", () => {
    const surveyName = `Survey Name with special characters !@#$%^&*()_+`;
    const teamCode = "MAIN";
    const startMessage = `Send this message to start the survey.
\`#${surveyName} @${teamCode}\`
some suffix text`;

    const res = parseStartMessage(startMessage);

    expect(res).not.toBeNull();
    if (!res) throw new Error("expected parseStartMessage to return a non-null result");
    expect(res.surveyName).toEqual(surveyName);
    expect(res.teamCode).toEqual(teamCode);
  });
});
