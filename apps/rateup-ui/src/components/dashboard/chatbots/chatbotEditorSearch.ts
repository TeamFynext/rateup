import { isTriggerKind, type ChatbotTriggerKind } from "@/config/chatbotExamples/index.ts";

/**
 * The chatbot editor's search params, all from the creation wizard and read by
 * TriggerSetupPrompt: `?trigger=` is the "How it starts" choice, `?example=` the example it
 * was made from, and `?channel=` the account picked for its rule.
 */
// A type, not an interface: the router's search types need an index signature, which only
// type aliases satisfy implicitly.
export type ChatbotEditorSearch = {
  trigger?: ChatbotTriggerKind;
  example?: string;
  channel?: string;
};

export function parseChatbotEditorSearch(search: Record<string, unknown>): ChatbotEditorSearch {
  return {
    trigger: isTriggerKind(search.trigger) ? search.trigger : undefined,
    example: typeof search.example === "string" ? search.example : undefined,
    channel: typeof search.channel === "string" ? search.channel : undefined,
  };
}
