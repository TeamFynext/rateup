import {
  IconChartBar,
  IconCircleCheck,
  IconDatabase,
  IconEdit,
  IconFileSearch,
  IconFolderOpen,
  IconGlobe,
  IconHeadphones,
  IconListCheck,
  IconMessage,
  IconMessageCircle,
  IconMessages,
  IconSettings,
  IconSitemap,
  IconTicket,
  IconUsers,
} from "@tabler/icons-react";

import { imagesPath } from "@/utils/constants.ts";

export const features = [
  {
    title: "Official WhatsApp Business API",
    description:
      "Connect directly with 2 billion WhatsApp users worldwide using Meta's officially approved WhatsApp Business API integration.",
    icon: IconMessage,
    color: "bg-[#1c518e] text-white",
  },
  {
    title: "Unified Messaging Hub",
    description:
      "Manage WhatsApp messages alongside email, chat, and other channels in one intuitive interface for seamless customer conversations.",
    icon: IconMessages,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Automated Workflow Management",
    description:
      "Set up rules that automatically route, prioritize, and assign incoming WhatsApp messages based on content, customer data, or time of day.",
    icon: IconSitemap,
    color: "bg-teal-100 text-teal-600",
  },
  {
    title: "Smart Lead Generation",
    description:
      "Automatically identify and convert inquiries into qualified leads, categorize them into custom buckets based on engagement level, and track them through your sales pipeline.",
    icon: IconCircleCheck,
    color: "bg-emerald-100 text-emerald-600",
    showExample: true,
  },
  {
    title: "Ticket Management System",
    description:
      "Convert support inquiries and complaints into trackable tickets that can be automatically or manually assigned to team members for efficient resolution.",
    icon: IconTicket,
    color: "bg-amber-100 text-amber-600",
    showExample: true,
  },
  {
    title: "Team Collaboration Tools",
    description:
      "Add internal notes, transfer conversations to specialists, and collaborate on complex issues without leaving the platform.",
    icon: IconUsers,
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "Comprehensive Analytics",
    description:
      "Gain insights into response times, resolution rates, agent performance, and customer satisfaction for WhatsApp conversations.",
    icon: IconChartBar,
    color: "bg-red-100 text-red-600",
  },
  {
    title: "Compliant Messaging Templates",
    description:
      "Create and manage approved message templates that enable consistent, compliant proactive outreach to customers.",
    icon: IconEdit,
    color: "bg-indigo-100 text-indigo-600",
  },
];

