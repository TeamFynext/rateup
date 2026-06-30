import { WhatsAppChatHeader } from "@/components/whatsapp/whatsapp-preview-shell.tsx";
import type { WaFlowScreen } from "@/types/global";

import { FlowChatPreview } from "./FlowChatPreview.tsx";

/**
 * Live phone-preview content for the global phone simulator, reusing the shared WhatsApp
 * header. The simulator's panel is mounted outside the flow editor's React tree (in the
 * app shell), so `currentScreen` must be computed by the caller (where EditFlowContext is
 * actually in scope) and passed in as a prop rather than read via useContext here.
 */
export function FlowPreviewPhoneContent({
  currentScreen,
  version = 1,
}: Readonly<{ currentScreen: WaFlowScreen | undefined; version?: number }>) {
  return (
    <div className="relative flex h-full flex-col">
      <WhatsAppChatHeader />

      {/* Chat background */}
      <div className="flex-1 bg-[#efeae2] dark:bg-[#0b141a]" />

      {/* Flow Sheet — bottom sheet overlay */}
      {currentScreen && (
        <div className="absolute bottom-0 left-0 right-0 h-[calc(100%-9px)] bg-background rounded-t-2xl flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.12)]">
          <FlowChatPreview currentScreen={currentScreen} version={version} />
        </div>
      )}
    </div>
  );
}
