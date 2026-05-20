import { IconDeviceMobile, IconWorld } from "@tabler/icons-react";
import { QrCode } from "lucide-react";

export const cardData = [
  {
    icon: <QrCode className="w-8 h-8 text-[#009987]" />,
    value: "5-25x",
    label: "Generate Your QR Code ",
    description:
      "Create a unique, AI-enhanced QR code for your business in seconds. Place it where customers can easily scan it.",
    borderColor: "#009987",
    iconBg: "bg-[#009987]/10",
  },
  {
    icon: <IconDeviceMobile className="w-8 h-8 text-[#009987]" />,
    value: "67%",
    label: "Customer Scans & Rates",
    description:
      "Customers scan the code with their phone and provide quick feedback through a simple, mobile-friendly interface.",
    borderColor: "#009987",
    iconBg: "bg-[#009987]/10",
  },
  {
    icon: <IconWorld className="w-8 h-8 text-[#009987]" />,
    value: "92%",
    label: "Smart Routing & Insights",
    description:
      "Positive reviews are guided to Google. Negative feedback lands on your dashboard, creating tickets for quick resolution. AI provides insights.",
    borderColor: "#009987",
    iconBg: "bg-[#009987]/10",
  },
];

export const plans = [
  {
    title: "Free Forever",
    price: "$0",
    description: "Get started with the basics, absolutely free.",
    features: [
      "Up to 25 Reviews / Month",
      "1 QR Code Location",
      "Smart Review Filtering",
      "Basic Dashboard Access",
    ],
    excluded: [
      "Online Reputation Management",
      "WhatsApp Integration",
      "Priority Support",
    ],
    button: "Sign Up for Free",
    highlight: false,
  },
  {
    title: "Pro Plan",
    price: "$49",
    description: "Ideal for growing businesses needing more power.",
    features: [
      "Up to 500 Reviews / Month",
      "5 QR Code Locations",
      "Smart Review Filtering",
      "Advanced Dashboard Access",
      "Online Reputation Management",
      "WhatsApp Integration",
    ],
    excluded: ["Priority Support"],
    button: "Choose Pro Plan",
    highlight: true,
  },
  {
    title: "Business",
    price: "$99",
    description: "Comprehensive solution for established businesses.",
    features: [
      "Unlimited Reviews / Month",
      "Unlimited QR Code Locations",
      "Smart Review Filtering",
      "Advanced Dashboard & Analytics",
      "Online Reputation Management",
      "WhatsApp Integration",
      "Priority Support",
    ],
    excluded: [],
    button: "Choose Business Plan",
    highlight: false,
  },
];

export const features = [
  {
    title: "Cross-Platform Analysis",
    desc: "Monitor reviews from Google, Yelp, Facebook, and more.",
  },
  {
    title: "AI-Powered Sentiment Analysis",
    desc: "Instantly gauge customer sentiment—positive, negative, or neutral.",
  },
  {
    title: "Summarized Insights",
    desc: "Get concise AI summaries of key themes, strengths, and weaknesses.",
  },
  {
    title: "Identify Trends",
    desc: "Track your reputation over time and spot emerging issues or positive trends.",
  },
];
