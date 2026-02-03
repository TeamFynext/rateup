import React, { useState } from "react";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { RuleGroup } from "@/types/rule";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { AccountSelector } from "@/components/input/AccountSelector";
import ShareQR from "@/components/Survey/ShareSurvey/ShareQR";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RuleShareProps {
  groups: RuleGroup[];
  channels: string[];
}

const RuleShare: React.FC<RuleShareProps> = ({ groups, channels }) => {
  const [shareAccountId, setShareAccountId] = useState<string>("");
  const [shareKeyword, setShareKeyword] = useState<string>("");
  const { data: waSettings } = useWaSettings();

  const keywordOptions = (groups || [])
    .flatMap((g) => g.conditions)
    .filter((c: any) => c.field === "MESSAGE_BODY" && c.value)
    .map((c: any) => c.value);

  const validKeyword =
    shareKeyword && keywordOptions.includes(shareKeyword)
      ? shareKeyword
      : keywordOptions[0] || "";

  const validAccountId =
    shareAccountId && channels?.includes(shareAccountId)
      ? shareAccountId
      : channels?.[0] || "";

  const selectedAccount = waSettings?.find((s) => s.phoneId === validAccountId);
  const shareUrl =
    selectedAccount && validKeyword
      ? `https://wa.me/${selectedAccount.phone.replaceAll(/\D/g, "")}?text=${encodeURIComponent(
          validKeyword,
        )}`
      : "";

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div className="flex gap-4">
          <div className="space-y-1">
            <Label>Select Account</Label>
            <div className="max-w-md">
              <AccountSelector
                value={validAccountId}
                onChange={setShareAccountId}
                filterIds={channels.length > 0 ? channels : undefined}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Keyword</Label>
            <div className="max-w-md">
              <Select value={validKeyword} onValueChange={setShareKeyword}>
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
              <Label>Share Link</Label>
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
              title="Share WhatsApp Link"
              isPublished={true}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RuleShare;
