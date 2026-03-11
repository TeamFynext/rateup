"use client";

import { useRouter } from "next/navigation";

import { IconBrandInstagram, IconBrandWhatsapp } from "@tabler/icons-react";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";

import {
  ChannelOverviewCard,
  getIgStatus,
  getWaStatus,
} from "./components/channel-overview-card";

export default function ChannelsPage() {
  const router = useRouter();
  const { data: waSettings, isLoading } = useWaSettings();

  const waConnected = !isLoading && Boolean(waSettings?.length);
  const igConnected =
    waSettings?.some((setting) => setting.ibaId?.length > 0) ?? false;
  const igConnectedCount =
    waSettings?.filter((setting) => setting.ibaId?.length > 0).length ?? 0;

  const waStatus = getWaStatus(isLoading, waConnected);
  const igStatus = getIgStatus(isLoading, igConnected, waConnected);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-2xl">Channels</h2>
        <p className="text-sm text-muted-foreground">
          Manage your communication channels and integrations
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ChannelOverviewCard
          icon={<IconBrandWhatsapp className="h-8 w-8" />}
          title="WhatsApp Business"
          description="Connect your WhatsApp inbox to handle conversations and campaigns."
          status={waStatus}
          isLoading={isLoading}
          actionLabel={waConnected ? "Configure" : "Connect"}
          actionVariant={waConnected ? "outline" : "default"}
          onAction={() => router.push("/dashboard/settings/channels/whatsapp")}
          summary={
            waConnected ? (
              <div className="flex items-center justify-between">
                <span>Accounts</span>
                <span className="text-foreground">
                  {waSettings.length} connected
                </span>
              </div>
            ) : null
          }
        />

        <ChannelOverviewCard
          icon={<IconBrandInstagram className="h-8 w-8" />}
          title="Instagram Messaging"
          description="Integrate Instagram DMs to manage customer interactions and automate replies."
          status={igStatus}
          isLoading={isLoading}
          actionLabel={igConnected ? "Configure" : "Connect"}
          actionVariant={igConnected ? "outline" : "default"}
          actionDisabled={!waConnected && !isLoading}
          onAction={() => router.push("/dashboard/settings/channels/instagram")}
          helperText={
            !waConnected && !isLoading
              ? "Connect WhatsApp first to enable Instagram"
              : undefined
          }
          summary={
            igConnectedCount > 0 ? (
              <div className="flex items-center justify-between">
                <span>Accounts</span>
                <span className="text-foreground">
                  {igConnectedCount} connected
                </span>
              </div>
            ) : null
          }
        />
      </div>
    </div>
  );
}
