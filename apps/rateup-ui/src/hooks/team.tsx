import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";

/**
 * Returns the templates that are available for the given team.
 *
 * Although templates are linked to org, some templates might have a flow that is only available for a specific team.
 * @param teamId
 */
export default function useTemplatesAvailableForTeam(teamId: string) {
  const { data: templates } = useWaTemplates();
  const { data: flows } = useWaFlowsFromDb();
  if (!teamId || !templates || !flows) return [];

  return templates.filter((template) => {
    const flowButton = template.data.components
      .find((c) => c.type === "BUTTONS")
      ?.buttons.find((b: { type?: string }) => b.type === "FLOW");
    if (flowButton) {
      const flow = flows?.find((f) => f.flowId == flowButton["flow_id"]);
      if (!flow) {
        return false;
      } else {
        return flow.survey?.teams?.some((t) => t.teamId === teamId) ?? false;
      }
    } else {
      return true;
    }
  });
}
