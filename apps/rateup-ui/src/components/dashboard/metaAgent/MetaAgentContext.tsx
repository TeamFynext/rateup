import { createContext, use, useMemo, useState } from "react";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";

interface MetaAgentContextValue {
  /** The WhatsApp channel every panel below is configuring, or "" while loading. */
  waSettingsId: string;
  setWaSettingsId: (id: string) => void;
  channels: { id: string; label: string }[];
  isLoading: boolean;
}

const MetaAgentContext = createContext<MetaAgentContextValue | null>(null);

/**
 * The chosen WhatsApp channel lives on the layout route rather than in each
 * section, so moving between sections in the sidebar keeps you on the same
 * number. It is deliberately not a search param: the sidebar links carry only a
 * pathname, so a param would be dropped on every hop.
 */
export function MetaAgentProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { data: waSettings, isLoading } = useWaSettings();
  const [selectedId, setSelectedId] = useState<string>();

  const value = useMemo<MetaAgentContextValue>(() => {
    const channels = (waSettings ?? []).map((settings) => ({
      id: settings.id,
      label: settings.phoneDisplayName || settings.phone,
    }));
    return {
      waSettingsId: selectedId ?? channels[0]?.id ?? "",
      setWaSettingsId: setSelectedId,
      channels,
      isLoading,
    };
  }, [waSettings, selectedId, isLoading]);

  return <MetaAgentContext value={value}>{children}</MetaAgentContext>;
}

export function useMetaAgentContext() {
  const context = use(MetaAgentContext);
  if (!context) {
    throw new Error("useMetaAgentContext must be used inside MetaAgentProvider");
  }
  return context;
}
