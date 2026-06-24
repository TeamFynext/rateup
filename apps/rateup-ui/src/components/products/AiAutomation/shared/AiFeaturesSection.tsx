import { Link } from "@tanstack/react-router";
import {
  Bot,
  Languages,
  MessageSquareCode,
  MousePointerClick,
  Settings,
  Share2,
} from "lucide-react";
import { easeInOut, motion } from "motion/react";

const features = [
  {
    icon: Bot,
    title: "Multiple AI Agents in One Flow",
    description:
      "Orchestrate complex interactions by adding and configuring multiple AI agents within the same automation flow. Each agent can be assigned distinct roles, from customer support to product recommendations, ensuring every task is handled efficiently.",
    href: "#",
  },
  {
    icon: MessageSquareCode,
    title: "Context-Aware Interactions",
    description:
      "Our AI agents don’t just respond; they understand. By analyzing user context, past interactions, and real-time inputs, they personalize responses and dynamically route conversations or tasks for a truly seamless experience.",
    href: "#",
  },
  {
    icon: Share2,
    title: "Seamless Integration with WhatsApp and Web",
    description:
      "Reach your customers wherever they are. Our smart agents integrate effortlessly with popular channels like WhatsApp, your website, kiosks, and other embedded platforms, providing consistent and intelligent support across all touchpoints.",
    href: "#",
  },
  {
    icon: MousePointerClick,
    title: "No-Code, All Power",
    description:
      "Forget complex coding. Our intuitive drag-and-drop interface allows anyone to design sophisticated customer journeys with intelligent decision trees, sentiment-based branching, and automated triggers — no technical expertise required.",
    href: "#",
  },
  {
    icon: Settings,
    title: "Trainable and Customizable Agents",
    description:
      "Tailor each AI agent to your unique business needs. Train them with specific knowledge (FAQs, product info, escalation paths) and fine-tune their responses to reflect your brand’s tone and language perfectly.",
    href: "#",
  },
  {
    icon: Languages,
    title: "Multi-Language Support",
    description:
      "Serve a global audience with ease. Our agents can communicate fluently in regional languages and dynamically switch based on customer preference, breaking down communication barriers.",
    href: "#",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 1.5,
      ease: easeInOut,
    },
  },
};

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-[#fafafa] py-20 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <p className="text-xs font-medium text-[#1c518e] uppercase tracking-widest mb-1">
              Features
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1c518e] leading-snug">
              Key Highlights of the AI Automation Builder
            </h2>
          </div>
          <p className="text-gray-600 text-base sm:text-lg font-medium sm:max-w-sm leading-relaxed">
            Discover how RateUp's smart tools simplify creating powerful, automated workflows.
          </p>
        </div>

        {/* Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="bg-white border border-[#dce3ec] rounded-xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow duration-300"
              variants={cardVariants}
            >
              <feature.icon className="text-[#1c518e] w-10 h-10 mb-4" />
              <h3 className="text-xl font-semibold text-[#013553] mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">{feature.description}</p>
              <Link
                to={feature.href}
                className="text-[#1c518e] font-medium text-sm hover:underline flex items-center gap-1"
              >
                Learn More <span>→</span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
