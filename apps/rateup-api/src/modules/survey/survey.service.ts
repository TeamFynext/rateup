import prisma, { excludeFields } from "../../utils/prisma";
import {
  CreateSurveyInput,
  CreateSurveyLandingInput,
  UpdateGoogleLinkInput,
  UpdateLandingPageInput,
  UpdateSurveyInput,
  UpdateSurveyPassword,
} from "./survey.schema";
import { getTeamsByUserId } from "../team/team.service";
import defaultTheme from "../welcomeTheme/defaultTheme";
import { QuestionType } from "../../types/enums";
const CryptoJS = require("crypto-js");
const secretPassphrase = "rateup-#$%^@#-passphrase";

export async function createSurvey(
  input: CreateSurveyInput,
  createdBy: string
) {
  const teamIds = input?.teamIds?.map(teamId => ({ teamId }))
  const survey = await prisma.survey.create({
    data: {
      // ...input,
      title: input.title,
      languages: input.languages,
      createdBy,
      teams: {
        create: teamIds,
      },
    },
   });
   
  //-------------create a default landing page theme todo-------------

  let landingData = defaultTheme;

  let LandingPage = await prisma.welcomeTheme.create({
    data: {
      ...landingData,
      headerText: landingData.headerText,
      descText: landingData.descText,
      buttonText: landingData.buttonText,
      headerStyles: landingData.headerStyles,
      descStyles: landingData.descStyles,
      buttonStyles: landingData.buttonStyles,
      bgStyles: landingData.bgStyles,
      logoStyles: landingData.logoStyles,
      surveyId: survey.id,
      bgUrl: landingData.bgUrl,
      bgType: landingData.bgType,
    },
  });

  let surveyRes = {...survey, teamIds: input?.teamIds}

  return surveyRes;
}

//----------------create survey landing-----------------
export async function createSurveyLanding(
  input: CreateSurveyLandingInput,
  createdBy: string
) {
  const Landing = await prisma.surveyLanding.create({
    data: {
      ...input,
      title: input.title,
      // teamId: input.teamId,
      createdBy,
    },
  });
  //-------------create a default landing page theme todo-------------

  let landingData = defaultTheme;

  let LandingPage = await prisma.welcomeTheme.create({
    data: {
      ...landingData,
      headerText: landingData.headerText,
      descText: landingData.descText,
      buttonText: landingData.buttonText,
      headerStyles: landingData.headerStyles,
      descStyles: landingData.descStyles,
      buttonStyles: landingData.buttonStyles,
      bgStyles: landingData.bgStyles,
      logoStyles: landingData.logoStyles,
      landingId: Landing.id,
      bgUrl: landingData.bgUrl,
      bgType: landingData.bgType,
    },
  });
  return Landing;
}
//----------------update survey landing page details-----------------
export async function updateSurveyLanding(
  id,
  input: UpdateLandingPageInput
  // createdBy: string
) {
  const Landing = await prisma.surveyLanding.update({
    where: {
      id,
    },
    data: input,
  });
  return Landing;
}

//TODO verify SURVEYTEAMMAPS
export async function cloneSurvey(
  surveyId: string,
  userId: string,
  teamId: string
) {
  const survey = await prisma.survey.findUnique({
    where: {
      id: surveyId,
    },
  });

  if (survey) {
    const { id, ...surveyWithoutId } = survey;

    const existingSurveys = await prisma.survey.findMany({
      where: {
        AND: [
          {
            title: {
              startsWith: survey.title,
            },
          },
          // {
          //   surveyTeamMaps: {
          //     some: {
          //       teamId: survey.teamId,
          //     },
          //   },
          // },
        ],
      },
      orderBy: {
        title: "asc",
      },
    });

    let maxCopyNumber = 0;

    existingSurveys.forEach((existingSurvey) => {
      const suffix = existingSurvey.title.slice(survey.title.length);
      if (suffix.startsWith(" Copy ")) {
        const copyNumberStr = suffix.slice(" Copy ".length);
        const copyNumber = parseInt(copyNumberStr, 10);
        console.log(
          `Suffix: '${suffix}', Copy number string: ${copyNumberStr}, Copy number: ${copyNumber}`
        );
        if (!isNaN(copyNumber)) {
          maxCopyNumber = Math.max(maxCopyNumber, copyNumber);
          console.log("Found a valid copy number: ", maxCopyNumber);
        }
      }
    });

    const clonedSurvey = {
      ...surveyWithoutId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: null,
      teamId: teamId,
      title: `${survey.title} Copy ${maxCopyNumber + 1}`,
    };

    const newSurvey = await prisma.survey.create({
      data: clonedSurvey,
    });

    return newSurvey;
  } else {
    return "Survey not found to duplicate";
  }
}

