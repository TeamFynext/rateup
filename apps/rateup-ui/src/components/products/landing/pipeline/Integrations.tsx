import { GetLeadLogo, ZapierLogo, ZohoLogo } from "@/components/integrations/logos";

import IntegrationBand from "../shared/IntegrationBand";

const METAMARK = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    className="size-5.5 text-ru-blue-600"
    aria-hidden="true"
  >
    <path d="M3 15.5c0-4 2-8 4.5-8 3.5 0 5.5 9 9 9 2 0 3.5-2 3.5-4.5S18.5 7.5 16.5 7.5c-3.5 0-5.5 9-9 9C5 16.5 3 16 3 15.5Z" />
  </svg>
);

export default function Integrations() {
  return (
    <IntegrationBand
      title="Keeps your CRM and your ads in the loop."
      lead="Stages sync out to the tools your sales team already uses, and won leads tell Meta which ads worked."
      points={[
        {
          name: "Zoho Bigin & Zoho CRM",
          body: "Map your board's stages to Bigin's and each move updates the deal there. Zoho CRM keeps contacts in sync.",
          mark: <ZohoLogo className="size-7" />,
        },
        {
          name: "GetLead",
          body: "Lead status syncs both ways between GetLead and your Leads board.",
          mark: <GetLeadLogo className="size-7" />,
        },
        {
          name: "Zapier",
          body: "A Contact Stage Updated trigger starts a Zap whenever a lead changes stage.",
          mark: <ZapierLogo className="size-7" />,
        },
        {
          name: "Meta Conversions API",
          body: "A won lead sends a conversion event to Meta, so click-to-WhatsApp ads learn which chats became customers.",
          mark: METAMARK,
        },
      ]}
    />
  );
}
