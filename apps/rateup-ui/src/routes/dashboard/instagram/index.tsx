import {
  IconArrowRight,
  IconAt,
  IconBrandInstagram,
  IconMessageDots,
  IconSettings,
} from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";

export const Route = createFileRoute("/dashboard/instagram/")({
  component: InstagramDashboardHub,
});

function InstagramDashboardHub() {
  const features = [
    {
      title: "Ice Breakers",
      description: "Manage the starter questions users see before they open a conversation.",
      icon: IconMessageDots,
      to: "/dashboard/instagram/ice-breakers",
      action: "Manage ice breakers",
    },
    {
      title: "ig.me Links",
      description: "Generate and copy direct conversation links with referral parameters.",
      icon: IconBrandInstagram,
      to: "/dashboard/instagram/ig-me-links",
      action: "Generate links",
    },
    {
      title: "Persistent Menu",
      description: "Control the menu of always-available actions in Instagram conversations.",
      icon: IconSettings,
      to: "/dashboard/instagram/persistent-menu",
      action: "Edit menu",
    },
    {
      title: "chatbots",
      description: "Create and manage Instagram chatbots, triggers, and handoff flows.",
      icon: IconMessageDots,
      to: "/dashboard/instagram/flowbots",
      action: "Manage chatbots",
    },
    {
      title: "Story Mentions",
      description:
        "Get notified and respond when users mention your professional account in their stories.",
      icon: IconAt,
      to: "/dashboard/automation/new?platform=INSTAGRAM&triggerEvent=INSTAGRAM_STORY_MENTION",
      action: "Set up in automations",
    },
    // {
    //   title: "Private Replies",
    //   description:
    //     "Reply privately to users who comment on your posts, reels, or live stories.",
    //   icon: IconMessageReply,
    //   to: "/dashboard/automation/new?platform=INSTAGRAM&triggerEvent=INSTAGRAM_COMMENT",
    //   action: "Set up in automations",
    // },
  ];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border bg-linear-to-br from-pink-500/10 via-background to-orange-500/10 p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <IconBrandInstagram className="h-4 w-4 text-pink-600" />
              Instagram management hub
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Manage every Instagram entry point in one place
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground md:text-base">
                Configure channel connections, automate replies, and control the profile-level
                experiences that users see before they start a conversation.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/dashboard/settings/channels/instagram">Channel settings</Link>
            </Button>
            <Button asChild>
              <Link to="/dashboard/instagram/flowbots">Open automations</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <Card
              key={feature.title}
              className="border-border/70 transition-colors hover:border-border"
            >
              <CardHeader className="space-y-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                    <CardDescription className="mt-1">{feature.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant="ghost" className="px-0 text-pink-600 hover:text-pink-700">
                  <Link to={feature.to}>
                    {feature.action}
                    <IconArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
