import { useMemo } from "react";

import { useContactGroup } from "@/backend/campaign/contactGroup/contactGroup.query";
import { useContactLabels } from "@/backend/campaign/contacts/contacts.query";
import { useChannels } from "@/backend/channels/channels.query";
import { useChatbots } from "@/backend/chatbots/chatbots.query";
import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { usePipelineQuery, usePipelinesQuery } from "@/backend/pipeline/pipeline.query.tsx";
import { useAllSurveysSummary } from "@/backend/surveys/surveys.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import type { NameKind, NameLookup } from "@/components/dashboard/automation/rule-sentence.ts";
import { buildRuleSentence } from "@/components/dashboard/automation/rule-sentence.ts";
import { findLeadsPipeline } from "@/components/pipeline/pipelineTypes.ts";

import type { CreateRuleInput } from "../schema.ts";

type Named = { id: string; name: string };

const byId = (items: readonly Named[]) => new Map(items.map((item) => [item.id, item.name]));

/**
 * The rule as a sentence, with ids resolved to names. These are the queries the action editors
 * already run, so on the wizard they come from the cache.
 */
export function useRuleSentence(rule: CreateRuleInput) {
  const { data: channels } = useChannels();
  const { data: teams } = useTeamsByUser();
  const { data: members } = useTeamsMembersOfOrg();
  const { data: labels } = useContactLabels();
  const { data: groups } = useContactGroup();
  const { data: templates } = useWaTemplates();
  const { data: flows } = useWaFlowsFromDb();
  const { data: surveys } = useAllSurveysSummary();
  const { data: chatbots } = useChatbots();
  const { data: pipelines = [] } = usePipelinesQuery();
  const { data: board } = usePipelineQuery(findLeadsPipeline(pipelines)?.id);

  const lookup = useMemo<NameLookup>(() => {
    const tables: Record<NameKind, Map<string, string>> = {
      account: new Map(
        (channels ?? []).map((channel) => [
          channel.accountId,
          channel.platform === "WHATSAPP"
            ? (channel.address ?? channel.name ?? channel.accountId)
            : `@${channel.username ?? channel.name ?? channel.accountId}`,
        ]),
      ),
      team: byId(teams?.data ?? []),
      user: byId(members?.data ?? []),
      label: byId(labels ?? []),
      group: byId(groups ?? []),
      stage: byId(board?.stages ?? []),
      template: new Map(
        (templates ?? []).map((template) => [String(template.id), template.data?.name ?? ""]),
      ),
      flow: new Map((flows ?? []).map((flow) => [flow.dbFlowId, flow.name])),
      survey: new Map(
        (surveys?.surveys ?? []).flatMap((survey) =>
          (survey.teams ?? []).map((team) => [team.mapId, survey.title] as const),
        ),
      ),
      chatbot: byId(chatbots?.data ?? []),
    };
    return (kind, id) => tables[kind].get(id) || undefined;
  }, [channels, teams, members, labels, groups, board, templates, flows, surveys, chatbots]);

  const parts = useMemo(() => buildRuleSentence(rule, lookup), [rule, lookup]);
  return { parts, lookup };
}
