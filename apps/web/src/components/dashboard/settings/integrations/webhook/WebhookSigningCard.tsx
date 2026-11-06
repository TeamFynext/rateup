import { IconChevronDown, IconExternalLink, IconEye, IconRefresh } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useRotateWebhookSecretMutation, useWebhookSecret } from "@/backend/webhook/webhook.query";
import { ApiCopyButton } from "@/components/ExternalApi/ApiCopyButton.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";

const DOCS_URL = "https://docs.rateup.app/settings/integrations#verify-the-signature";

// Headers every delivery carries, in the order a receiver meets them. Descriptions are
// translation keys.
const HEADERS = [
  {
    name: "X-Rateup-Signature-256",
    description: "t=<timestamp>,v1=<signature>. The one to verify.",
  },
  { name: "X-Rateup-Timestamp", description: "When this attempt was sent, in Unix seconds." },
  {
    name: "X-Webhook-Id",
    description: "The same on every retry of one event, so you can drop repeats.",
  },
  { name: "X-Rateup-Triggered-At", description: "The send time as an ISO date." },
  {
    name: "X-Rateup-Signature",
    description: "Deprecated: signs the body only. Kept for older receivers.",
  },
] as const;

const NODE_SNIPPET = `import crypto from "node:crypto";
import express from "express";

const app = express();
const SECRET = process.env.RATEUP_WEBHOOK_SECRET; // whsec_…, used exactly as shown

// The raw bytes: a parsed-and-restringified body will not match the signature.
app.post("/webhooks/rateup", express.raw({ type: "application/json" }), (req, res) => {
  const header = req.get("X-Rateup-Signature-256") ?? "";
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2)));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return res.sendStatus(400);

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(\`\${t}.\`)
    .update(req.body)
    .digest("hex");
  const given = Buffer.from(parts.v1 ?? "", "hex");
  const valid =
    given.length === 32 && crypto.timingSafeEqual(given, Buffer.from(expected, "hex"));
  if (!valid) return res.sendStatus(400);

  const event = JSON.parse(req.body.toString("utf8"));
  // …handle it, skipping any X-Webhook-Id you have already processed
  res.sendStatus(200);
});`;

const PYTHON_SNIPPET = `import hashlib, hmac, json, os, time
from flask import Flask, request, abort

app = Flask(__name__)
SECRET = os.environ["RATEUP_WEBHOOK_SECRET"].encode()  # whsec_…, used exactly as shown

@app.post("/webhooks/rateup")
def rateup_webhook():
    raw = request.get_data()  # the raw bytes, before any JSON parsing
    parts = dict(p.split("=", 1) for p in request.headers.get("X-Rateup-Signature-256", "").split(",") if "=" in p)
    t = int(parts.get("t", "0"))
    if not t or abs(time.time() - t) > 300:
        abort(400)

    expected = hmac.new(SECRET, f"{t}.".encode() + raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, parts.get("v1", "")):
        abort(400)

    event = json.loads(raw)
    # …handle it, skipping any X-Webhook-Id you have already processed
    return "", 200`;

function CodeBlock({ code }: Readonly<{ code: string }>) {
  return (
    <div className="relative">
      <div className="absolute top-1.5 right-1.5">
        <ApiCopyButton value={code} />
      </div>
      <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 pr-12 font-mono text-xs leading-relaxed text-foreground">
        {code}
      </pre>
    </div>
  );
}

/**
 * The secret every delivery is signed with, and how to check a signature. The secret is fetched
 * only when someone asks to see it, and only for those who may change the webhook.
 */
export function WebhookSigningCard({ canManage }: Readonly<{ canManage: boolean }>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [revealed, setRevealed] = useState(false);
  const secret = useWebhookSecret(revealed && canManage);
  const rotate = useRotateWebhookSecretMutation();

  const onRotate = async () => {
    const ok = await confirm({
      title: t("Replace the signing secret?"),
      description: t(
        "Deliveries are signed with the new secret straight away. Your endpoint will reject them until it is updated.",
      ),
      confirmText: t("Replace secret"),
    });
    if (ok) rotate.mutate(undefined, { onSuccess: () => setRevealed(true) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Signing secret")}</CardTitle>
        <CardDescription>
          {t(
            "Every delivery is signed with this secret, so your server can prove a request came from RateUp and was not replayed.",
          )}
        </CardDescription>
        {canManage && (
          <CardAction>
            <Button variant="ghost" size="sm" onClick={onRotate} loading={rotate.isPending}>
              <IconRefresh data-icon="inline-start" />
              {t("Replace secret")}
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {canManage ? (
          <div className="flex max-w-xl items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 font-mono text-sm">
              {revealed && secret.data ? secret.data.secret : "whsec_••••••••••••••••••••••••"}
            </code>
            {revealed && secret.data ? (
              <ApiCopyButton value={secret.data.secret} />
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevealed(true)}
                loading={revealed && secret.isFetching}
              >
                <IconEye data-icon="inline-start" />
                {t("Show")}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("Only people who can manage webhooks can see the secret.")}
          </p>
        )}

        <Collapsible className="rounded-lg border border-border">
          <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium">
            {t("Verify a delivery")}
            <IconChevronDown className="size-4 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-4 border-t border-border p-3">
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-muted-foreground">
              <li>{t("Read the raw request body, before any JSON parsing.")}</li>
              <li>
                {t(
                  "Compute HMAC-SHA256 of the timestamp, a dot and the raw body, keyed with the whole secret, as hex.",
                )}
              </li>
              <li>{t("Compare it with v1 in constant time.")}</li>
              <li>{t("Reject a timestamp more than 5 minutes from now.")}</li>
            </ol>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Header")}</TableHead>
                  <TableHead>{t("What it holds")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {HEADERS.map((header) => (
                  <TableRow key={header.name}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {header.name}
                    </TableCell>
                    <TableCell className="text-sm whitespace-normal text-muted-foreground">
                      {t(header.description)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Tabs defaultValue="node">
              <TabsList>
                <TabsTrigger value="node">Node.js</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
              </TabsList>
              <TabsContent value="node">
                <CodeBlock code={NODE_SNIPPET} />
              </TabsContent>
              <TabsContent value="python">
                <CodeBlock code={PYTHON_SNIPPET} />
              </TabsContent>
            </Tabs>

            <a
              href={DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 self-start text-sm text-primary hover:underline"
            >
              {t("Full guide, with a test vector")}
              <IconExternalLink className="size-3.5" />
            </a>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
