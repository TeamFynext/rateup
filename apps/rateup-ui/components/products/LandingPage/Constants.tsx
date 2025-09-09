import { Funnel, Hourglass, LineChart, Smile } from "lucide-react";

import { imagesPath } from "@/utils/constants";

export const features = [
  {
    icon: Smile,
    title: "Boost Customer Satisfaction",
  },
  {
    icon: Funnel,
    title: "Increase Conversion Rates",
  },
  {
    icon: Hourglass,
    title: "Save Time & Resources",
  },
  {
    icon: LineChart,
    title: "Make Data Driven Decisions",
  },
];

// Constants.ts or at top of your component file

export const HomePagefeatures = [
  {
    title: "AI Analytics & Insights",
    highlight: "with RateUp",
    description:
      "Leverage the power of our advanced AI models and analytics to gain actionable insights. Uncover sentiment analysis, sentiment trends, and customer behavior patterns for informed decision-making",
    imageUrl: `${imagesPath}/homepage/Group 48096778.png`,
    imageAlt: "AI Analytics & Insights",
    reverse: false,
  },

  {
    title: "Security Conscious",
    highlight: "Business",
    description:
      "End-to-end encryption enhances customer experience by securing sensitive data, ensuring compliance, and building trust. It gives security-conscious businesses a competitive edge.",

    imageUrl: `${imagesPath}/homepage/Group 48096783.png`,
    imageAlt: "Security Conscious Business",
    reverse: true,
  },
];

export const blogPosts = [
  {
    title:
      "Building Interactive Apps Inside WhatsApp: The Power of WhatsApp Flows",
    description:
      "Discover how businesses can create interactive applications that run directly inside WhatsApp conversations using WhatsApp Flows.",
    imageUrl:
      "https://blog.rateup.app/content/images/size/w1000/2024/09/How-to-Handle-Customer-Feedback.jpg",
    link: "https://blog.rateup.app/whatsapp-flows/",
  },
  {
    title: "Customer Feedback Loop: Importance, Steps, and Best Practices",
    description:
      "Explore why businesses need a customer feedback loop and the steps and best practices for its successful implementation.",
    imageUrl:
      "https://blog.rateup.app/content/images/size/w1000/2024/09/Analyze-Customer-Feedback-for-FREE.jpg",
    link: "https://blog.rateup.app/customer-feedback-loop/",
  },
  {
    title:
      "Automate Customer Feedback Management: Business Case and ROI for SMBs",
    description:
      "Learn how SMB founders can achieve double-digit ROI by implementing an automated customer feedback management platform.",
    imageUrl:
      "https://blog.rateup.app/content/images/size/w1000/2024/09/Automate-Customer-Feedback-Management.jpg",
    link: "https://blog.rateup.app/automate-customer-feedback-roi/",
  },
];

export const accordionItems = [
  {
    id: "retail",
    title: "Retail & FMCG: Boost In-Store & Online Loyalty",
    content:
      "Track customer behavior, offer personalized promotions with in-store QR codes, and drive loyalty directly via WhatsApp, transforming in-store experiences into digital engagement.",
  },
  {
    id: "healthcare",
    title: "Healthcare: Enhance Patient Care & Feedback",
    content:
      "Collect patient feedback seamlessly, manage appointments, and run personalized campaigns to improve patient care and satisfaction through secure WhatsApp communications.",
  },
  {
    id: "hospitality",
    title: "Hospitality & Salons: Keep Customers Coming Back",
    content:
      "Provide instant feedback kiosks, automate promotions, and offer unique WhatsApp-based loyalty programs that keep customers returning for more.",
  },
  {
    id: "education",
    title: "Education & E-Learning: Streamline Communication",
    content:
      "Gather real-time feedback from students and automate WhatsApp notifications for course updates, assignments, and promotions, enhancing student engagement and retention.",
  },
];