interface Step {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

export const steps: Step[] = [
  {
    title: "Get your official WhatsApp business account",
    description:
      "We'll help you set up and verify your official WhatsApp Business API account, giving you access to professional features unavailable on personal accounts.",
    icon: IconMessageCircle,
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Unify all customer conversations",
    description:
      "Never lose track of an important message. Manage WhatsApp alongside email, chat, social, and voice channels in one unified inbox.",
    icon: IconMessages,
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Convert inquiries to qualified leads",
    description:
      "Automatically identify potential leads from incoming messages and organize them into customizable buckets based on engagement level, from new inquiries to qualified opportunities.",
    icon: IconCircleCheck,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Transform complaints into support tickets",
    description:
      "Automatically or manually convert support issues into trackable tickets, assign them to team members, and monitor their progress through resolution.",
    icon: IconTicket,
    color: "bg-amber-100 text-amber-600",
  },
  {
    title: "Measure performance and satisfaction",
    description:
      "Track key metrics like conversion rates, lead quality scores, ticket resolution times, and customer satisfaction across all WhatsApp interactions.",
    icon: IconChartBar,
    color: "bg-purple-100 text-purple-600",
  },
];

export const useCases = [
  {
    title: "Customer Support",
    icon: IconHeadphones,
    color: "bg-blue-500 text-white",
  },
  {
    title: "Lead Tracking & Management",
    icon: IconUsers,
    color: "bg-purple-600 text-white",
  },
  {
    title: "Project Management",
    icon: IconFolderOpen,
    color: "bg-amber-600 text-white",
  },
  {
    title: "Task Tracking",
    icon: IconListCheck,
    color: "bg-emerald-600 text-white",
  },
  {
    title: "Internal Requests",
    icon: IconFileSearch,
    color: "bg-rose-600 text-white",
  },
  {
    title: "Service Management",
    icon: IconSettings,
    color: "bg-indigo-600 text-white",
  },
];

export const testimonials = [
  {
    name: "Sarah Johnson",
    company: "Tech Solutions Inc.",
    avatar: "/placeholder.svg",
    quote:
      "RateUp transformed our customer support process. The WhatsApp integration is seamless and our response time has decreased by 45%!",
    rating: 5,
  },
  {
    name: "Michael Chen",
    company: "Global Retail",
    avatar: "/placeholder.svg",
    quote:
      "The ticketing system's organization and AI capabilities have made managing customer inquiries much more efficient. Highly recommend!",
    rating: 5,
  },
  {
    name: "Priya Patel",
    company: "FinServe Solutions",
    avatar: "/placeholder.svg",
    quote:
      "Our team collaboration has improved dramatically since implementing RateUp. The ability to add internal notes is a game-changer.",
    rating: 4,
  },
  {
    name: "David Rodriguez",
    company: "Swift Logistics",
    avatar: "/placeholder.svg",
    quote:
      "Multi-lingual support has allowed us to expand our services globally. Our international customers are thrilled with the experience.",
    rating: 5,
  },
];

export const benefits = [
  {
    title: "Comprehensive Solutions",
    description:
      "Surveys, WhatsApp Campaigns, Loyalty, AI Automation, Ticketing, QR Studio, Chatbots, and Reputation Management",
    icon: IconDatabase,
    color: "text-blue-500",
  },
  {
    title: "WhatsApp Integration",
    description:
      "Connect directly with your customers on WhatsApp within RateUp. Enjoy seamless communication and enhance your support capabilities on their preferred platform.",
    icon: IconMessage,
    color: "text-green-500",
  },
  {
    title: "Data-Driven Decisions",
    description:
      "Gain actionable insights with real-time analytics to optimize performance and drive growth.",
    icon: IconChartBar,
    color: "text-purple-600",
  },
  {
    title: "Seamless Team Collaboration & Workflow Efficiency",
    description:
      "Enhance teamwork with streamlined collaboration, task management, and real-time updates.",
    icon: IconUsers,
    color: "text-amber-600",
  },
  {
    title: "Seamless Integrations",
    description:
      "Easily connect with your existing tools and platforms, ensuring a smooth workflow, enhanced productivity, and a unified business ecosystem.",
    icon: IconGlobe,
    color: "text-emerald-600",
  },
  {
    title: "Drive Engagement, Automate Growth",
    description:
      "Deliver seamless experiences, strengthen customer relationships, and maximize business potential with intelligent solutions.",
    icon: IconSitemap,
    color: "text-rose-600",
  },
];

const icon1 = `${imagesPath}/ticketing/icons/1.png`;
const icon2 = `${imagesPath}/ticketing/icons/2.png`;
const icon3 = `${imagesPath}/ticketing/icons/3.png`;
const icon4 = `${imagesPath}/ticketing/icons/4.png`;
const icon5 = `${imagesPath}/ticketing/icons/5.png`;
const icon6 = `${imagesPath}/ticketing/icons/6.png`;
const icon7 = `${imagesPath}/ticketing/icons/7.png`;
const icon8 = `${imagesPath}/ticketing/icons/8.png`;
const icon9 = `${imagesPath}/ticketing/icons/9.png`;
const icon10 = `${imagesPath}/ticketing/icons/10.png`;
const icon11 = `${imagesPath}/ticketing/icons/11.png`;
const icon12 = `${imagesPath}/ticketing/icons/12.png`;
const icon13 = `${imagesPath}/ticketing/icons/13.png`;
const icon14 = `${imagesPath}/ticketing/icons/14.png`;
const icon15 = `${imagesPath}/ticketing/icons/15.png`;
const icon16 = `${imagesPath}/ticketing/icons/16.png`;

export const clientIcons = [
  icon1,
  icon2,
  icon3,
  icon4,
  icon5,
  icon6,
  icon7,
  icon8,
  icon9,
  icon10,
  icon11,
  icon12,
  icon13,
  icon14,
  icon15,
  icon16,
];
