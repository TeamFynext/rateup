import { createFileRoute } from "@tanstack/react-router";

import WhatsappFlowPage from "@/components/whatsapp/flows/FlowPage/index.tsx";

export const Route = createFileRoute("/dashboard/whatsapp/flows/v1/$dbFlowId/")(
  {
    component: FlowPage,
  },
);

function FlowPage() {
  return <WhatsappFlowPage />;
}
