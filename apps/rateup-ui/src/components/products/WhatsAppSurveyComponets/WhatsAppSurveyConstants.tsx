import { IconGps } from "@tabler/icons-react";
import { BarChart3, ChartBar, Coins, Funnel, Layers, Settings } from "lucide-react";

import { imagesPath } from "@/utils/constants.ts";

const Image1 = `${imagesPath}/whatsapp-survey-page/Supercharge Online Reputation.png`;
const Image2 = `${imagesPath}/whatsapp-survey-page/Effortless-Issue-Resolution.png`;
const Image3 = `${imagesPath}/whatsapp-survey-page/Supercharge Online Reputation.png`;

export const Surveysteps = [
  {
    number: 1,
    title: "Create Account",
    description: "Sign up quickly to access the RateUp dashboard.",
    icon: <Settings size={32} />,
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
    icon: <ChartBar size={32} />,
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
    icon: BarChart3,
    title: "Retail & E-commerce",
    description:
      "Understand post-purchase satisfaction, product feedback, and delivery experience. Reduce returns and build loyalty.",
  },
  {
    icon: Funnel,
    title: "Restaurants & Hospitality",
    description:
      "Collect feedback on food quality, service, and ambiance instantly. Boost online ratings on Google and TripAdvisor.",
  },
  {
    icon: Layers,
    title: "Service Providers",
    description:
      "Gauge client satisfaction after appointments (salons, repairs, etc.), identify improvements, and encourage repeat business.",
  },
  {
    icon: Coins,
    title: "SaaS & Software",
    description:
      "Gather user feedback on features, onboarding, and support directly within the messaging apps they use.",
  },
];

export const faqs = [
  {
    question: "Do I need a separate WhatsApp Business API account?",
    answer:
      "Yes, RateUp integrates with your existing WhatsApp Business Platform (API) account. This ensures compliance and gives you full control. We can guide you through the setup process if you don't have one yet.",
  },
  {
    question: "Is RateUp compliant with WhatsApp policies and GDPR?",
    answer:
      "Absolutely. We operate in full compliance with WhatsApp's terms of service and data privacy regulations like GDPR. Customer consent for receiving messages is handled appropriately through WhatsApp's opt-in mechanisms.",
  },
  {
    question: "How does the integration with CRM/Billing systems work?",
    answer:
      "We offer seamless integration options, including APIs and webhooks, to connect with many popular platforms. This allows you to automatically trigger surveys based on customer events (like order completion or appointment end) logged in your system. Contact us to discuss specific integrations.",
  },
  {
    question: "What kind of support do you offer?",
    answer:
      "We provide comprehensive onboarding assistance, detailed documentation, and responsive customer support through email and chat channels to ensure you get the most out of RateUp.",
  },
  {
    question: "What does pricing look like?",
    answer:
      "RateUp offers flexible plans tailored to your business size and feedback volume. Since needs vary, we recommend booking a quick demo. We'll discuss your requirements and provide a personalized quote for the plan that best suits you.",
  },
];
