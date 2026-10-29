import { createContext, useContext } from "react";

import { AutomationPlatform } from "@/types/platform.ts";
import { limitsFor } from "@/types/platformLimits.ts";

/**
 * The channel of the chatbot open in the builder, for the node cards and editors under it:
 * what they check and the limits they show follow it. WhatsApp when nothing provides one.
 */
export const ChatbotPlatformContext = createContext<AutomationPlatform>(
  AutomationPlatform.WHATSAPP,
);

export const useChatbotPlatform = () => useContext(ChatbotPlatformContext);

/** The open chatbot's channel limits. */
export const useChannelLimits = () => limitsFor(useChatbotPlatform());
