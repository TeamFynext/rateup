"use client";

import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandWhatsapp,
} from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";

import {
  ChannelOverviewCard,
  getFbStatus,
  getIgStatus,
  getWaStatus,
} from "../../../../components/dashboard/settings/channels/components/channel-overview-card.tsx";

export const Route = createFileRoute("/dashboard/settings/channels/")({
  component: ChannelsPage,
});

function ChannelsPage() {
  const navigate = useNavigate();
  const { data: waSettings, isLoading } = useWaSettings();

  const waConnected = !isLoading && Boolean(waSettings?.length);
  const igConnected =
    waSettings?.some((setting) => setting.ibaId?.length > 0) ?? false;
  const igConnectedCount =
    waSettings?.filter((setting) => setting.ibaId?.length > 0).length ?? 0;

  const fbConnected =
    waSettings?.some((s) => s.fbPageId && s.fbPageId.length > 0) ?? false;

  const fbConnectedCount =
    waSettings?.filter((s) => s.fbPageId && s.fbPageId.length > 0).length ?? 0;

  const waStatus = getWaStatus(isLoading, waConnected);
  const igStatus = getIgStatus(isLoading, igConnected, waConnected);
  const fbStatus = getFbStatus(isLoading, fbConnected, waConnected);
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
          onAction={() =>
            navigate({
              to: "/dashboard/settings/channels/whatsapp",
            })
          }
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
          icon={<IconBrandFacebook className="h-8 w-8 text-blue-600" />}
          title="Facebook Messenger"
          description="Connect your Facebook Page to manage Messenger conversations and automate replies."
          status={fbStatus}
          isLoading={isLoading}
          actionLabel={fbConnected ? "Configure" : "Connect"}
          actionVariant={fbConnected ? "outline" : "default"}
          actionDisabled={!waConnected && !isLoading}
          onAction={() =>
            navigate({
              to: "/dashboard/settings/channels/facebook",
            })
          }
          helperText={
            !waConnected && !isLoading
              ? "Connect WhatsApp first to enable Facebook"
              : undefined
          }
          summary={
            fbConnectedCount > 0 ? (
              <div className="flex items-center justify-between">
                <span>Pages</span>
                <span className="text-foreground">
                  {fbConnectedCount} connected
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
          onAction={() =>
            navigate({
              to: "/dashboard/settings/channels/instagram",
            })
          }
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
