import { useWaFlowsFromDb } from "@/src/api/whatsapp/flow/flow.query";
import { useWaTemplates } from "@/src/api/whatsapp/template/whatsapp.query";

export default function useTemplatesAvailableForTeam(teamId: string) {
  const { data: templates } = useWaTemplates();
  const { data: flows } = useWaFlowsFromDb();
  if (!teamId || !templates || !flows) return [];

  return templates.filter((template) => {
    const flowButton = template.data.components
      .find((c) => c.type === "BUTTONS")
      ?.buttons.find((b:any) => b.type === "FLOW");
    if (flowButton) {
      const flow = flows?.find((f) => f.flowId == flowButton["flow_id"]);
      if (!flow) {
        return false;
      } else {
        return flow.survey.teams.some((t:any) => t.teamId === teamId);
      }
    } else {
      return true;
    }
  });
}
