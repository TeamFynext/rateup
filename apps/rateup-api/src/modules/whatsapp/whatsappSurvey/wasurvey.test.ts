import { describe, expect, test } from "@jest/globals";
import { parseStartMessage } from "./wasurvey.utils";
import { WaFlowStartMessageSurveyIdentifier } from "../../../types/enums";

describe("wasurvey utils", () => {
  test("Should parse surveyTeamMapId from start message", () => {
    const surveyTeamMapId = "648b33db69ca1ca276aabdbe";
    const startMessage = `Send this message to start the survey.
blah \`|st| ${surveyTeamMapId}\` blah
some suffix text`;

    const res = parseStartMessage(startMessage);

    expect(res).not.toBeNull();
    expect(res.type).toEqual(WaFlowStartMessageSurveyIdentifier.ID);
    expect(res.surveyTeamMapId).toEqual(surveyTeamMapId);
  });

  test("Should parse survey name with spaces from start message", () => {
    const surveyName = `Survey Name with spaces`;
    const teamCode = "MAIN";
    const startMessage = `Send this message to start the survey.
\`|sn| ${surveyName} @${teamCode}\`
some suffix text`;

    const res = parseStartMessage(startMessage);

    expect(res).not.toBeNull();
    expect(res.type).toEqual(WaFlowStartMessageSurveyIdentifier.NAME);
    expect(res.surveyName).toEqual(surveyName);
    expect(res.teamCode).toEqual(teamCode);
  });

  test("Should return null if surveyTeamMapId is not found", () => {
    const startMessage = `Send this message to start the survey. \`code\``;
    const res = parseStartMessage(startMessage);
    expect(res).toBeNull();
  });
});
