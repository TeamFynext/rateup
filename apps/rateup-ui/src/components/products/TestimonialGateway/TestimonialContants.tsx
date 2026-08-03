import {
  IconChartBar,
  IconCode,
  IconInbox,
  IconLayoutList,
  IconLink,
  IconMessage,
  IconMoodSad,
  IconMoodSmile,
  IconSettings,
  IconShare2,
  IconTool,
} from "@tabler/icons-react";

import { imagesPath } from "@/utils/constants.ts";

export const steps = [
  {
    icon: <IconMessage size={34} strokeWidth={2.5} />,
    title: "Ask for Feedback",
    description: "Send automated messages to customers at the perfect moment",
  },
  {
    icon: <IconMoodSmile size={34} strokeWidth={2.5} />,
    title: "Happy Customers",
    description: "Satisfied customers are prompted to share their positive experience",
  },
  {
    icon: <IconMoodSad size={34} strokeWidth={2.5} />,
    title: "Unhappy Customers",
    description: "Collect feedback from unsatisfied customers to improve their experience",
  },
  {
    icon: <IconTool size={34} strokeWidth={2.5} />,
    title: "Customize & Display",
    description: "Easily embed and customize testimonials on your website",
  },
];

export const features = [
  {
    icon: <IconInbox size={28} strokeWidth={2} />,
    title: "Multi-Channel Collection",
    description:
      "Collect testimonials from customers where they are: WhatsApp, email, forms, QR codes.",
  },
  {
    icon: <IconMoodSmile size={28} strokeWidth={2} />,
    title: "Happy Customer Flow",
    description:
      "Automatically guide satisfied customers to testimonials, and collect unhappy feedback for improvement.",
  },
  {
    icon: <IconMessage size={28} strokeWidth={2} />,
    title: "Personalized Requests",
    description:
      "Send customized testimonial requests at the perfect moment in your customer journey with smart automation rules.",
  },
  {
    icon: <IconLayoutList size={28} strokeWidth={2} />,
    title: "Curate and Moderate",
    description:
      "Review, approve, and organize testimonials before they go public, ensuring only the best feedback is displayed.",
  },
  {
    icon: <IconCode size={28} strokeWidth={2} />,
    title: "Easy Embedding",
    description:
      "Copy-paste a simple code snippet to showcase testimonials on your website in just a few clicks.",
  },
  {
    icon: <IconShare2 size={28} strokeWidth={2} />,
    title: "Social Sharing",
    description:
      "Convert testimonials into shareable content for social media—perfect for amplifying your social proof.",
  },
  {
    icon: <IconLink size={28} strokeWidth={2} />,
    title: "Custom Collection Links",
    description:
      "Create branded collection links to share via any channel, providing flexibility for different customer touchpoints.",
  },
  {
    icon: <IconSettings size={28} strokeWidth={2} />,
    title: "Automated Workflows",
    description:
      "Trigger testimonial requests at the perfect moment in your customer journey with smart automation rules.",
  },
  {
    icon: <IconChartBar size={28} strokeWidth={2} />,
    title: "Performance Analytics",
    description:
      "Track conversion rates, response times, and testimonial performance to optimize your collection strategy.",
  },
];

export const faqs = [
  {
    question: "How does the testimonial collection process work?",
    answer:
      "Our platform allows you to send customized testimonial request forms to your clients via email. They can then submit their feedback directly through the form, which gets stored in your dashboard for review and publishing.",
  },
  {
    question: "Can I customize the appearance of my testimonials?",
    answer:
      "Absolutely! You can choose from various templates, adjust colors to match your brand, and control the layout of testimonials on your website. Our Professional and Enterprise plans offer even more customization options.",
  },
  {
    question: "How do I embed testimonials on my website?",
    answer:
      "We provide a simple code snippet that you can add to any page on your website. You can also use our WordPress plugin or integrate via our API for more advanced implementations.",
  },
  {
    question: "Is there a limit to how many testimonials I can collect?",
    answer:
      "The Free plan allows up to 20 testimonials. Our Professional and Enterprise plans offer unlimited testimonial collection and storage.",
  },
  {
    question: "Can I moderate testimonials before they appear on my site?",
    answer:
      "Yes, all testimonials go through a moderation queue where you can approve, edit, or reject submissions before they go live on your website.",
  },
  {
    question: "Do you offer a free trial?",
    answer:
      "Yes, we offer a 14-day free trial on our Professional and Enterprise plans, with no credit card required. This gives you full access to all features so you can determine if our platform meets your needs.",
  },
];

const cover = `${imagesPath}/testimonial-gateway/qrworkflowdashboard.webp`;

export const testimonials = [
  {
    id: 1,
    image: cover,
    rating: 5,
    text: "Using our platform to collect testimonials was a game-changer. The response rate increased by 78% and our clients loved the simplicity of the process.",
    verified: true,
  },
  {
    id: 2,
    image: cover,
    rating: 4,
    text: "I was hesitant at first, but when I shared my concerns, they addressed them immediately. Now I'm their biggest advocate!",
    verified: true,
  },
  {
    id: 3,
    image: cover,
    rating: 5,
    text: "The feedback loop created by their integration helped us identify issues we weren't aware of and improve our service quality dramatically.",
    verified: true,
  },
];
