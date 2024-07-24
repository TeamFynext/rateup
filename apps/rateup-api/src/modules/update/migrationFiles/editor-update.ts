import { PageType } from "../../../types/enums";
import prisma from "../../../utils/prisma";
import { v4 as uuidv4 } from "uuid";

function generateUniqueId(existingIds) {
  let newId;
  do {
    newId = uuidv4();
  } while (existingIds.includes(newId));
  return newId;
}

export async function updateEditorStructure() {
  console.log("Updating Surcey Editor........To Pages......");

  const surveys = await prisma.survey.findMany();
  const webSurveys = surveys?.filter((survey) => survey.type === "web");

  for (const survey of webSurveys) {
    try {
      const languages = survey?.languages;
      const updatedJsonData = updateQuestionsJson(
        survey.questions,
        languages,
        survey.welcomePageEnabled,
      );
      //console.log(updatedJsonData);

      let surveyQns = await prisma.survey.update({
        where: {
          id: survey.id,
        },
        data: {
          questions: updatedJsonData as any,
        },
      });

      // console.log(surveyQns);
    } catch (error) {
      throw error;
    }
  }

  console.log("Updated.....");
}

function updateQuestionsJson(questions, languages, welcomePageEnabled) {
  const webQuestions = questions;
  const existingIds = questions.map((question) => question.id);

  if (welcomePageEnabled) {
    const welcomePageExists = questions.some(
      (question) => question.type === PageType.Welcome,
    );

    if (!welcomePageExists) {
      let welcomePageTitles = {};
      let welcomePageDesc = {};

      for (let i = 0; i < languages.length; i++) {
        welcomePageTitles[languages[i]] = "Welcome Page";
        welcomePageDesc[languages[i]] = "This is the first page to welcome";
      }

      const newWelcomePage = {
        id: generateUniqueId(existingIds),
        type: "Welcome",
        title: { English: "Welcome Page", Malayalam: "Welcome Page" },
        required: true,
        description: {
          English: "This is the first page to welcome",
          Malayalam: "This is the first page to welcome",
        },
        enableNpsAnalytics: false,
      };
      questions.unshift(newWelcomePage); // Add at the beginning of the array
    }
  }
  const thankYouPageExists = questions.some(
    (question) => question.type === PageType.ThankYou,
  );

  if (!thankYouPageExists) {
    let ThankYouTitles = {};
    let ThankYouDesc = {};

    for (let i = 0; i < languages.length; i++) {
      ThankYouTitles[languages[i]] = "ThankYou Page";
      ThankYouDesc[languages[i]] = "This is the End Page of the survey";
    }

    const newThankYouPage = {
      id: generateUniqueId(existingIds),
      type: "ThankYou",
      title: ThankYouTitles,
      required: true,
      description: ThankYouDesc,
      enableNpsAnalytics: false,
    };
    questions.push(newThankYouPage); // Add at the end of the array
  }

  return questions;
}
