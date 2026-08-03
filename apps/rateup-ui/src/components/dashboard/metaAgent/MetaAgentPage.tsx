import {
  IconArrowLeft,
  IconArrowRight,
  IconBook,
  IconPlayerPlay,
  IconPlug,
  IconRocket,
  IconSettings2,
  IconSparkles,
} from "@tabler/icons-react";
import { useState } from "react";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ConnectorsSection } from "./components/ConnectorsSection";
import { KnowledgeSection } from "./components/KnowledgeSection";
import { OnboardingHero } from "./components/OnboardingHero";
import { OperateSection } from "./components/OperateSection";
import { SettingsSection } from "./components/SettingsSection";
import { SkillsSection } from "./components/SkillsSection";

const SECTIONS = [
  {
    id: "knowledge",
    label: "Knowledge",
    icon: IconBook,
    description: "Business info, FAQs, files & websites the agent can draw answers from.",
  },
  {
    id: "skills",
    label: "Skills",
    icon: IconSparkles,
    description: "Custom capabilities the agent is allowed to perform in a conversation.",
  },
  {
    id: "connectors",
    label: "Connectors",
    icon: IconPlug,
    description: "External APIs and tools the agent can call for live data.",
  },
  {
    id: "settings",
    label: "Settings",
    icon: IconSettings2,
    description: "Rollout percentage, human handoff rules, and audience targeting.",
  },
  {
    id: "operate",
    label: "Operate",
    icon: IconPlayerPlay,
    description: "Test conversations, inspect events, and pause or resume the agent.",
  },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function MetaAgentPage() {
  const { data: waSettings, isLoading } = useWaSettings();
  const [selectedId, setSelectedId] = useState<string>();
  const [section, setSection] = useState<SectionId | null>(null);

  const activeSettingsId = selectedId ?? waSettings?.[0]?.id;
  const activeSection = SECTIONS.find((s) => s.id === section);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div className="flex flex-col gap-2">
          <Badge variant="secondary" className="w-fit">
            <IconRocket data-icon="inline-start" />
            Meta Business Agent
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">AI Agent for WhatsApp</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Everything here is saved in Rateup first. Nothing is sent to Meta until you press a
            save, sync, or action button.
          </p>
        </div>
        {!!waSettings?.length && (
          <Select
            value={activeSettingsId}
            onValueChange={(value) => {
              setSelectedId(value ?? undefined);
              setSection(null);
            }}
            items={waSettings.map((s) => ({ value: s.id, label: s.phoneDisplayName || s.phone }))}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select WhatsApp number" />
            </SelectTrigger>
            <SelectContent>
              {waSettings.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.phoneDisplayName || s.phone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!isLoading && !waSettings?.length && (
        <Empty className="rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconRocket />
            </EmptyMedia>
            <EmptyTitle>No WhatsApp channel connected</EmptyTitle>
            <EmptyDescription>
              Connect a WhatsApp number under Settings &rarr; Channels before configuring the Meta
              AI Agent.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!!activeSettingsId && (
        <div className="space-y-6">
          <OnboardingHero waSettingsId={activeSettingsId} />

          {section === null ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <Card
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSection(s.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSection(s.id);
                    }}
                    className="cursor-pointer transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <CardHeader>
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4.5" />
                      </div>
                      <CardTitle className="mt-2">{s.label}</CardTitle>
                      <CardDescription>{s.description}</CardDescription>
                      <CardAction>
                        <IconArrowRight className="size-4 text-muted-foreground" />
                      </CardAction>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setSection(null)}>
                <IconArrowLeft data-icon="inline-start" />
                Back to overview
              </Button>

              <Card>
                <CardHeader>
                  <CardTitle>{activeSection?.label}</CardTitle>
                  <CardDescription>{activeSection?.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {section === "knowledge" && <KnowledgeSection waSettingsId={activeSettingsId} />}
                  {section === "skills" && <SkillsSection waSettingsId={activeSettingsId} />}
                  {section === "connectors" && (
                    <ConnectorsSection waSettingsId={activeSettingsId} />
                  )}
                  {section === "settings" && <SettingsSection waSettingsId={activeSettingsId} />}
                  {section === "operate" && <OperateSection waSettingsId={activeSettingsId} />}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
