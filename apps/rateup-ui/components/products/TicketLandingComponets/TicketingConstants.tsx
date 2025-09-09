import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Circle,
  CircleCheck,
  Database,
  FileSearch,
  FolderOpen,
  Globe,
  Headphones,
  ListTodo,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  PenSquare,
  Settings,
  TicketCheck,
  Users,
  UsersRound,
  Workflow,
  XCircle,
} from "lucide-react";

import { imagesPath } from "@/utils/constants";

export const features = [
  {
    title: "Official WhatsApp Business API",
    description:
      "Connect directly with 2 billion WhatsApp users worldwide using Meta's officially approved WhatsApp Business API integration.",
    icon: MessageSquare,
    color: "bg-[#1c518e] text-white",
  },
  {
    title: "Unified Messaging Hub",
    description:
      "Manage WhatsApp messages alongside email, chat, and other channels in one intuitive interface for seamless customer conversations.",
    icon: MessagesSquare,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Automated Workflow Management",
    description:
      "Set up rules that automatically route, prioritize, and assign incoming WhatsApp messages based on content, customer data, or time of day.",
    icon: Workflow,
    color: "bg-teal-100 text-teal-600",
  },
  {
    title: "Smart Lead Generation",
    description:
      "Automatically identify and convert inquiries into qualified leads, categorize them into custom buckets based on engagement level, and track them through your sales pipeline.",
    icon: CircleCheck,
    color: "bg-emerald-100 text-emerald-600",
    showExample: true,
  },
  {
    title: "Ticket Management System",
    description:
      "Convert support inquiries and complaints into trackable tickets that can be automatically or manually assigned to team members for efficient resolution.",
    icon: TicketCheck,
    color: "bg-amber-100 text-amber-600",
    showExample: true,
  },
  {
    title: "Team Collaboration Tools",
    description:
      "Add internal notes, transfer conversations to specialists, and collaborate on complex issues without leaving the platform.",
    icon: Users,
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "Comprehensive Analytics",
    description:
      "Gain insights into response times, resolution rates, agent performance, and customer satisfaction for WhatsApp conversations.",
    icon: BarChart3,
    color: "bg-red-100 text-red-600",
  },
  {
    title: "Compliant Messaging Templates",
    description:
      "Create and manage approved message templates that enable consistent, compliant proactive outreach to customers.",
    icon: PenSquare,
    color: "bg-indigo-100 text-indigo-600",
  },
];

type Step = {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
};

export const steps: Step[] = [
  {
    title: "Get your official WhatsApp business account",
    description:
      "We'll help you set up and verify your official WhatsApp Business API account, giving you access to professional features unavailable on personal accounts.",
    icon: MessageCircle,
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Unify all customer conversations",
    description:
      "Never lose track of an important message. Manage WhatsApp alongside email, chat, social, and voice channels in one unified inbox.",
    icon: MessagesSquare,
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Convert inquiries to qualified leads",
    description:
      "Automatically identify potential leads from incoming messages and organize them into customizable buckets based on engagement level, from new inquiries to qualified opportunities.",
    icon: CircleCheck,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Transform complaints into support tickets",
    description:
      "Automatically or manually convert support issues into trackable tickets, assign them to team members, and monitor their progress through resolution.",
    icon: TicketCheck,
    color: "bg-amber-100 text-amber-600",
  },
  {
    title: "Measure performance and satisfaction",
    description:
      "Track key metrics like conversion rates, lead quality scores, ticket resolution times, and customer satisfaction across all WhatsApp interactions.",
    icon: BarChart3,
    color: "bg-purple-100 text-purple-600",
  },
];

export const tickets = [
  {
    id: "#23",
    title: "Product Dissatisfaction",
    customer: "Benjamin",
    phone: "+91 9484254548",
    issue: "Not satisfied with our products",
    assignedTo: "Henry",
    source: "Custom",
    status: "Open",
    priority: "Critical",
    created: "17/02/2025",
    daysLeft: 4,
  },
  {
    id: "#20",
    title: "Test Survey (Auto Generated)",
    customer: "Zara Laanson",
    phone: "+91 9456587878",
    issue: "Confusing navigation menu",
    assignedTo: "Henry",
    source: "Survey Response",
    status: "Open",
    priority: "Critical",
    created: "17/02/2025",
    daysLeft: 4,
  },
  {
    id: "#17",
    title: "System Survey (Auto Generated)",
    customer: "William James",
    phone: "+91 9255857574",
    issue: "Inconsistent performance across devices",
    assignedTo: "Henry",
    source: "Survey Response",
    status: "Open",
    priority: "Critical",
    created: "20/02/2025",
    daysLeft: 2,
  },
  {
    id: "#15",
    title: "UI Update Survey (Auto Generated)",
    customer: "James Steve",
    phone: "+91 9566569696",
    issue: "Design feels clunky",
    assignedTo: "Bennet",
    source: "Survey Response",
    status: "Open",
    priority: "Low",
    created: "20/02/2025",
    daysLeft: 6,
  },
];

export const ticketCategories = [
  {
    name: "OPEN",
    count: 7,
    color: "text-blue-500",
    icon: Circle,
    iconBg: "bg-blue-100",
  },
  {
    name: "IN PROGRESS",
    count: 5,
    color: "text-amber-500",
    icon: AlertCircle,
    iconBg: "bg-amber-100",
  },
  {
    name: "RESOLVED",
    count: 12,
    color: "text-green-600",
    icon: CheckCircle2,
    iconBg: "bg-green-100",
  },
  {
    name: "CLOSED",
    count: 3,
    color: "text-gray-500",
    icon: XCircle,
    iconBg: "bg-gray-100",
  },
];

export const useCases = [
  {
    title: "Customer Support",
    icon: Headphones,
    color: "bg-blue-500 text-white",
  },
  {
    title: "Lead Tracking & Management",
    icon: Users,
    color: "bg-purple-600 text-white",
  },
  {
    title: "Project Management",
    icon: FolderOpen,
    color: "bg-amber-600 text-white",
  },
  {
    title: "Task Tracking",
    icon: ListTodo,
    color: "bg-emerald-600 text-white",
  },
  {
    title: "Internal Requests",
    icon: FileSearch,
    color: "bg-rose-600 text-white",
  },
  {
    title: "Service Management",
    icon: Settings,
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
    icon: Database,
    color: "text-blue-500",
  },
  {
    title: "WhatsApp Integration",
    description:
      "Connect directly with your customers on WhatsApp within RateUp. Enjoy seamless communication and enhance your support capabilities on their preferred platform.",
    icon: MessageSquare,
    color: "text-green-500",
  },
  {
    title: "Data-Driven Decisions",
    description:
      "Gain actionable insights with real-time analytics to optimize performance and drive growth.",
    icon: BarChart3,
    color: "text-purple-600",
  },
  {
    title: "Seamless Team Collaboration & Workflow Efficiency",
    description:
      "Enhance teamwork with streamlined collaboration, task management, and real-time updates.",
    icon: UsersRound,
    color: "text-amber-600",
  },
  {
    title: "Seamless Integrations",
    description:
      "Easily connect with your existing tools and platforms, ensuring a smooth workflow, enhanced productivity, and a unified business ecosystem.",
    icon: Globe,
    color: "text-emerald-600",
  },
  {
    title: "Drive Engagement, Automate Growth",
    description:
      "Deliver seamless experiences, strengthen customer relationships, and maximize business potential with intelligent solutions.",
    icon: Workflow,
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
