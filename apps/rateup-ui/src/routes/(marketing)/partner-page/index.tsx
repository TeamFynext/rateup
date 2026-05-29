import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Crown,
  DollarSign,
  GraduationCap,
  Handshake,
  LifeBuoy,
  Rocket,
  Target,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { pageMetadata } from "@/lib/metadata.ts";
import { PartnerApplyModal } from "@/components/(marketing)/partner/partnerData";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter";
import Layout from "@/components/RateupHomePage/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

("use client");

export const Route = createFileRoute("/(marketing)/partner-page/")({
  component: PartnershipPage,
  head: () => ({
    meta: [pageMetadata["/contact-us"]],
  }),
});

interface PartnershipPageProps {
  onGetStarted?: () => void;
  onBackToHome?: () => void;
}

function PartnershipPage({ onGetStarted, onBackToHome }: PartnershipPageProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };
  const [open, setOpen] = useState(false);
  return (
    <Layout navbarClassName="bg-gradient-to-br from-[#0f1729] via-[#1a2642] to-[#0f1729]">
      <div className="min-h-screen bg-white">
        {/* Hero Section - Dark Background */}
        <section className="pt-12 pb-20 px-6 lg:px-8 bg-gradient-to-br from-[#0f1729] via-[#1a2642] to-[#0f1729] relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-10 w-96 h-96 bg-[#2E5BFF] rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
            <div
              className="absolute top-40 right-10 w-96 h-96 bg-[#FF9500] rounded-full mix-blend-multiply filter blur-3xl animate-pulse"
              style={{ animationDelay: "2s" }}
            ></div>
          </div>

          <div className="mx-auto max-w-5xl relative">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <Handshake className="w-4 h-4 text-[#FF9500]" />
                <span className="text-sm text-white">Partner Program</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                Become a{" "}
                <span className="bg-gradient-to-r from-[#2E5BFF] to-[#FF9500] bg-clip-text text-transparent">
                  RateUp Partner
                </span>
              </h1>

              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Refer your clients to RateUp and start earning monthly
                commissions. Grow your business while helping companies
                transform their customer engagement.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button
                  onClick={() => setOpen(true)}
                  size="lg"
                  className="bg-gradient-to-r from-[#2E5BFF] to-[#1a3db8] hover:from-[#1a3db8] hover:to-[#2E5BFF] text-white shadow-xl shadow-[#2E5BFF]/30 px-8 py-6 text-lg group border-0"
                >
                  Apply Now
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  className="bg-white/10 hover:bg-white/20 text-white border-2 border-white/50 hover:border-white/70 backdrop-blur-sm px-8 py-6 text-lg"
                >
                  Learn More
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-12 border-t border-white/10">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-1">
                    15-40%
                  </div>
                  <div className="text-sm text-gray-400">
                    Lifetime Commission
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-1">
                    5,000+
                  </div>
                  <div className="text-sm text-gray-400">Active Businesses</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-1">$0</div>
                  <div className="text-sm text-gray-400">Partner Fee</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Program Overview - White Background */}
        <section className="py-20 px-6 lg:px-8 bg-white">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <Badge className="bg-[#2E5BFF]/10 text-[#2E5BFF] border-[#2E5BFF]/20 mb-4">
                How It Works
              </Badge>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                What is the RateUp Partner Program?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Designed for businesses ready to enhance their portfolio by
                offering RateUp's customer engagement platform
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-8 border-2 border-gray-100 hover:border-[#2E5BFF]/30 hover:shadow-lg transition-all">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#2E5BFF] to-[#1a3db8] flex items-center justify-center mb-4">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Your Role
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Handle promotion, reselling, and implementation support for
                  RateUp. You maintain ongoing client relationships and provide
                  first-line support to your customers.
                </p>
              </Card>

              <Card className="p-8 border-2 border-gray-100 hover:border-[#2E5BFF]/30 hover:shadow-lg transition-all">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#FF9500] to-[#cc7700] flex items-center justify-center mb-4">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Your Earnings
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Earn 15% to 40% lifetime commissions on all referred clients.
                  The more you grow, the more you earn. Monthly recurring
                  revenue that scales with your efforts.
                </p>
              </Card>

              <Card className="p-8 border-2 border-gray-100 hover:border-[#2E5BFF]/30 hover:shadow-lg transition-all">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#2E5BFF] to-[#1a3db8] flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Customer Ownership
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  You own the customer relationship. Build long-term
                  partnerships with your clients while RateUp provides the
                  technology platform and technical support.
                </p>
              </Card>

              <Card className="p-8 border-2 border-gray-100 hover:border-[#2E5BFF]/30 hover:shadow-lg transition-all">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#FF9500] to-[#cc7700] flex items-center justify-center mb-4">
                  <Rocket className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Growth Support
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Access sales collaterals, training materials, and dedicated
                  partner manager support to accelerate your success and close
                  more deals faster.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Partnership Success Image Section - White Background */}
        <section className="py-20 px-6 lg:px-8 bg-white">
          <div className="mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left side - Image */}
              <div className="relative order-2 lg:order-1">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src="https://images.unsplash.com/photo-1549923746-c502d488b3ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw1fHxidXNpbmVzcyUyMHBhcnRuZXJzaGlwJTIwaGFuZHNoYWtlJTIwY29sbGFib3JhdGlvbiUyMG9mZmljZSUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3Nzg3MjczMjl8MA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Partnership Success"
                    className="w-full h-auto"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#2E5BFF]/20 via-transparent to-[#FF9500]/20"></div>
                </div>

                {/* Floating stats cards */}
                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 border-2 border-[#2E5BFF]/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#2E5BFF] to-[#1a3db8] flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        40%
                      </div>
                      <div className="text-xs text-gray-600">Top Tier Rate</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-6 -right-6 bg-white rounded-xl shadow-xl p-4 border-2 border-[#FF9500]/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF9500] to-[#cc7700] flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        500+
                      </div>
                      <div className="text-xs text-gray-600">Partners</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Content */}
              <div className="space-y-6 order-1 lg:order-2">
                <Badge className="bg-[#2E5BFF]/10 text-[#2E5BFF] border-[#2E5BFF]/20">
                  Success Stories
                </Badge>

                <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                  Join Our Growing{" "}
                  <span className="bg-gradient-to-r from-[#2E5BFF] to-[#FF9500] bg-clip-text text-transparent">
                    Partner Network
                  </span>
                </h2>

                <p className="text-lg text-gray-600 leading-relaxed">
                  Our partners are experiencing unprecedented growth by offering
                  RateUp's comprehensive customer engagement platform. From
                  digital agencies to consulting firms, partners across
                  industries are transforming their business models with
                  recurring revenue streams.
                </p>

                <div className="space-y-4">
                  {[
                    {
                      icon: CheckCircle2,
                      title: "Proven Track Record",
                      description:
                        "Partners average 35% revenue growth in their first year",
                    },
                    {
                      icon: CheckCircle2,
                      title: "Dedicated Support",
                      description:
                        "Personal partner manager and 24/7 technical assistance",
                    },
                    {
                      icon: CheckCircle2,
                      title: "Market Leader",
                      description:
                        "Industry-leading platform trusted by 5,000+ businesses",
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2E5BFF]/10 flex items-center justify-center mt-0.5">
                        <item.icon className="w-4 h-4 text-[#2E5BFF]" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {item.title}
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <Button
                    onClick={() => setOpen(true)}
                    size="lg"
                    className="bg-gradient-to-r from-[#2E5BFF] to-[#1a3db8] hover:from-[#1a3db8] hover:to-[#2E5BFF] text-white shadow-lg shadow-[#2E5BFF]/30 px-8 py-6 group border-0"
                  >
                    Become a Partner
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Benefits - Dark Background */}
        <section className="py-20 px-6 lg:px-8 bg-gradient-to-br from-[#0f1729] via-[#1a2642] to-[#0f1729] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-[#2E5BFF] rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
            <div
              className="absolute top-20 right-10 w-96 h-96 bg-[#FF9500] rounded-full mix-blend-multiply filter blur-3xl animate-pulse"
              style={{ animationDelay: "2s" }}
            ></div>
          </div>

          <div className="mx-auto max-w-6xl relative">
            <div className="text-center mb-12">
              <Badge className="bg-white/10 text-white border-white/20 mb-4">
                Partner Benefits
              </Badge>
              <h2 className="text-4xl font-bold text-white mb-4">
                Why Partner with RateUp?
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Six powerful advantages to help you succeed as a RateUp partner
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: BookOpen,
                  title: "Sales Collaterals",
                  description:
                    "Access comprehensive sales materials, demo accounts, and onboarding resources to close deals faster.",
                  color: "from-[#2E5BFF] to-[#1a3db8]",
                },
                {
                  icon: LifeBuoy,
                  title: "Dedicated Partner Manager",
                  description:
                    "Get personalized support from your dedicated partner manager for regular collaboration and guidance.",
                  color: "from-[#FF9500] to-[#cc7700]",
                },
                {
                  icon: GraduationCap,
                  title: "Success Training",
                  description:
                    "Learn from our sales team's best practices through comprehensive training programs and workshops.",
                  color: "from-[#2E5BFF] to-[#1a3db8]",
                },
                {
                  icon: BadgeCheck,
                  title: "Partner Badge & Directory",
                  description:
                    "Gain credibility with an official partner badge and listing in our partner directory for visibility.",
                  color: "from-[#FF9500] to-[#cc7700]",
                },
                {
                  icon: UserPlus,
                  title: "Pre-Qualified Leads",
                  description:
                    "Receive pre-qualified leads distributed by region and specialty to grow your client base.",
                  color: "from-[#2E5BFF] to-[#1a3db8]",
                },
                {
                  icon: TrendingUp,
                  title: "Revenue Share",
                  description:
                    "Maximize earnings with competitive revenue share opportunities on all resold plans and upgrades.",
                  color: "from-[#FF9500] to-[#cc7700]",
                },
              ].map((benefit, idx) => (
                <Card
                  key={idx}
                  className="p-6 bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all group"
                >
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-sm">
                    {benefit.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Partner Journey - White Background */}
        <section className="py-20 px-6 lg:px-8 bg-white">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <Badge className="bg-[#2E5BFF]/10 text-[#2E5BFF] border-[#2E5BFF]/20 mb-4">
                Your Journey
              </Badge>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                How to Get Started
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Simple steps to become a RateUp partner and start earning
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Apply",
                  description:
                    "Submit your partner application and complete the qualification process.",
                  icon: UserPlus,
                },
                {
                  step: "02",
                  title: "Get Trained",
                  description:
                    "Access training materials and complete onboarding with your partner manager.",
                  icon: GraduationCap,
                },
                {
                  step: "03",
                  title: "Start Earning",
                  description:
                    "Refer clients, close deals, and earn recurring monthly commissions.",
                  icon: DollarSign,
                },
              ].map((step, idx) => (
                <div key={idx} className="relative">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2E5BFF] to-[#1a3db8] text-white text-2xl font-bold mb-4">
                      {step.step}
                    </div>
                    <div className="mb-4">
                      <step.icon className="w-8 h-8 text-[#2E5BFF] mx-auto" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                  {idx < 2 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-[#2E5BFF] to-[#FF9500] -translate-x-1/2"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section - White Background */}
        <section className="py-20 px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <Badge className="bg-[#2E5BFF]/10 text-[#2E5BFF] border-[#2E5BFF]/20 mb-4">
                FAQs
              </Badge>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-gray-600">
                Everything you need to know about the RateUp Partner Program
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  question: "How do I become a RateUp partner?",
                  answer:
                    "To become a partner, submit your application through our partner portal. Once submitted, you'll complete a qualification test and onboarding process with your assigned partner manager. The process typically takes 3-5 business days.",
                },
                {
                  question: "Are there any costs to join the partner program?",
                  answer:
                    "No, there are absolutely no charges to join the RateUp Partner Program. Partners receive a free demo account with full feature access to demonstrate the platform to potential clients.",
                },
                {
                  question: "What commission rates can I expect?",
                  answer:
                    "Partners earn between 15% to 40% lifetime recurring commissions based on their tier level and performance. Higher tiers unlock increased commission rates, priority support, and additional benefits.",
                },
                {
                  question: "How does the partner program benefit my business?",
                  answer:
                    "The program drives business growth through pre-qualified leads, partner directory listing for visibility, comprehensive training resources, and dedicated support. You can expand your service offerings while generating recurring revenue.",
                },
                {
                  question: "What support do I get as a partner?",
                  answer:
                    "Every partner receives a dedicated partner manager, access to sales and marketing collaterals, technical support, training materials, and pre-qualified leads distributed by region and industry specialty.",
                },
              ].map((faq, idx) => (
                <Card
                  key={idx}
                  className="border-2 border-gray-100 hover:border-[#2E5BFF]/30 transition-all overflow-hidden"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                  >
                    <span className="text-lg font-semibold text-gray-900 pr-4">
                      {faq.question}
                    </span>
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-lg bg-[#2E5BFF]/10 flex items-center justify-center transition-transform ${openFaqIndex === idx ? "rotate-180" : ""}`}
                    >
                      <ChevronDown className="w-5 h-5 text-[#2E5BFF]" />
                    </div>
                  </button>
                  {openFaqIndex === idx && (
                    <div className="px-6 pb-5">
                      <p className="text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section - Dark Background */}
        <section className="py-20 px-6 lg:px-8 bg-gradient-to-br from-[#0f1729] via-[#1a2642] to-[#0f1729] relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-10 w-96 h-96 bg-[#2E5BFF] rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
            <div
              className="absolute bottom-20 right-10 w-96 h-96 bg-[#FF9500] rounded-full mix-blend-multiply filter blur-3xl animate-pulse"
              style={{ animationDelay: "2s" }}
            ></div>
          </div>

          <div className="mx-auto max-w-4xl text-center relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <Crown className="w-4 h-4 text-[#FF9500]" />
              <span className="text-sm text-white">Join Today</span>
            </div>

            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Grow Your Business with{" "}
              <span className="bg-gradient-to-r from-[#2E5BFF] to-[#FF9500] bg-clip-text text-transparent">
                RateUp?
              </span>
            </h2>

            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Apply now to become a RateUp partner and start earning recurring
              commissions while helping businesses transform their customer
              engagement.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => setOpen(true)}
                size="lg"
                className="bg-gradient-to-r from-[#2E5BFF] to-[#1a3db8] hover:from-[#1a3db8] hover:to-[#2E5BFF] text-white shadow-xl shadow-[#2E5BFF]/30 px-8 py-6 text-lg group border-0"
              >
                Apply Now
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                className="bg-white/10 hover:bg-white/20 text-white border-2 border-white/50 hover:border-white/70 backdrop-blur-sm px-8 py-6 text-lg"
              >
                Contact Sales
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-12 pt-8 border-t border-white/10">
              <div className="flex items-center gap-2 text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-[#2E5BFF]" />
                <span className="text-sm">No joining fees</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-[#2E5BFF]" />
                <span className="text-sm">Free demo account</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-[#2E5BFF]" />
                <span className="text-sm">Recurring commissions</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-[#2E5BFF]" />
                <span className="text-sm">Dedicated support</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <HomePageFooter />
      </div>
      <PartnerApplyModal open={open} onOpenChange={setOpen} />
    </Layout>
  );
}
