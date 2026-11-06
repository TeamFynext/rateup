import { useMemo } from "react";

import {
  useAgentSettings,
  useBusinessInfo,
  useConnectors,
  useFaqs,
  useKnowledgeFiles,
  useMetaBusinessAgent,
  useSkills,
  useUiSkills,
  useWebsites,
} from "@/backend/metaAgent/metaAgent.query";

import { getAgentSetupProgress, type AgentSetupProgress } from "./agentSetup.ts";

/**
 * Setup progress for one channel's agent. Every query here is one a section
 * already makes, and they all read the local mirror rather than calling Meta,
 * so the guide and the step rail cost nothing extra — and they share the cache
 * with the sections, so saving in one updates the other.
 */
export function useAgentSetup(waSettingsId: string): AgentSetupProgress & {
  isLoading: boolean;
} {
  const agent = useMetaBusinessAgent(waSettingsId);
  const businessInfo = useBusinessInfo(waSettingsId);
  const faqs = useFaqs(waSettingsId);
  const files = useKnowledgeFiles(waSettingsId);
  const websites = useWebsites(waSettingsId);
  const skills = useSkills(waSettingsId);
  const uiSkills = useUiSkills(waSettingsId);
  const connectors = useConnectors(waSettingsId);
  const settings = useAgentSettings(waSettingsId);

  const progress = useMemo(
    () =>
      getAgentSetupProgress({
        eligible: agent.data?.isEligible === true,
        onboarded: agent.data?.status === "ONBOARDED",
        hasKnowledge:
          Boolean(businessInfo.data?.business_description?.trim()) ||
          Boolean(faqs.data?.length) ||
          Boolean(files.data?.length) ||
          Boolean(websites.data?.length),
        skillCount: skills.data?.length ?? 0,
        uiSkillCount: uiSkills.data?.length ?? 0,
        connectorCount: connectors.data?.length ?? 0,
        rolloutEnabled: settings.data?.rollout?.enabled === true,
      }),
    [
      agent.data,
      businessInfo.data,
      faqs.data,
      files.data,
      websites.data,
      skills.data,
      uiSkills.data,
      connectors.data,
      settings.data,
    ],
  );

  return { ...progress, isLoading: agent.isLoading };
}
