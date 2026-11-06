import { Alert, AlertDescription, AlertTitle } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import { IconAlertTriangle, IconKey } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useApiKeys, useCreateApiKey } from "@/backend/apiKeys/apiKeys.query.ts";
import SupportWidget from "@/components/app&services/support-widget.tsx";
import { RevealApiKeyDialog, type RevealedKey } from "@/components/ExternalApi/ApiKeyDialogs.tsx";
import {
  isWidgetOnlyKey,
  maskedKeyPrefix,
  WIDGET_KEY_FEATURES,
  WIDGET_KEY_NAME,
} from "@/components/ExternalApi/apiKeyFormat.ts";
import TerminalBlock from "@/components/TerminalBlock.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";

import { INTEGRATIONS_CONFIG } from "./integrations.config.ts";
import { IntegrationShell } from "./IntegrationShell.tsx";

/** Shown in the snippet and in the live demo below it, so the two agree. */
const EXAMPLE_ICEBREAKERS = [
  "Where's my order?",
  "I need to change my address",
  "Can someone call me back?",
];

const PROPS: readonly { name: string; type: string; required: boolean }[] = [
  { name: "token", type: "string", required: true },
  { name: "whatsappNumber", type: "string", required: false },
  { name: "companyName", type: "string", required: false },
  { name: "backendUrl", type: "string", required: false },
  { name: "webhookUrl", type: "string", required: false },
  { name: "icebreakers", type: "string[]", required: false },
];

/**
 * Step 2: the widget's key. It ships in the customer's page source, so it should be a key that
 * can only run the widget (the `widget` feature) — a full-access key there opens the whole
 * partner API to anyone who views the source. Creates a v2 key named "Webchat widget"; the
 * widget only takes v2 (`rk_`) keys, since those name their own org.
 */
function WidgetKeyStep({ onCreated }: Readonly<{ onCreated: (apiKey: string) => void }>) {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const canManage = permissions.can("api_tokens.manage");
  const keys = useApiKeys(permissions.can("api_tokens.read"));
  const create = useCreateApiKey();
  const [revealed, setRevealed] = useState<RevealedKey | null>(null);
  const widgetKeys = (keys.data ?? []).filter(isWidgetOnlyKey);

  function createWidgetKey() {
    create.mutate(
      { name: WIDGET_KEY_NAME, features: WIDGET_KEY_FEATURES, version: "v2" },
      {
        onSuccess: (issued) => {
          setRevealed(issued);
          onCreated(issued.apiKey);
        },
      },
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="font-medium">{t("Create a widget key")}</p>
      <p className="text-sm text-muted-foreground">
        {t(
          "The key sits in your page's source, where anyone can copy it. Use a key that can only run the widget, never a full-access key.",
        )}
      </p>
      {widgetKeys.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("Your widget keys: {keys}", {
            keys: widgetKeys
              .map((key) => `${key.name} (${maskedKeyPrefix(key.displayPrefix)})`)
              .join(", "),
          })}
        </p>
      )}
      {canManage ? (
        <div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={create.isPending}
            onClick={createWidgetKey}
          >
            <IconKey data-icon="inline-start" />
            {t("Create widget key")}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("Ask an admin with the API keys permission to create one.")}
        </p>
      )}
      <Alert>
        <IconAlertTriangle />
        <AlertTitle>{t("Already using a key with more access?")}</AlertTitle>
        <AlertDescription>
          {t(
            "It keeps working, but anyone can copy it from your page and call your API with it. Put a widget key in the snippet, then revoke the old key or limit it on Settings › Integrations › API Service.",
          )}
        </AlertDescription>
      </Alert>
      <RevealApiKeyDialog revealed={revealed} onClose={() => setRevealed(null)} />
    </div>
  );
}

export default function WidgetIntegration() {
  const { t } = useTranslation();
  const config = INTEGRATIONS_CONFIG.widget;
  /* The key created on this page, shown in the snippet so it can be pasted as is. */
  const [widgetKey, setWidgetKey] = useState<string | null>(null);

  const codeExample = `
import SupportWidget from "@rateup/support-widget";

<SupportWidget
  token="${widgetKey ?? "YOUR_WIDGET_KEY"}"
  whatsappNumber="+1234567890" // optional
  companyName="Your Company" // optional
  backendUrl="https://your-backend.com" // optional
  webhookUrl="https://your-webhook.com" // optional
  icebreakers={${JSON.stringify(EXAMPLE_ICEBREAKERS)}} // optional
/>`;
  const npmCommand = "npm install @rateup/support-widget";

  return (
    <IntegrationShell icon={config.icon} name={config.name} own>
      <Alert>
        <AlertTitle>{t("Is your store on Shopify?")}</AlertTitle>
        <AlertDescription>
          {t("You don't need this package. Add a WhatsApp button to your store without code.")}{" "}
          <Link
            to="/dashboard/settings/integrations/$id"
            params={{ id: "shopify" }}
            className="font-medium underline"
          >
            {t("Open the Shopify integration")}
          </Link>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{t("Install")}</CardTitle>
          <CardDescription>
            {t("Three steps, in order — the snippet needs the key from step 2.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Numbered because installing genuinely is a sequence: the snippet in step 3 cannot
              be pasted until step 2 has produced the widget key, which also names the org. */}
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
              <WidgetKeyStep onCreated={setWidgetKey} />
            </li>
            <li className="grid grid-cols-[1.5rem_1fr] gap-x-3">
              <span className="font-mono text-sm text-muted-foreground tabular-nums">3</span>
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
            token={import.meta.env.VITE_SUPPORT_WIDGET_KEY}
            icebreakers={EXAMPLE_ICEBREAKERS}
          />
        </CardContent>
      </Card>
    </IntegrationShell>
  );
}
