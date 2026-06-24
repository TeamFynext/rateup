import {
  BarChart2,
  BarChart3,
  DownloadCloud,
  Layout,
  Link,
  MessageSquare,
  Palette,
  Percent,
  Share2,
  Star,
  Ticket,
  UserPlus,
  Video,
} from "lucide-react";

import { imagesPath } from "@/utils/constants.ts";

const cover9 = `${imagesPath}/qr-landing/2-Quick-Landing-Page-Building.jpg`;
// start
const cover3 = `${imagesPath}/qr-landing/3-Interactive-Marketing.jpg`;
const cover10 = `${imagesPath}/qr-landing/3-Ticket-Escalation-Mechanisms.jpg`;
const cover4 = `${imagesPath}/qr-landing/4-Customer-Feedback-Collection.jpg`;
const cover7 = `${imagesPath}/qr-landing/AI Powered Analytics.png`;
const cover11 = `${imagesPath}/qr-landing/Analytics.png`;
const cover2 = `${imagesPath}/qr-landing/cover2.jpg`;
const cover5 = `${imagesPath}/qr-landing/Geographic Insights.png`;
const cover6 = `${imagesPath}/qr-landing/Measure Campaign Success.png`;
const cover8 = `${imagesPath}/qr-landing/Real-Time-Feedback-Collection.jpg`;
const Sustainable = `${imagesPath}/qr-landing/Sustainable.jpg`;

export const Qrsteps = [
  {
    number: 1,
    title: "Create Account",
    description: "Sign up quickly to access the RateUp dashboard.",
    icon: <UserPlus size={24} />,
  },
  {
    number: 2,
    title: "Define Destination",
    description: "Link to surveys, landing pages, forms, websites, or social media.",
    icon: <Link size={24} />,
  },
  {
    number: 3,
    title: "Customize QR Code",
    description: "Add your logo and brand colors for a cohesive look.",
    icon: <Palette size={24} />,
  },
  {
    number: 4,
    title: "Deploy & Analyze",
    description: "Add to materials and start tracking engagement instantly.",
    icon: <BarChart3 size={24} />,
  },
];

export const qrHowItWorks = [
  {
    title: "Scan the QR Code",
    description: "Customers scan the QR code printed on your packaging using their smartphones.",
    image: Sustainable,
  },
  {
    title: "Enhanced Transparency",
    description:
      "Provide instant access to product origins and ingredients, reassuring health conscious, quality-focused consumers.",
    image: cover2,
  },
  {
    title: "Interactive Marketing",
    description:
      "Offer special deals and discounts via QR codes, driving app downloads, followers,and enhancing the customer experience.",
    image: cover3,
  },
  {
    title: "Customer Feedback Collection",
    description:
      "Collect real-time feedback with QR codes. Customize questions to gain insights and boost customer retention and service quality.",
    image: cover4,
  },
  {
    title: "Measurable Campaign Success",
    description:
      "Gain valuable insights into customer engagement and campaign effectiveness through detailed analytics of QR code scans.",
    image: cover6,
  },
  {
    title: "Geographic Insights",
    description:
      "Analyze location-based feedback to identify business strengths and areas for improvement, tailoring strategies effectively",
    image: cover5,
  },
  {
    title: "AI-Powered Analytics",
    description:
      "Use AI tools like sentiment analysis and text summarization to extract insights from large data, enabling informed decisions to improve products and services.",
    image: cover7,
  },
];

export const qrSpecicalFeatures = [
  {
    title: "SReal-Time Feedback Collection",
    description:
      "Collect instant feedback through web and WhatsApp surveys, ensuring higher response rates and valuable insights.",
    image: cover8,
  },
  {
    title: "Quick Landing Page Building",
    description:
      "Create attractive, functional landing pages in minutes to provide detailed product information and engage customers effectively.",
    image: cover9,
  },
  {
    title: "ITicket Escalation Mechanisms",
    description:
      "Automatically escalate negative feedback to ensure timely resolution,improving customer satisfaction.",
    image: cover10,
  },
  {
    title: "Multi-Branch Support",
    description:
      "Manage branches effortlessly. Super admins can add unlimited branches, monitor performance, and compare results across locations.",
    image: cover11,
  },
];

export const QrHerofeatures = [
  {
    label: "Feedback Collection",
    icon: MessageSquare,
    bg: "bg-[#d7f4ff]",
    color: "text-[#0084ff]",
  },
  {
    label: "Product Videos",
    icon: Video,
    bg: "bg-[#e1e6ff]",
    color: "text-[#001d60]",
  },
  {
    label: "Product Review",
    icon: Star,
    bg: "bg-[#ffe9cf]",
    color: "text-[#ff9b00]",
  },
  {
    label: "Landing Page",
    icon: Layout,
    bg: "bg-[#e1e6ff]",
    color: "text-[#0064ff]",
  },
  {
    label: "AI Powered Analytics",
    icon: BarChart2,
    bg: "bg-[#c9fff3]",
    color: "text-[#00bba3]",
  },
  {
    label: "Coupons",
    icon: Percent,
    bg: "bg-[#eaffd4]",
    color: "text-[#6ac500]",
  },
  {
    label: "Social Media",
    icon: Share2,
    bg: "bg-[#ffe3ef]",
    color: "text-[#ff4794]",
  },
  {
    label: "Ticketing",
    icon: Ticket,
    bg: "bg-[#ececec]",
    color: "text-[#101010]",
  },
  {
    label: "App Downloads",
    icon: DownloadCloud,
    bg: "bg-[#e5f0ff]",
    color: "text-[#1c8cff]",
  },
];

export const featureImages = {
  "Feedback Collection": `${imagesPath}/qr-landing/1FEEDBACK COLLECTION.png`,
  "Product Videos": `${imagesPath}/qr-landing/2 PRODUCT VIDEO.png`,
  "Product Review": `${imagesPath}/qr-landing/3 PRODUCT REVIEW.png`,
  "Landing Page": `${imagesPath}/qr-landing/4 LANDING PAGE.png`,
  "AI Powered Analytics": `${imagesPath}/qr-landing/5 AI ANALYTICS.png`,
  Coupons: `${imagesPath}/qr-landing/6 COUPONS.png`,
  "Social Media": `${imagesPath}/qr-landing/7 SOCIAL MEDIA.png`,
  Ticketing: `${imagesPath}/qr-landing/8 TICKETING.png`,
  "App Downloads": `${imagesPath}/qr-landing/9 APP DOWNLOAD.png`,
};