export async function getSurveyById(id: string) {
  const survey = await prisma.survey.findUnique({
    where: {
      id,
    },
    // include: {
    //   surveyStats: true,
    // },
    //TODO verify SURVEYTEAMMAPS

  });

  if (!survey) {
    throw new Error(`Could not find survey with id ${id}`);
  }
  return survey;
}


//-----------get public survey with org logo -------

 export async function getPublicSurveyById(id: string) {
//   const survey = await prisma.survey.findUnique({
//     where: {
//       id,
//     }
//   });

//   if (!survey) {
//     throw new Error(`Could not find survey with id ${id}`);
//   }

//   let org = await prisma.team.findUnique({
//     where: {
//       id : survey?.teamId,
//     },
//     include: {
//       org: true,
//     },
//   });

//   let orgLogo ={ orgLogo : org?.org?.logo}
//   let publicSurvey = { ...survey, ...orgLogo}

//   return publicSurvey;
 }
//TODO verify SURVEYTEAMMAPS



//---------------get lnding page by landingId------------
export async function getSurveyBylandingId(landingid: string) {
  const Landingpages = await prisma.surveyLanding.findUnique({
    where: {
      id: landingid,
    },
  });
  //-------------form array if survey ids ---------
  let surveyIds = [];
  for (let i = 0; i < Landingpages?.surveys?.length; i++) {
    surveyIds.push(Landingpages.surveys[i]);
  }

  //----------get surveys from surveyids------------
  const surveyResponse = await prisma.survey.findMany({
    where: {
      id: {
        in: surveyIds,
      },
    },
  });

  if (!Landingpages || Landingpages.surveys.length == 0) {
    throw new Error(`Could not find survey with id ${landingid}`);
  }
  return surveyResponse;
}

//TODO verify SURVEYTEAMMAPS

 export async function getGoogleUrlBySurveyId(id: string) {
//   const survey = await prisma.survey.findUnique({
//     where: {
//       id,
//     },
//     select: {
//       teamId: true,
//     },
//   });

//   if (survey) {
//     const team = await prisma.team.findUnique({
//       where: {
//         id: survey.teamId,
//       },
//       select: {
//         googleLink: true,
//       },
//     });

//     return team;
//   } else {
//     return { error: "Survey not found" };
//   }
 }


//------------get ALL Surveys list of a logged user (without qns)--------

 export async function getSurveysByUserId(userId: string) {
  const teamData = await getTeamsByUserId(userId);
  const teamIds: string[] = teamData?.map(
    (item: { teamId: string }) => item?.teamId
  );

  const surveyTeamMaps = await prisma.surveyTeamMap.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
    },
    include: {
      survey: true,
    },
  });

  const surveys = surveyTeamMaps?.map(surveyTeamMap => {
    const survey = { ...surveyTeamMap.survey,  teamId : surveyTeamMap.teamId };
    return excludeFields(survey, ["questions", "password"]);
  });

  // const uniqueSurveys = Array.from(new Set(surveys.map(survey => survey?.id)))
  // ?.map(id => surveys?.find(survey => survey.id === id))
  // ?.map(survey => excludeFields(survey, ["questions", "password"]));
  
  return surveys;
 }


/**
 * Returns surveys from ALL TEAMs in which the user is a member of
 * @param userId
 * @returns Array of surveys without questions
 */

//------------get web survey list --------
 export async function getWebSurveysByUserId(userId: string) {
  const teamData = await getTeamsByUserId(userId);
  const teamIds: string[] = teamData?.map(
    (item: { teamId: string }) => item?.teamId
  );

  const surveyTeamMaps = await prisma.surveyTeamMap.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
    },
    include: {
      survey: true,
    },
  });

  const allSurveys = surveyTeamMaps?.map(surveyTeamMap => {
    const survey = { ...surveyTeamMap.survey,  teamId : surveyTeamMap.teamId };
    return excludeFields(survey, ["questions", "password"]);
  });

  const webSurveys = allSurveys.filter(survey => survey?.type === 'web')
  return webSurveys;
 }


//------------get whatsapp survey list --------
export async function getWhatsappSurveysByUserId(userId: string, type: string) {
  const teamData = await getTeamsByUserId(userId);
  const teamIds: string[] = teamData?.map(
    (item: { teamId: string }) => item?.teamId
  );

  const surveyTeamMaps = await prisma.surveyTeamMap.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
    },
    include: {
      survey: true,
    },
  });

  const allSurveys = surveyTeamMaps?.map(surveyTeamMap => {
    const survey = { ...surveyTeamMap.survey,  teamId : surveyTeamMap.teamId };
    return excludeFields(survey, ["questions", "password"]);
  });

  const whatsAppSurveys = allSurveys.filter(survey => survey?.type === type)
  return whatsAppSurveys;
 }



