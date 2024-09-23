import { imagesPath } from "@/utils/constants";

const sectionValues = [
  {
    id: "1234135371",
    headingSmallText: "Create Form",
    headingLargeText:
      "WYSIWYG editor, Create feedback forms  with logic jumps in minutes",
    description:
      "Use the intuitive form builder in the RateUp platform to create forms. Configure questions to appear based on the customer’s answer(logic jumps). Add brand theme and logo to the form",
    imageUrl: `${imagesPath}/homepage/home-what-can-you-do-section/create-feedback-form.png`,
    imageAlt: "Create Feedback Form",
    imageWidth: 1350,
    imageHeight: 794,
    learnMoreRoute: "/web-survey",
  },
  {
    id: "1234135372",
    headingSmallText: "Send Form",
    headingLargeText: (
      <span>
        Get <span className={"blue-text"}>35% more</span> customers feedback
        through Automated Interactive WhatsApp Forms
      </span>
    ),
    description:
      "Integrate the RateUp Platform with your existing CRM/billing software. Schedule and automate sending interavtive whatsApp forms or web surveys to collect customer feedback",
    imageUrl: `${imagesPath}/homepage/home-what-can-you-do-section/send-form.png`,
    imageAlt: "Send Feedback Form",
    imageWidth: 1062,
    imageHeight: 842,
    learnMoreRoute: "/whatsapp-feedback",
  },
  {
    id: "1234135373",
    headingSmallText: "Action & Analytics",
    headingLargeText:
      "Generate, assign, and track tickets. Analyse customer sentiment.",
    description:
      "Create tickets, tag respective teams, and track their status untill resolution. Visualize the overall customer sentiment (NPS,CSAT) and their improvements on the RateUp platform dashboard",
    imageUrl: `${imagesPath}/homepage/home-what-can-you-do-section/action-and-analytics.png`,
    imageAlt: "Create tickets, tag respective teams, and track their status",
    imageWidth: 1282,
    imageHeight: 943,
    learnMoreRoute: "#",
  },
];

export { sectionValues };
