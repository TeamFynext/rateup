import { Button } from "@rateup/ui/components/button";
import { Card, CardContent } from "@rateup/ui/components/card";
import { FieldTitle } from "@rateup/ui/components/field";
import { Input } from "@rateup/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rateup/ui/components/tabs";
import { IconCopy } from "@tabler/icons-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { useChannels } from "@/backend/channels/channels.query";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import ShareQR from "@/components/Survey/ShareSurvey/ShareQR/index.tsx";
import type { RuleGroup } from "@/types/rule.ts";

import { PLATFORMS, toMessagePlatform } from "./schema.ts";

interface RuleShareProps {
  groups: RuleGroup[];
  channels: string[];
  /** Every platform the rule runs on; each gets its own link. */
  platforms: string[];
  /** The platform shown; shared with the device preview's switch. */
  platform?: string;
  onPlatformChange?: (platform: string) => void;
}

const platformLabel = (platform: string) =>
  PLATFORMS.find((option) => option.value === platform)?.label ?? platform;

const RuleShare: React.FC<RuleShareProps> = ({
  groups,
  channels,
  platforms,
  platform: picked,
  onPlatformChange,
}) => {
  const [shareKeyword, setShareKeyword] = useState<string>("");
  const shown = platforms.length > 0 ? platforms : ["WHATSAPP"];
  const active = picked && shown.includes(picked) ? picked : shown[0];

  const keywordOptions = (groups || [])
    .flatMap((g) => g.conditions)
    .filter((c) => c.field === "MESSAGE_BODY" && c.value)
    .map((c) => c.value);

  const validKeyword =
    shareKeyword && keywordOptions.includes(shareKeyword) ? shareKeyword : keywordOptions[0] || "";

  const keywordSelect = (
    <div className="flex items-center gap-2">
      <FieldTitle>Keyword</FieldTitle>
      <Select
        value={validKeyword}
        onValueChange={(value) => setShareKeyword(value ?? "")}
        items={keywordOptions.map((k) => ({ value: k, label: k }))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select keyword" />
        </SelectTrigger>
        <SelectContent>
          {keywordOptions.map((k, i) => (
            <SelectItem key={i} value={k}>
              {k}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Card>
      <CardContent className="pt-6">
        {shown.length > 1 ? (
          <Tabs
            value={active}
            onValueChange={(value) => onPlatformChange?.(String(value))}
            className="gap-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                {shown.map((platform) => (
                  <TabsTrigger key={platform} value={platform}>
                    {platformLabel(platform)}
                  </TabsTrigger>
                ))}
              </TabsList>
              {keywordSelect}
            </div>
            {shown.map((platform) => (
              <TabsContent key={platform} value={platform}>
                <PlatformShare platform={platform} channels={channels} keyword={validKeyword} />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="space-y-4">
            {keywordSelect}
            <PlatformShare platform={shown[0]} channels={channels} keyword={validKeyword} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/** One platform's account picker, link and QR code for the chosen keyword. */
function PlatformShare({
  platform,
  channels,
  keyword,
}: Readonly<{ platform: string; channels: string[]; keyword: string }>) {
  const [shareAccountId, setShareAccountId] = useState<string>("");
  const { data: connected = [] } = useChannels();

  // A multi-channel rule lists every platform's accounts together; keep this platform's.
  const platformChannels = channels.filter((id) =>
    connected.some((channel) => channel.platform === platform && channel.accountId === id),
  );

  const validAccountId =
    shareAccountId && platformChannels.includes(shareAccountId)
      ? shareAccountId
      : platformChannels[0] || "";

  const shareUrl = (() => {
    if (!keyword) return "";
    const text = encodeURIComponent(keyword);
    // WhatsApp automations name the number by phone id, which is its channel's account id.
    const channel = connected.find(
      (candidate) => candidate.platform === platform && candidate.accountId === validAccountId,
    );
    if (!channel) return "";
    if (platform === "WHATSAPP") {
      return channel.address
        ? `https://wa.me/${channel.address.replaceAll(/\D/g, "")}?text=${text}`
        : "";
    }
    // ig.me and m.me only open the chat: neither pre-fills a message, so the customer types it.
    if (platform === "INSTAGRAM") {
      return channel.username ? `https://ig.me/m/${channel.username}` : "";
    }
    if (platform === "FACEBOOK") return `https://m.me/${channel.accountId}`;
    return "";
  })();
  const prefills = platform === "WHATSAPP";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <FieldTitle>Account</FieldTitle>
          <AccountSelector
            value={validAccountId}
            onChange={(value) => setShareAccountId(value ?? "")}
            filterIds={platformChannels.length > 0 ? platformChannels : undefined}
            platform={toMessagePlatform(platform)}
          />
        </div>
        {shareUrl && (
          <div className="min-w-64 flex-1 space-y-1.5">
            <FieldTitle>Share Link</FieldTitle>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly />
              <Button
                aria-label="Copy"
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Link copied to clipboard");
                }}
              >
                <IconCopy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {shareUrl && !prefills && (
        <p className="text-sm text-amber-700 dark:text-amber-500">
          {platformLabel(platform)} can't pre-fill a message. The link opens the chat, and the
          customer needs to send <span className="font-semibold">{keyword}</span> to start this
          automation, so put the keyword next to the link or QR code.
        </p>
      )}

      {shareUrl && (
        <ShareQR
          url={shareUrl}
          title={`Share ${platformLabel(platform)} Link`}
          isPublished={true}
          flat
        />
      )}
    </div>
  );
}

export default RuleShare;
