"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import Script from "next/script";

import { IconArrowLeft } from "@tabler/icons-react";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button";

import { InstagramSettingsDetail } from "../components/instagram-settings-detail";
import { WhatsAppSettingsDetail } from "../components/whatsapp-settings-detail";

export default function ChannelDetailsPage() {
  const params = useParams<{ channel: string }>();
  const channel = params?.channel;
  const { data: waSettings, isLoading } = useWaSettings();

  const isWhatsapp = channel === "whatsapp";
  const isInstagram = channel === "instagram";

  if (!isWhatsapp && !isInstagram) {
    return (
      <div className="space-y-4 rounded-xl border bg-background p-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-semibold">Channel not found</h3>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/settings/channels">
              <IconArrowLeft className="mr-2 h-4 w-4" />
              Back to channels
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Script
        async
        defer
        src="https://connect.facebook.net/en_US/sdk.js"
        crossOrigin="anonymous"
      />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Channel Details</h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/settings/channels">
            <IconArrowLeft className="mr-2 h-4 w-4" />
            Back to channels
          </Link>
        </Button>
      </div>

      {isWhatsapp ? (
        <WhatsAppSettingsDetail waSettings={waSettings} isLoading={isLoading} />
      ) : (
        <InstagramSettingsDetail
          waSettings={waSettings}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
