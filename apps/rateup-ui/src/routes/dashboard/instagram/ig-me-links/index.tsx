import { IconCheck, IconCopy, IconExternalLink, IconQrcode } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { InstagramFeatureShell } from "@/components/dashboard/instagram/instagram-feature-shell.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";

export const Route = createFileRoute("/dashboard/instagram/ig-me-links/")({
  component: InstagramIgMeLinksPage,
});

function InstagramIgMeLinksPage() {
  return (
    <InstagramFeatureShell
      title="ig.me Links"
      description="Generate shareable Instagram short links that open a conversation thread and optionally pass a referral parameter."
      secondaryAction={
        <Button asChild variant="outline">
          <Link to="/dashboard/instagram">Back to hub</Link>
        </Button>
      }
    >
      {(waSetting) => (
        <IgMeLinkBuilder
          waSettingId={waSetting.id}
          fbPageId={waSetting.fbPageId}
          pageAccessToken={waSetting.pageAccessToken}
          username={waSetting.igUserName}
          displayName={waSetting.igDisplayName}
        />
      )}
    </InstagramFeatureShell>
  );
}

function IgMeLinkBuilder({
  waSettingId,
  fbPageId,
  pageAccessToken,
  username,
  displayName,
}: Readonly<{
  waSettingId: string;
  fbPageId?: string | null;
  pageAccessToken?: string | null;
  username?: string | null;
  displayName?: string | null;
}>) {
  const [refParam, setRefParam] = useState("campaign_2026");
  const [copied, setCopied] = useState(false);

  const link = useMemo(() => {
    const handle = (username || "").replace(/^@/, "").trim();
    if (!handle) return "";

    const base = `https://ig.me/m/${handle}`;
    return refParam.trim() ? `${base}?ref=${encodeURIComponent(refParam.trim())}` : base;
  }, [refParam, username]);

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="border-b">
        <CardTitle className="text-base">Shareable link</CardTitle>
        <CardDescription>
          Use this to send people directly into the selected Instagram account’s DM thread.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input value={displayName || username || ""} readOnly placeholder="Instagram account" />
          <Input
            value={refParam}
            onChange={(event) => setRefParam(event.target.value)}
            placeholder="Referral param"
          />
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Generated link
          </p>
          <p className="break-all text-sm font-medium">
            {link || "Connect an Instagram account to generate a link"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={copy} disabled={!link}>
            {copied ? (
              <IconCheck className="mr-2 h-4 w-4" />
            ) : (
              <IconCopy className="mr-2 h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button asChild variant="outline" disabled={!link}>
            <a href={link} target="_blank" rel="noreferrer">
              <IconExternalLink className="mr-2 h-4 w-4" />
              Open link
            </a>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/dashboard/instagram/persistent-menu">
              <IconQrcode className="mr-2 h-4 w-4" />
              Use in menu
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
