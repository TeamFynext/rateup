import { createContext, use, useMemo } from "react";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { useMetaAgentChannelStore } from "@/store/metaAgent.store.ts";

interface MetaAgentContextValue {
  /** The WhatsApp channel every panel below is configuring, or "" while loading. */
  waSettingsId: string;
  setWaSettingsId: (id: string) => void;
  channels: { id: string; label: string }[];
  isLoading: boolean;
}

const MetaAgentContext = createContext<MetaAgentContextValue | null>(null);

/**
 * The chosen WhatsApp channel lives in a store rather than in each section, so
 * moving between sections keeps you on the same number and the sidebar's step
 * rail reports on it too. It is deliberately not a search param: the sidebar
 * links carry only a pathname, so a param would be dropped on every hop.
 */
export function MetaAgentProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { data: waSettings, isLoading } = useWaSettings();
  const selectedId = useMetaAgentChannelStore((state) => state.waSettingsId);
  const setSelectedId = useMetaAgentChannelStore((state) => state.setWaSettingsId);

  const value = useMemo<MetaAgentContextValue>(() => {
    const channels = (waSettings ?? []).map((settings) => ({
      id: settings.id,
      label: settings.phoneDisplayName || settings.phone,
    }));
    return {
      // A remembered id for a channel that has since gone falls back too.
      waSettingsId:
        (channels.some((channel) => channel.id === selectedId) ? selectedId : null) ??
        channels[0]?.id ??
        "",
      setWaSettingsId: setSelectedId,
      channels,
      isLoading,
    };
  }, [waSettings, selectedId, setSelectedId, isLoading]);

  return <MetaAgentContext value={value}>{children}</MetaAgentContext>;
}

export function useMetaAgentContext() {
  const context = use(MetaAgentContext);
  if (!context) {
    throw new Error("useMetaAgentContext must be used inside MetaAgentProvider");
  }
  return context;
}
