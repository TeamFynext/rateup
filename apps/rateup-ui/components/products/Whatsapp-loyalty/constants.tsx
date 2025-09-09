import {
  Award,
  BarChart,
  BarChart3,
  Coffee,
  Dumbbell,
  Gift,
  HeartPulse,
  LayoutDashboard,
  LayoutGrid,
  MessageSquare,
  MessageSquareText,
  Package,
  QrCode,
  RocketIcon,
  Scale,
  Scissors,
  ShoppingBag,
  Sliders,
  Star,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

import { imagesPath } from "@/utils/constants";

const feature1 = `${imagesPath}/whatsapp-loyalty/feature1.png`;
const feature2 = `${imagesPath}/whatsapp-loyalty/feature2.png`;
const feature3 = `${imagesPath}/whatsapp-loyalty/feature3.png`;
const feature4 = `${imagesPath}/whatsapp-loyalty/feature4.png`;

export const cardData = [
  {
    icon: <TrendingUp className="w-8 h-8 text-[#25D366]" />,
    value: "5-25x",
    label: "Customer acquisition costs more than retention",
    description: "Focus on retention and watch your ROI grow exponentially.",
    borderColor: "#25D366",
    iconBg: "bg-[#25D366]/10",
  },
  {
    icon: <Award className="w-8 h-8 text-[#128C7E]" />,
    value: "67%",
    label: "Loyal customers spend more per order",
    description:
      "They become your brand advocates and create sustainable growth.",
    borderColor: "#128C7E",
    iconBg: "bg-[#128C7E]/10",
  },
  {
    icon: <Users className="w-8 h-8 text-[#FFBB33]" />,
    value: "92%",
    label: "Trust friends' recommendations over ads",
    description:
      "RateUp helps turn customers into ambassadors for your business.",
    borderColor: "#FFBB33",
    iconBg: "bg-[#FFBB33]/10",
  },
];

export const steps = [
  {
    title: "Create Custom Actions in Minutes",
    description:
      "Create targeted actions like referrals, purchases, or registrations to incentivize behaviors that matter most to your business.",
    icon: <Award className="h-6 w-6 text-purple-600" />,
    image: feature1,
    bgColor: "bg-gradient-to-br from-purple-50 to-purple-100",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
    badgeText: "Step 1",
    badgeColor: "bg-purple-100 text-purple-800 border border-purple-200",
    benefits: ["No-code setup", "Custom triggers", "Dynamic rewards"],
  },
  {
    title: "Engage Customers Where They Are",
    description:
      "Share campaigns instantly via WhatsApp—the platform your customers already use daily—for seamless, frictionless participation.",
    icon: <MessageSquare className="h-6 w-6 text-green-600" />,
    image: feature2,
    bgColor: "bg-gradient-to-br from-green-50 to-green-100",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    badgeText: "Step 2",
    badgeColor: "bg-green-100 text-green-800 border border-green-200",
    benefits: ["95% open rates", "No app downloads", "Instant engagement"],
  },
  {
    title: "Turn Activity into Loyalty",
    description:
      "Customers earn points or rewards for every action, keeping them coming back. The more they engage, the more your retention and referrals grow.",
    icon: <Star className="h-6 w-6 text-amber-600" />,
    image: feature3,
    bgColor: "bg-gradient-to-br from-amber-50 to-amber-100",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
    badgeText: "Step 3",
    badgeColor: "bg-amber-100 text-amber-800 border border-amber-200",
    benefits: ["Gamified rewards", "Point tracking", "Custom milestones"],
  },
  {
    title: "Build a Self-Sustaining Growth Engine",
    description:
      "Reward loyal customers, attract new ones through referrals, and watch your revenue scale—all while cutting acquisition costs.",
    icon: <BarChart3 className="h-6 w-6 text-blue-600" />,
    image: feature4,
    bgColor: "bg-gradient-to-br from-blue-50 to-blue-100",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    badgeText: "Step 4",
    badgeColor: "bg-blue-100 text-blue-800 border border-blue-200",
    benefits: ["Analytics dashboard", "ROI tracking", "Automated growth"],
  },
];

export const features = [
  {
    title: "Launch",
    description: "Launch campaigns without tech headaches or complex setups.",
    icon: <RocketIcon className="w-6 h-6 text-purple-600" />,
    color: "bg-purple-50 border-purple-100",
    iconBg: "bg-purple-100",
  },
  {
    title: "Analyze",
    description:
      "Track performance in real-time with easy-to-understand metrics.",
    icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
    color: "bg-blue-50 border-blue-100",
    iconBg: "bg-blue-100",
  },
  {
    title: "Scale",
    description: "Grow your loyalty program as your business expands.",
    icon: <Scale className="w-6 h-6 text-green-600" />,
    color: "bg-green-50 border-green-100",
    iconBg: "bg-green-100",
  },
];

export const benefits = [
  {
    title: "Low Effort, High Impact",
    description: "Launch campaigns without tech headaches or complex setups.",
    icon: <LayoutGrid className="w-6 h-6 text-orange-600" />,
    color: "bg-orange-50 border-orange-100",
  },
  {
    title: "Proven ROI",
    description:
      "Turn loyal customers into brand advocates who drive referrals and repeat sales.",
    icon: <TrendingUp className="w-6 h-6 text-emerald-600" />,
    color: "bg-emerald-50 border-emerald-100",
  },
  {
    title: "Lightning Fast Setup",
    description:
      "Get your loyalty program up and running in minutes, not weeks.",
    icon: <Zap className="w-6 h-6 text-amber-600" />,
    color: "bg-amber-50 border-amber-100",
  },
];

export const steps2 = [
  {
    icon: <QrCode className="h-8 w-8 text-green-600" />,
    title: "Onboard Instantly",
    description:
      "Customers scan a QR or message you on WhatsApp — no apps, no forms.",
  },
  {
    icon: <Star className="h-8 w-8 text-green-600" />,
    title: "Earn with Every Purchase",
    description: "Points are auto-added based on your rules. Fully trackable.",
  },
  {
    icon: <MessageSquareText className="h-8 w-8 text-green-600" />,
    title: "Redeem & Refer Easily",
    description:
      "Customers redeem points or share a referral link — all on WhatsApp.",
  },
  {
    icon: <LayoutDashboard className="h-8 w-8 text-green-600" />,
    title: "You Get Full Control",
    description:
      "Track performance, campaigns, and customer data in one dashboard.",
  },
];

export const features2 = [
  {
    icon: <MessageSquareText className="h-8 w-8 text-green-600" />,
    title: "WhatsApp-Based",
    description: "Reward customers where they already are — on WhatsApp.",
  },
  {
    icon: <X className="h-8 w-8 text-green-600" />,
    title: "No App Needed",
    description: "No downloads. No physical cards. Just scan and go.",
  },
  {
    icon: <Sliders className="h-8 w-8 text-green-600" />,
    title: "Custom Rules",
    description: "Set your own earning and redemption logic.",
  },
  {
    icon: <Users className="h-8 w-8 text-green-600" />,
    title: "Referral Tracking",
    description: "Customers refer friends via WhatsApp and earn rewards.",
  },
  {
    icon: <Gift className="h-8 w-8 text-green-600" />,
    title: "Auto-Rewards",
    description: "Coupons and offers sent automatically.",
  },
  {
    icon: <BarChart className="h-8 w-8 text-green-600" />,
    title: "Smart Analytics",
    description: "Real-time insights on loyalty, repeat purchases, and ROI.",
  },
];

export const testimonials = [
  {
    quote:
      "This is the first loyalty program our customers actually use. It's seamless, and we saw a 60% increase in repeat visits.",
    author: "Shalini",
    position: "Founder, NaturGlow Salon",
    rating: 5,
  },
  {
    quote:
      "No more stamp cards! Our staff and customers both love how easy it is.",
    author: "Ramesh",
    position: "Café Owner",
    rating: 5,
  },
  {
    quote:
      "We started seeing customers come back more frequently within just two weeks of using RateUp. The WhatsApp integration is genius.",
    author: "Priya",
    position: "Boutique Manager",
    rating: 5,
  },
];

export const businesses = [
  {
    icon: <ShoppingBag className="h-8 w-8 text-[#009987]" />,
    title: "Retail & Fashion Boutiques",
    description: "Reward loyal shoppers and track repeat customers with ease.",
  },
  {
    icon: <Scissors className="h-8 w-8 text-[#009987]" />,
    title: "Salons & Spas",
    description:
      "Keep your clients coming back for their next self-care session.",
  },
  {
    icon: <Coffee className="h-8 w-8 text-[#009987]" />,
    title: "Cafes & Restaurants",
    description: "Offer instant rewards and boost table turnarounds.",
  },
  {
    icon: <HeartPulse className="h-8 w-8 text-[#009987]" />,
    title: "Clinics & Wellness Centers",
    description: "Incentivize follow-up visits and encourage referrals.",
  },
  {
    icon: <Dumbbell className="h-8 w-8 text-[#009987]" />,
    title: "Gyms & Fitness Studios",
    description: "Reward consistent attendance and renewals.",
  },
  {
    icon: <Package className="h-8 w-8 text-[#009987]" />,
    title: "D2C & Ecommerce Brands",
    description:
      "Delight online customers with personalized WhatsApp loyalty programs.",
  },
];

export const faqs = [
  {
    question: "Do customers need to download an app?",
    answer: "Nope. Everything works right inside WhatsApp.",
  },
  {
    question: "Can I customize how points are earned?",
    answer: "Absolutely. Set rules that match your business.",
  },
  {
    question: "How does referral tracking work?",
    answer: "Customers get a unique link via WhatsApp to share.",
  },
  {
    question: "Do I need technical skills to set it up?",
    answer: "Not at all. Our team helps you set it up in minutes.",
  },
  {
    question: "What's included in the free plan?",
    answer:
      "You get full access to core features with up to 100 customers/month.",
  },
];
