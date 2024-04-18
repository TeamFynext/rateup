import { imagesPath } from "../../../../constants";

const surveyFeaturesList = [
  "Web Surveys",
  "Custom Branding",
  "Survey Tree",
  "Dynamic Page",
  "QR Code",
  "Short URLs",
];

const otherFeaturesList = [
  {
    label: "Multilingual Surveys",
    iconUrl: `${imagesPath}/homepage/features/other-features/multilingual-surveys.svg`,
  },
  {
    label: "Intelligent Dashboard",
    iconUrl: `${imagesPath}/homepage/features/other-features/intelligent-dashboard.svg`,
  },
  {
    label: "AI Powered",
    iconUrl: `${imagesPath}/homepage/features/other-features/ai-powered.svg`,
  },
  {
    label: "Easy Integrations",
    iconUrl: `${imagesPath}/homepage/features/other-features/easy-integrations.svg`,
  },
];

export { surveyFeaturesList, otherFeaturesList };
