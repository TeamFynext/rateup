import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { shouldSkipLocalErrorToast } from "@/backend/apiClient";
import { setMessengerProfileSection } from "@/backend/whatsapp/messenger-profile/messengerProfile.api";
import { updateRule } from "@/backend/whatsapp/rule/rule.api";
import type { RequestPayload, RequestPayloadFields } from "@/types/api.ts";
import type { WaAutomatedReply } from "@/types/global";
import type { AutomationPlatform } from "@/types/platform.ts";
import type { CreateRule } from "@/types/rule.ts";

import {
  type ChatbotList,
  cloneChatbot,
  createChatbot,
  deleteChatbot,
  getChatbot,
  getChatbotRules,
  getChatbots,
  initiateChatbot,
  updateChatbot,
} from "./chatbots.api";

export const chatbotKeys = {
  all: () => ["chatbots"] as const,
  lists: () => ["chatbots", "list"] as const,
  list: (platform?: AutomationPlatform, withGraph = false, search = "") =>
    [
      "chatbots",
      "list",
      platform ?? "all",
      ...(withGraph ? ["graph"] : []),
      ...(search ? ["search", search] : []),
    ] as const,
  detail: (id: string) => ["chatbots", "detail", id] as const,
  rules: (id: string) => ["chatbots", "rules", id] as const,
};

/** After any write, every chatbot list goes stale. Not the open chatbot: the editor holds it. */
export function invalidateChatbotLists(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: chatbotKeys.lists() });
}

function errorToast(fallback: string) {
  return (error: Error) => {
    if (!shouldSkipLocalErrorToast(error)) toast.error(error?.message || fallback);
  };
}

/**
 * `withGraph`: each chatbot comes with its graph, for finding one by what it contains.
 * `search`: only chatbots whose name contains it (matched by the API). The last results stay
 * on screen while the next ones load.
 */
export const useChatbots = (
  platform?: AutomationPlatform,
  { withGraph = false, search = "" }: { withGraph?: boolean; search?: string } = {},
) =>
  useQuery({
    queryKey: chatbotKeys.list(platform, withGraph, search),
    queryFn: () => getChatbots(platform, { withGraph, search }),
    placeholderData: keepPreviousData,
  });

export const useChatbot = (id: string) =>
  useQuery({
    queryKey: chatbotKeys.detail(id),
    queryFn: () => getChatbot(id),
    enabled: !!id,
  });

/** The rules that start a chatbot: whether it is live, and what is left to switch it on. */
export const useChatbotRules = (id: string) =>
  useQuery({
    queryKey: chatbotKeys.rules(id),
    queryFn: () => getChatbotRules(id),
    enabled: !!id,
  });

export const useCreateChatbotMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RequestPayload) => createChatbot(data),
    onSuccess: () => {
      invalidateChatbotLists(qc);
      toast.success("Chatbot created");
    },
    onError: errorToast("Error creating the chatbot"),
  });
};

/**
 * Saves without a toast: the editor autosaves, and the settings form says its own thanks.
 * The open chatbot's cache is left to the caller (the editor patches in its graph), so an
 * autosave never swaps the data the canvas is drawing from.
 */
export const useUpdateChatbotMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    // On/off belongs to useToggleChatbotMutation alone: the editor and settings form resend the
    // row they loaded, which must never switch the chatbot back.
    mutationFn: ({ id, isActive: _isActive, ...data }: { id: string } & RequestPayloadFields) =>
      updateChatbot(id, data),
    onSuccess: () => {
      invalidateChatbotLists(qc);
    },
    onError: errorToast("Error saving the chatbot"),
  });
};

export const useCloneChatbotMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => cloneChatbot(id, name),
    onSuccess: () => {
      invalidateChatbotLists(qc);
      toast.success("Chatbot copied");
    },
    onError: errorToast("Error copying the chatbot"),
  });
};

export const useDeleteChatbotMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteChatbot(id),
    onSuccess: (_res, id) => {
      qc.removeQueries({ queryKey: chatbotKeys.detail(id) });
      invalidateChatbotLists(qc);
      toast.success("Chatbot deleted");
    },
    onError: errorToast("Error deleting the chatbot"),
  });
};

/**
 * Switches on a rule the wizard made off: with the keyword the user typed, if it still needed
 * one, and after adding the Get Started button to the Page, if its rule answers one the Page
 * does not have yet.
 */
export const useTurnOnStartRuleMutation = (chatbotId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ruleId,
      platform,
      keyword,
      getStarted,
    }: {
      ruleId: string;
      /** The chatbot's channel. Sent so the API keeps the rule on it: left out, it reads WhatsApp. */
      platform: AutomationPlatform;
      keyword?: string;
      getStarted?: { channelId: string; payload: string };
    }) => {
      if (getStarted) {
        await setMessengerProfileSection(getStarted.channelId, "get-started", {
          payload: getStarted.payload,
        });
      }
      const rulePlatform = platform.toUpperCase() as CreateRule["platform"];
      const change: Partial<CreateRule> = {
        isActive: true,
        platform: rulePlatform,
        platforms: [rulePlatform],
      };
      if (keyword !== undefined) {
        change.groups = [
          {
            operator: "AND",
            conditions: [
              {
                field: "MESSAGE_BODY",
                operator: "CONTAINS",
                value: keyword.trim(),
              },
            ],
          },
        ] as CreateRule["groups"];
      }
      return updateRule(ruleId, change);
    },
    onSuccess: (_rule, { getStarted }) => {
      void qc.invalidateQueries({ queryKey: chatbotKeys.rules(chatbotId) });
      void qc.invalidateQueries({ queryKey: ["rules"] });
      if (getStarted) void qc.invalidateQueries({ queryKey: ["messengerProfile"] });
      toast.success("Chatbot is live");
    },
    onError: errorToast("Couldn't switch the rule on"),
  });
};

/**
 * Switches a chatbot on or off from the list. The cards flip straight away and go back if the
 * save fails.
 */
export const useToggleChatbotMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateChatbot(id, { isActive }),
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: chatbotKeys.lists() });
      const before = qc.getQueriesData<ChatbotList>({
        queryKey: chatbotKeys.lists(),
      });
      qc.setQueriesData<ChatbotList>({ queryKey: chatbotKeys.lists() }, (list) =>
        list
          ? {
              ...list,
              data: list.data.map((bot) => (bot.id === id ? { ...bot, isActive } : bot)),
            }
          : list,
      );
      // The open editor's copy too; patched, not refetched, so the canvas keeps its state.
      qc.setQueryData<WaAutomatedReply>(chatbotKeys.detail(id), (bot) =>
        bot ? { ...bot, isActive } : bot,
      );
      return { before };
    },
    onError: (error, _vars, context) => {
      for (const [key, value] of context?.before ?? []) qc.setQueryData(key, value);
      errorToast("Couldn't switch the chatbot")(error);
    },
    onSuccess: (_bot, { isActive }) => {
      toast.success(isActive ? "Chatbot switched on" : "Chatbot switched off");
    },
    onSettled: () => invalidateChatbotLists(qc),
  });
};

/** Starts a chatbot for the contact open in the inbox. */
export const useInitiateChatbotMutation = (chatbotId: string) =>
  useMutation({
    mutationFn: (body: { recipientId: string; accountId?: string }) =>
      initiateChatbot(chatbotId, body),
    onSuccess: () => {
      toast.success("Chatbot started");
    },
    onError: errorToast("Error starting the chatbot"),
  });