//------------SURVEY SUMMARY  ----
//-----Returns summary(responses, stats) of active surveys -- from ALL TEAMs in which the user is a member of 

 export async function getActiveSurveysSummmaryByUserId(userId: string) {
  const teamData = await getTeamsByUserId(userId);
  const teamIds: string[] = teamData.map(
    (item: { teamId: string }) => item.teamId
  );

  const surveyTeamMaps = await prisma.surveyTeamMap.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
    },
    include: {
      survey: true,
      responses: {
        select: {
          id: true,
          createdAt: true,
        },
      },
      surveyStats: true,
      team: {
        select: {
          name: true,
        },
      },
    },
  });

  const allSurveys = surveyTeamMaps?.map(surveyTeamMap => {
    const surveys = { 
      ...surveyTeamMap.survey, 
      teamId : surveyTeamMap.teamId,
      responses: surveyTeamMap.responses,
      surveyStats: surveyTeamMap.surveyStats,
      team: surveyTeamMap.team.name
    };
    return surveys;
  });

  const activeSurveys = allSurveys.filter(survey => survey?.active === true)
  .map(({ id, title, active, createdAt, type, surveyStats, responses, team }) => ({
    id,
    title,
    active,
    createdAt,
    type,
    surveyStats,
    responses,
    team
  }));

  let summaryData = {
    totalTeamsCount : teamData?.length,
    totalSurveysCount: allSurveys?.length,
    activeSurveysCount: activeSurveys?.length,
    surveys: activeSurveys
  }

  return summaryData;
 }

//------------get survey landing survey list --------
export async function getSurveyLandingByUserId(userId: string) {
  const surveysLanding = await prisma.surveyLanding.findMany({
    where: { createdBy: userId },
  });

  return surveysLanding;
}



 //------------get survey list  by team id --------
 export async function getSurveysByTeam(teamId: string) {

  const surveyTeamMaps = await prisma.surveyTeamMap.findMany({
    where: {
      teamId
    },
    include: {
      survey: true,
    },
  });

  const surveysWithoutQuestions = surveyTeamMaps?.map(surveyTeamMap => {
    const survey = { ...surveyTeamMap.survey };
    return excludeFields(survey, ["questions", "password"]);
  });

  return surveysWithoutQuestions;
 }


//------------DELETE SURVEY by id --------
export async function deleteSurveyById(id: string) {
  const survey = await prisma.survey.delete({
    where: {
      id,
    },
  });
  return survey;
}


//------------UPDATE SURVEY by id --------
export async function updateSurveyById(id: string, input: UpdateSurveyInput) {

  let action = 'edit'

  if ('isPublished' in input) {
    action = 'publish'
    if(input?.isPublished === true){   //check for all language inputs
        const fetchedSurvey = await prisma.survey.findUnique({
          where: {
            id,
          },
        });

        if(fetchedSurvey?.questions.length < 1){
          let data = {
            status: "failed",
            data: {
              error: "No questions found."
            }
          }
          return data
        }

        let result = validateSurvey(fetchedSurvey);
        
        if(result?.length){
          let groupedSurveys = {};
          // group the survey errors
          result.forEach(survey => {
            if (!groupedSurveys[survey.id]) {
              groupedSurveys[survey.id] = {
                id: survey.id,
                title: survey.title,
                errors: []
              };
            }
            groupedSurveys[survey.id].errors.push(survey.error);
          });

          let combinedResult = Object.values(groupedSurveys);

          let data = {
            status: "failed",
            data: combinedResult
          }
          return data
        }
    }else{
      action = 'unpublish'
    }
  }

  const survey = await prisma.survey.update({
    where: {
      id,
    },
    data: input,
  });

  let data = {
    status: "success",
    action: action,
    data: survey
  }
  return data
}

