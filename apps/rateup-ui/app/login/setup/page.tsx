"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Circle,
  Globe,
  HeadphonesIcon,
  HelpCircle,
  Instagram,
  MessageSquare,
  Smartphone,
  Video,
} from "lucide-react";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { imagePath } from "@/components/HomePage/pages/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

function page() {
  const [openSections, setOpenSections] = useState<string[]>(["channels"]);
  const router = useRouter();
  const { data: waSettings, isLoading } = useWaSettings();
  const waConnected = !isLoading && Boolean(waSettings?.length);
  const igConnected =
    waSettings?.some((setting) => setting.ibaId?.length > 0) ?? false;
  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId],
    );
  };

  const resources = [
    {
      icon: Video,
      title: "Watch RateUp intro",
      description: "Get a quick overview of the platform",
    },
    {
      icon: HeadphonesIcon,
      title: "Contact support",
      description: "Get help from our support team",
    },
    {
      icon: Calendar,
      title: "Book a demo",
      description: "Schedule a personalized walkthrough",
    },
    {
      icon: HelpCircle,
      title: "Help center",
      description: "Browse our knowledge base",
    },
    {
      icon: BookOpen,
      title: "Video guides",
      description: "Learn with step-by-step tutorials",
    },
  ];

  const onboardingSteps = [
    {
      id: "channels",
      title: "Connect Channels to unify messaging and calls",
      description:
        "Chat and call customers from apps like WhatsApp, Instagram, and Email—connected as Channels in one unified inbox.",
      tasks: [
        {
          id: "whatsapp",
          title: "Connect WhatsApp Business",
          description:
            "Link your WhatsApp Business account to manage customer conversations",
          icon: MessageSquare,
          color: "text-green-600",
          bgColor: "bg-green-100",
        },
        {
          id: "instagram",
          title: "Connect Instagram Business",
          description:
            "Integrate your Instagram Business profile for DM management",
          icon: Instagram,
          color: "text-purple-600",
          bgColor: "bg-purple-100",
        },
      ],
      illustration: (
        <div className="relative w-48 h-32 bg-linear-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
          <div className="grid grid-cols-2 gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      ),
    },
  ];

  const connectionMap: Record<string, boolean> = {
    whatsapp: waConnected,
    instagram: igConnected,

    // future:
    // email: emailConnected,
    // sms: smsConnected,
    // shopify: shopifyConnected,
  };
  const isTaskConnected = (taskId: string) => {
    return connectionMap[taskId] ?? false;
  };
  const getStepCompletion = (step: any) => {
    const completed = step.tasks.filter((task: any) =>
      isTaskConnected(task.id),
    ).length;

    const total = step.tasks.length;

    return {
      completedCount: completed,
      totalCount: total,
      isCompleted: completed === total,
    };
  };
  return (
    <div className="relative">
      <div className="bg-white dark:bg-transparent border-b border-gray-200 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <img
                src={`${imagePath}/rateup-logo-blue-text.svg`}
                alt="RateUp Logo"
                className="w-[87px] h-auto"
              />
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <Video className="w-4 h-4 mr-2" />
                Watch RateUp intro
              </Button>
              <Button variant="outline" size="sm">
                <HeadphonesIcon className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Contact Support</span>
              </Button>
              <Button size="sm" style={{ backgroundColor: "#2E5BFF" }}>
                <Calendar className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Book a Demo</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* welcome */}
            <div className="bg-linear-to-r from-blue-600 to-purple-600 rounded-xl text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center space-x-2">
                    <div className="text-4xl">👋</div>
                    <h2 className="text-xl sm:text-2xl">
                      Hello, there! Let's get started.
                    </h2>
                  </div>
                  <p className="text-blue-100">
                    Welcome aboard! Let's start exploring and set up your
                    customer engagement platform.
                  </p>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm">
                      Welcome aboard! Let's start exploring.
                    </div>
                    <div className="text-sm">
                      {"10"} of {"10"}
                    </div>
                  </div>
                  <Progress value={40} className="mt-2 h-2 bg-blue-700" />
                </div>
              </div>
            </div>
            {/* onbaording */}
            <div className="space-y-4">
              {onboardingSteps.map((step, index) => {
                const { completedCount, totalCount, isCompleted } =
                  getStepCompletion(step);
                return (
                  <Card key={step.id} className="overflow-hidden">
                    <Collapsible
                      open={openSections.includes(step.id)}
                      onOpenChange={() => toggleSection(step.id)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-6 cursor-pointer">
                          <div className="flex items-center space-x-4">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isCompleted ? "bg-green-500" : "bg-gray-200"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle className="w-5 h-5 text-white" />
                              ) : (
                                <Circle className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="text-left">
                              <h3 className="text-lg">{step.title}</h3>
                              <p className="text-xs">{step.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge variant="secondary">
                              {completedCount} of {totalCount}
                            </Badge>
                            {openSections.includes(step.id) ? (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-6 pb-6">
                          <Separator className="mb-6" />

                          {step.tasks ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                {step.tasks.map((task) => {
                                  const isConnected = isTaskConnected(task.id);
                                  return (
                                    <div
                                      key={task.id}
                                      className="flex items-start space-x-3 p-4 border rounded-lg hover:shadow-md transition-shadow"
                                    >
                                      <button
                                        className={`w-6 h-6 rounded-full flex items-center justify-center mt-1 ${
                                          isConnected
                                            ? "bg-green-500"
                                            : "bg-gray-200"
                                        }`}
                                      >
                                        {isConnected && (
                                          <CheckCircle className="w-4 h-4 text-white" />
                                        )}
                                      </button>

                                      <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                          <div
                                            className={`w-8 h-8 ${task.bgColor} rounded-lg flex items-center justify-center`}
                                          >
                                            <task.icon
                                              className={`w-4 h-4 ${task.color}`}
                                            />
                                          </div>
                                          <h4 className="text-sm">
                                            {task.title}
                                          </h4>
                                        </div>

                                        <p className="text-sm text-gray-600 mb-3">
                                          {task.description}
                                        </p>

                                        <Button
                                          size="sm"
                                          style={{ backgroundColor: "#2E5BFF" }}
                                          onClick={() => {
                                            router.push(
                                              `/dashboard/settings/channels/${task.id}`,
                                            );
                                          }}
                                        >
                                          {isConnected
                                            ? "Configure"
                                            : "Connect"}
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {step.illustration && (
                                <div className="flex items-center justify-center">
                                  {step.illustration}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                              <div>
                                <h4 className="mb-1">{step.title}</h4>
                                <p className="text-sm text-gray-600">
                                  {step.description}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                style={{ backgroundColor: "#2E5BFF" }}
                              >
                                Get Started
                              </Button>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          </div>
          <div className="lg:col-span-1">
            <Card className="sticky top-40">
              <div className="p-6">
                <h3 className="mb-4">Resources</h3>
                <div className="space-y-4">
                  {resources.map((resource, index) => (
                    <button
                      key={index}
                      className="flex items-center space-x-3 w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors dark:hover:bg-transparent"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <resource.icon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm">{resource.title}</p>
                        <p className="text-xs text-gray-600">
                          {resource.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default page;
