import {
  IconChartBar,
  IconCoins,
  IconFilter,
  IconGps,
  IconSettings,
  IconStack2,
} from "@tabler/icons-react";

import { imagesPath } from "@/utils/constants.ts";

const Image1 = `${imagesPath}/whatsapp-survey-page/Supercharge Online Reputation.png`;
const Image2 = `${imagesPath}/whatsapp-survey-page/Effortless-Issue-Resolution.png`;
const Image3 = `${imagesPath}/whatsapp-survey-page/Supercharge Online Reputation.png`;

export const Surveysteps = [
  {
    number: 1,
    title: "Create Account",
    description: "Sign up quickly to access the RateUp dashboard.",
    icon: <IconSettings size={32} />,
  },
  {
    number: 2,
    title: "Define Destination",
    description: "Link to surveys, landing pages, forms, websites, or social media.",
    icon: <IconGps size={32} />,
  },
  {
    number: 3,
    title: "Customize QR Code",
    description: "Add your logo and brand colors for a cohesive look.",
    icon: <IconChartBar size={32} />,
  },
];

export const articles = [
  {
    category: "Supercharge Online Reputation",
    date: "SEPTEMBER 1, 2022",
    title:
      "Turn positive experiences into glowing reviews. Automatically direct satisfied customers to Google, TripAdvisor, and more. Handle negative feedback internally before it goes public.",
    image: Image1,
    link: "#",
  },
  {
    category: "Effortless Issue Resolution",
    date: "SEPTEMBER 1, 2022",
    title:
      "Generate tickets automatically for complaints or suggestions directly from feedback. Track issues centrally and keep customers informed via WhatsApp.",
    image: Image2,
    link: "#",
  },
  {
    category: "AI-Powered Insights",
    date: "SEPTEMBER 1, 2022",
    title:
      "Measure what matters: NPS, CSAT, and more. Our AI analyzes feedback to spot trends, identify key themes like Good Product or Slow Delivery, and help you make data-driven decisions.",
    image: Image3,
    link: "#",
  },
];

export const features = [
  {
    icon: IconChartBar,
    title: "Retail & E-commerce",
    description:
      "Understand post-purchase satisfaction, product feedback, and delivery experience. Reduce returns and build loyalty.",
  },
  {
    icon: IconFilter,
    title: "Restaurants & Hospitality",
    description:
      "Collect feedback on food quality, service, and ambiance instantly. Boost online ratings on Google and TripAdvisor.",
  },
  {
    icon: IconStack2,
    title: "Service Providers",
    description:
      "Gauge client satisfaction after appointments (salons, repairs, etc.), identify improvements, and encourage repeat business.",
  },
  {
    icon: IconCoins,
    title: "SaaS & Software",
    description:
      "Gather user feedback on features, onboarding, and support directly within the messaging apps they use.",
  },
];