function validateSurvey(surveyData) {
    let languages = surveyData?.languages ?? [];
    let incompleteQuestions = [];

    surveyData?.questions?.forEach(question => {
        // Check if title contains all languages
        let titleLanguages = question?.title ? Object.keys(question.title) : [];
        let missingLangTitle = languages.filter(lang => !titleLanguages.includes(lang));
        if(missingLangTitle.length > 0) {
            incompleteQuestions.push({id: question?.id, title: question?.title, error: `Missing title for languages: ${missingLangTitle.join(', ')}`});
        }

        if([QuestionType.MCQ, QuestionType.MSQ, QuestionType.DDSS, QuestionType.DDMS].includes(question?.type)) {
            if(question?.choices) {
                let choiceLanguages = Object.keys(question.choices);
                let missingLangChoices = languages.filter(lang => !choiceLanguages.includes(lang));
                if(missingLangChoices.length > 0) {
                    incompleteQuestions.push({id: question.id, title: question.title, error: `Missing choices for languages: ${missingLangChoices.join(', ')}`});
                }

                // Check if all languages have the maximum number of choices
                let maxChoices = Math.max(...Object.values(question.choices).map((choiceArr: any[])=> choiceArr?.length));
                let unequalChoices = Object.values(question.choices).some((choiceArr: any[]) => choiceArr?.length < maxChoices);
                if(unequalChoices) {
                    incompleteQuestions.push({id: question.id, title: question.title, error: `All languages must have ${maxChoices} choices.`});
                }

                // Check for minimum 2 choices
                let insufficientChoices = Object.values(question.choices).some((choiceArr: any[]) => choiceArr.length < 2);
                if(insufficientChoices) {
                    incompleteQuestions.push({id: question.id, title: question.title, error: 'Minimum 2 choices required for all languages.'});
                }
            } else {
                // If choices are not present but the question type requires choices
                incompleteQuestions.push({id: question.id, title: question.title, error: 'Choices are required but missing for some languages.'});
            }
        }
    });

    return incompleteQuestions;
}



 export async function updateGoogleLink(
  id: string,
  data: UpdateGoogleLinkInput
) {
//   const survey = await prisma.survey.findUnique({
//     where: {
//       id,
//     },
//     select: {
//       teamId: true,
//     },
//   });

//   if (survey) {
//     const team = await prisma.team.update({
//       where: {
//         id: survey.teamId,
//       },
//       data: {
//         googleLink: data.googleLink,
//       },
//     });

//     return team;
//   } else {
//     return { error: "Survey not found" };
//   }
 }
//TODO verify SURVEYTEAMMAPS


export async function updateSurveyPassword(
  id: string,
  data: UpdateSurveyPassword
) {
  let isProtected = true;
  let password = data.password;
  try {
    if (data.password === "_remove_pwd") {
      isProtected = false;
      password = "";
    } else {
      isProtected = true;
      password = CryptoJS.AES.encrypt(password, secretPassphrase).toString();
    }
    const survey = await prisma.survey.update({
      where: {
        id,
      },
      data: {
        password,
        isProtected,
      },
    });
    return survey;
  } catch (error) {
    console.error("Failed to update survey password:", error);
    throw error;
  }
}

export async function verifySurveyPassword(
  id: string,
  data: UpdateSurveyPassword
) {
  let enteredPassword = data.password;
  try {
    const survey = await prisma.survey.findUnique({
      where: { id },
    });
    if (!survey) {
      throw new Error(`Survey not found`);
    }

    const decryptedPassword = CryptoJS.AES.decrypt(
      survey.password,
      secretPassphrase
    ).toString(CryptoJS.enc.Utf8);

    if (survey.isProtected && decryptedPassword === enteredPassword) {
      return "Access granted";
    } else {
      return "Password Error";
    }
  } catch (error) {
    throw new Error(`Internal server error`);
  }
}

 export async function updateVisitedSurvey(id: string) {
//   let surveyStats;
//   try {
//     surveyStats = await prisma.surveyStats.update({
//       where: { surveyId: id },
//       data: { visited: { increment: 1 } },
//     });
//   } catch (error: any) {
//     if (error?.code === "P2025") {
//       // Record not found error
//       surveyStats = await prisma.surveyStats.create({
//         data: { surveyId: id, visited: 1 },
//       });
//     } else {
//       throw error;
//     }
//   }
//   return surveyStats;
 }
//TODO verify SURVEYTEAMMAPS


 export async function updateStartedSurvey(id: string) {
//   let surveyStats;
//   try {
//     surveyStats = await prisma.surveyStats.update({
//       where: { surveyId: id },
//       data: { started: { increment: 1 } },
//     });
//   } catch (error: any) {
//     if (error?.code === "P2025") {
//       // Record not found error
//       surveyStats = await prisma.surveyStats.create({
//         data: { surveyId: id, visited: 1 },
//       });
//     } else {
//       throw error;
//     }
//   }
//   return surveyStats;
 }
//TODO verify SURVEYTEAMMAPS


 export async function updateCompletedSurvey(id: string) {
//   let surveyStats;
//   try {
//     surveyStats = await prisma.surveyStats.update({
//       where: { surveyId: id },
//       data: { completed: { increment: 1 } },
//     });
//   } catch (error: any) {
//     if (error?.code === "P2025") {
//       // Record not found error
//       surveyStats = await prisma.surveyStats.create({
//         data: { surveyId: id, completed: 1 },
//       });
//     } else {
//       throw error;
//     }
//   }
//   return surveyStats;
 }
//TODO verify SURVEYTEAMMAPS

