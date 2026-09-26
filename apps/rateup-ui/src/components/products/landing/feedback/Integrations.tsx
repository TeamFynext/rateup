import { GoogleSheetsLogo, PetpoojaLogo, ZapierLogo } from "@/components/integrations/logos";

import IntegrationBand from "../shared/IntegrationBand";

export default function Integrations() {
  return (
    <IntegrationBand
      title="Starts from the systems you sell through."
      lead="Record the purchase wherever it happens, and send the answers wherever you need them."
      points={[
        {
          name: "Shopify",
          slug: "shopify",
          body: "Paid orders earn loyalty points, which starts the feedback ask. Order events can also send a survey on their own.",
        },
        {
          name: "Petpooja & your POS",
          body: "Record purchases through the REST API from any POS; Petpooja orders can trigger a WhatsApp template.",
          mark: <PetpoojaLogo className="size-7" />,
        },
        {
          name: "Zapier",
          body: "A Response Submitted trigger sends every survey answer on to your other apps.",
          mark: <ZapierLogo className="size-7" />,
        },
        {
          name: "Google Sheets & webhooks",
          body: "Web survey responses sync to a sheet or post to your own endpoint as they arrive.",
          mark: <GoogleSheetsLogo className="size-7" />,
        },
      ]}
    />
  );
}
