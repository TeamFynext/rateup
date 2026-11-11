import { useWaFlowsFromDb } from "@/api/whatsapp/flow/flow.query";
import { useWaTemplates } from "@/api/whatsapp/template/whatsapp.query";

/**
 * The templates this team may send. A template with a Flow button is only listed when
 * that flow belongs to the team, so it needs the flows list; every other template is
 * listed regardless. While flows are loading, or if they fail to load, the flow
 * templates are left out rather than hiding the whole list.
 */
export default function useTemplatesAvailableForTeam(teamId: string) {
  const { data: templates } = useWaTemplates();
  const { data: flows } = useWaFlowsFromDb();
  if (!teamId || !templates) return [];

  return templates.filter((template) => {
    const flowButton = template.data?.components
      ?.find((c) => c.type === "BUTTONS")
      ?.buttons?.find((b: any) => b.type === "FLOW");
    if (!flowButton) return true;
    const flow = flows?.find((f) => f.flowId == flowButton["flow_id"]);
    return Boolean(flow?.survey?.teams?.some((t: any) => t.teamId === teamId));
  });
}
