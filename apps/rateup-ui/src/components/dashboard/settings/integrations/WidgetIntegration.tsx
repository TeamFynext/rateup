import { useTranslation } from "react-i18next";

import SupportWidget from "@/components/app&services/support-widget.tsx";
import TerminalBlock from "@/components/TerminalBlock.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";

import { INTEGRATIONS_CONFIG } from "./integrations.config.ts";
import { IntegrationShell } from "./IntegrationShell.tsx";

/** Shown in the snippet and in the live demo below it, so the two agree. */
const EXAMPLE_ICEBREAKERS = [
  "Where's my order?",
  "I need to change my address",
  "Can someone call me back?",
];

const PROPS: readonly { name: string; type: string; required: boolean }[] = [
  { name: "orgId", type: "string", required: true },
  { name: "token", type: "string", required: true },
  { name: "whatsappNumber", type: "string", required: false },
  { name: "companyName", type: "string", required: false },
  { name: "backendUrl", type: "string", required: false },
  { name: "webhookUrl", type: "string", required: false },
  { name: "icebreakers", type: "string[]", required: false },
];

export default function WidgetIntegration() {
  const { t } = useTranslation();
  const config = INTEGRATIONS_CONFIG.widget;

  const codeExample = `
import SupportWidget from "@rateup/support-widget";

<SupportWidget
  orgId="YOUR_ORG_ID"
  token="YOUR_API_TOKEN"
  whatsappNumber="+1234567890" // optional
  companyName="Your Company" // optional
  backendUrl="https://your-backend.com" // optional
  webhookUrl="https://your-webhook.com" // optional
  icebreakers={${JSON.stringify(EXAMPLE_ICEBREAKERS)}} // optional
/>`;
  const npmCommand = "npm install @rateup/support-widget";

  return (
    <IntegrationShell icon={config.icon} name={config.name} own>
      <Card>
        <CardHeader>
          <CardTitle>{t("Install")}</CardTitle>
          <CardDescription>
            {t("Four steps, in order — the snippet needs the two values from the middle two.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Numbered because installing genuinely is a sequence: the snippet in step 4 cannot
              be pasted until steps 2 and 3 have produced the orgId and the token. */}
          <ol className="flex flex-col gap-6">
            <li className="grid grid-cols-[1.5rem_1fr] gap-x-3">
              <span className="font-mono text-sm text-muted-foreground tabular-nums">1</span>
              <div className="flex min-w-0 flex-col gap-2">
                <p className="font-medium">{t("Install the package")}</p>
                <TerminalBlock code={npmCommand} />
              </div>
            </li>
            <li className="grid grid-cols-[1.5rem_1fr] gap-x-3">
              <span className="font-mono text-sm text-muted-foreground tabular-nums">2</span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-medium">
                  {t("Copy your")} <code className="font-mono">orgId</code>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("It is on Settings › Integrations › Zapier.")}
                </p>
              </div>
            </li>
            <li className="grid grid-cols-[1.5rem_1fr] gap-x-3">
              <span className="font-mono text-sm text-muted-foreground tabular-nums">3</span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-medium">{t("Create an API token")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("Generate one on Settings › Integrations › API Service.")}
                </p>
              </div>
            </li>
            <li className="grid grid-cols-[1.5rem_1fr] gap-x-3">
              <span className="font-mono text-sm text-muted-foreground tabular-nums">4</span>
              <div className="flex min-w-0 flex-col gap-2">
                <p className="font-medium">{t("Render the widget")}</p>
                <TerminalBlock code={codeExample} />
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Props")}</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium">{t("Prop")}</th>
                <th className="pb-2 font-medium">{t("Type")}</th>
                <th className="pb-2 font-medium">{t("Required")}</th>
              </tr>
            </thead>
            <tbody>
              {PROPS.map((prop) => (
                <tr key={prop.name} className="border-b border-border last:border-0">
                  <td className="py-2 font-mono">{prop.name}</td>
                  <td className="py-2 text-muted-foreground">{prop.type}</td>
                  <td className="py-2 text-muted-foreground">
                    {prop.required ? t("Yes") : t("No")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Preview")}</CardTitle>
          <CardDescription>
            {t("The widget as your customers see it, running against this account.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <SupportWidget
            orgId={import.meta.env.VITE_ROOT_ORG}
            token={import.meta.env.VITE_ROOT_TOKEN}
            icebreakers={EXAMPLE_ICEBREAKERS}
          />
        </CardContent>
      </Card>
    </IntegrationShell>
  );
}
