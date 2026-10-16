import type { AutomationPlatform } from "@/types/platform.ts";

import { INSTAGRAM_EXAMPLES } from "./instagram.ts";
import { MESSENGER_EXAMPLES } from "./messenger.ts";
import type { ChatbotExample, ChatbotUseCase } from "./types.ts";
import { WHATSAPP_EXAMPLES } from "./whatsapp.ts";

export { CHATBOT_USE_CASES } from "./types.ts";
export type { ChatbotExample, ChatbotGraph, ChatbotUseCase } from "./types.ts";

/** Every ready-made chatbot, across channels. */
export const CHATBOT_EXAMPLES: readonly ChatbotExample[] = [
  ...WHATSAPP_EXAMPLES,
  ...INSTAGRAM_EXAMPLES,
  ...MESSENGER_EXAMPLES,
];

export function examplesFor(platform: AutomationPlatform, useCase?: ChatbotUseCase) {
  return CHATBOT_EXAMPLES.filter(
    (example) => example.platform === platform && (!useCase || example.useCase === useCase),
  );
}

export function findExample(key: string | undefined) {
  return key ? CHATBOT_EXAMPLES.find((example) => example.key === key) : undefined;
}
