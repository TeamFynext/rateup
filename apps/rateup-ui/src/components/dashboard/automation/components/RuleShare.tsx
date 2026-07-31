import { Copy } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
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

interface RuleShareProps {
  groups: RuleGroup[];
  channels: string[];
  platform?: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";
}

const RuleShare: React.FC<RuleShareProps> = ({ groups, channels, platform = "WHATSAPP" }) => {
  const [shareAccountId, setShareAccountId] = useState<string>("");
  const [shareKeyword, setShareKeyword] = useState<string>("");
  const { data: waSettings } = useWaSettings();

  const keywordOptions = (groups || [])
    .flatMap((g) => g.conditions)
    .filter((c) => c.field === "MESSAGE_BODY" && c.value)
    .map((c) => c.value);

  const validKeyword =
    shareKeyword && keywordOptions.includes(shareKeyword) ? shareKeyword : keywordOptions[0] || "";

  const validAccountId =
    shareAccountId && channels?.includes(shareAccountId) ? shareAccountId : channels?.[0] || "";

  const selectedAccount =
    platform === "WHATSAPP"
      ? waSettings?.find((s) => s.phoneId === validAccountId)
      : waSettings?.find((s) => s.ibaId === validAccountId);

  const shareUrl = (() => {
    if (!selectedAccount || !validKeyword) return "";
    if (platform === "INSTAGRAM" && selectedAccount.igUserName) {
      return `https://ig.me/m/${selectedAccount.igUserName}?text=${encodeURIComponent(validKeyword)}`;
    }
    if (platform === "FACEBOOK" && selectedAccount.fbPageId) {
      return `https://m.me/${selectedAccount.fbPageId}?text=${encodeURIComponent(validKeyword)}`;
    }
    return `https://wa.me/${selectedAccount.phone.replaceAll(/\D/g, "")}?text=${encodeURIComponent(validKeyword)}`;
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
                onChange={setShareAccountId}
                filterIds={channels.length > 0 ? channels : undefined}
                platform={platform}
              />
            </div>
          </div>

          <div className="space-y-2">
            <FieldTitle>Select Keyword</FieldTitle>
            <div className="max-w-md">
              <Select
                value={validKeyword}
                onValueChange={setShareKeyword}
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
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    toast.success("Link copied to clipboard");
                  }}
                >
                  <Copy className="h-4 w-4" />
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
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RuleShare;
