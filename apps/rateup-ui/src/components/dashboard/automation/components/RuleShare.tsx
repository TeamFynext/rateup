import { IconCopy } from "@tabler/icons-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { useChannels } from "@/backend/channels/channels.query";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import ShareQR from "@/components/Survey/ShareSurvey/ShareQR/index.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { FieldTitle } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import type { RuleGroup } from "@/types/rule.ts";

import { toMessagePlatform } from "./schema.ts";

interface RuleShareProps {
  groups: RuleGroup[];
  channels: string[];
  platform?: string;
}

const RuleShare: React.FC<RuleShareProps> = ({ groups, channels, platform = "WHATSAPP" }) => {
  const [shareAccountId, setShareAccountId] = useState<string>("");
  const [shareKeyword, setShareKeyword] = useState<string>("");
  const { data: connected = [] } = useChannels();

  const keywordOptions = (groups || [])
    .flatMap((g) => g.conditions)
    .filter((c) => c.field === "MESSAGE_BODY" && c.value)
    .map((c) => c.value);

  const validKeyword =
    shareKeyword && keywordOptions.includes(shareKeyword) ? shareKeyword : keywordOptions[0] || "";

  const validAccountId =
    shareAccountId && channels?.includes(shareAccountId) ? shareAccountId : channels?.[0] || "";

  const shareUrl = (() => {
    if (!validKeyword) return "";
    const text = encodeURIComponent(validKeyword);
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
    if (platform === "INSTAGRAM") {
      return channel.username ? `https://ig.me/m/${channel.username}?text=${text}` : "";
    }
    if (platform === "FACEBOOK") return `https://m.me/${channel.accountId}?text=${text}`;
    return "";
  })();

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div className="flex gap-4">
          <div className="space-y-1">
            <FieldTitle>Select Account</FieldTitle>
            <div className="max-w-md">
              <AccountSelector
                value={validAccountId}
                onChange={(value) => setShareAccountId(value ?? "")}
                filterIds={channels.length > 0 ? channels : undefined}
                platform={toMessagePlatform(platform)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <FieldTitle>Select Keyword</FieldTitle>
            <div className="max-w-md">
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
          </div>
        </div>

        {shareUrl && (
          <div className="mt-6 border-t pt-6 space-y-6">
            <div className="space-y-2">
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
            <ShareQR
              url={shareUrl}
              title={
                platform === "INSTAGRAM"
                  ? "Share Instagram Link"
                  : platform === "FACEBOOK"
                    ? "Share Facebook Link"
                    : "Share WhatsApp Link"
              }
              isPublished={true}
              flat
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RuleShare;
