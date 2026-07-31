import { IconDeviceMobile, IconQrcode, IconWorld } from "@tabler/icons-react";

export const cardData = [
  {
    icon: <IconQrcode className="w-8 h-8 text-[#009987]" />,
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
