import prisma, { excludeFields } from "../../utils/prisma";

import { getTeamsByUserId } from "../team/team.service";
const CryptoJS = require("crypto-js");
const secretPassphrase = "rateup-#$%^@#-passphrase";

//--------------get landing page by id
export async function getLandingPageById(id: string) {
  const survey = await prisma.surveyLanding.findUnique({
    where: {
      id,
    },
  });

  if (!survey) {
    throw new Error(`Could not find survey with id ${id}`);
  }
  return survey;
}

//-------delete landing page by id ----
export async function deleteLandingPageById(id: string) {
  const LandingPage = await prisma.surveyLanding.delete({
    where: {
      id,
    },
  });
  return LandingPage;
}
