export enum SurveyType {
  WebSurvey = "web-survey",
  WhatsappSurvey = "whatsapp-survey",
  GroupSurvey = "group-survey",
}

const videosPath = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/videos/homepage/our-features/multiorganizational-structure`;

export const imageCarouselSlides = [
  {
    id: 1,
    srcsArray: [
      {
        src: `${videosPath}/web-survey.webm`,
        type: "video/webm",
      },
      {
        src: `${videosPath}/web-survey.mp4`,
        type: "video/mp4",
      },
    ],
    name: "Web Survey Illustration",
  },
  {
    id: 2,
    srcsArray: [
      {
        src: `${videosPath}/whatsapp-survey.webm`,
        type: "video/webm",
      },
      {
        src: `${videosPath}/whatsapp-survey.mp4`,
        type: "video/mp4",
      },
    ],
    name: "Whatsapp Survey Illustration",
  },
  {
    id: 3,
    srcsArray: [
      {
        src: `${videosPath}/group-survey.webm`,
        type: "video/webm",
      },
      {
        src: `${videosPath}/group-survey.mp4`,
        type: "video/mp4",
      },
    ],
    name: "Group Survey Illustration",
  },
];

export const getTabIndexFromSurveyTypeStr = (surveyTypeStr) => {
  return Object.values(SurveyType)?.findIndex(
    (value) => value === surveyTypeStr,
  );
};
