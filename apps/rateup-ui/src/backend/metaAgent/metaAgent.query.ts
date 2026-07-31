import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  addAllowlistEntry,
  type AgentSettings,
  type BusinessInfo,
  checkAgentEligibility,
  createConnector,
  createConnectorTool,
  createFaq,
  createSkill,
  createWebsite,
  deleteConnector,
  deleteConnectorTool,
  deleteFaq,
  deleteFile,
  deleteSkill,
  deleteWebsite,
  type Faq,
  getAgentEventStatus,
  getAgentSettings,
  getBusinessInfo,
  getEvalRunStatus,
  getMetaBusinessAgent,
  listAllowlist,
  listConnectors,
  listConnectorTools,
  listEvalCases,
  listFaqs,
  listFiles,
  listSkills,
  listWebsites,
  onboardAgent,
  removeAllowlistEntry,
  runConnectorTool,
  type Skill,
  setThreadControl,
  submitAgentEvent,
  submitEvalRun,
  syncAgentSettings,
  syncAllowlist,
  syncBusinessInfo,
  syncConnectors,
  syncConnectorTools,
  syncFaqs,
  syncFiles,
  syncSkills,
  syncWebsites,
  testAgent,
  updateAgentSettings,
  updateBusinessInfo,
  updateFaq,
  updateSkill,
  upsertConnectorApiKey,
  upsertConnectorOAuth,
  uploadFile,
} from "./metaAgent.api";

const key = (resource: string, waSettingsId: string, ...rest: unknown[]) => [
  "metaAgent",
  resource,
  waSettingsId,
  ...rest,
];

const onErr = (fallback: string) => (error: Error) => toast.error(error?.message || fallback);

// ---- agent record ----
export const useMetaBusinessAgent = (waSettingsId: string) =>
  useQuery({
    queryKey: key("agent", waSettingsId),
    queryFn: () => getMetaBusinessAgent(waSettingsId),
    enabled: !!waSettingsId,
  });

// eligibility is only ever checked on button click, never on page load
export const useCheckAgentEligibility = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => checkAgentEligibility(waSettingsId),
    onSuccess: (data) => {
      qc.setQueryData(key("agent", waSettingsId), data);
      toast.success(data.isEligible ? "This number is eligible" : "This number is not eligible");
    },
    onError: onErr("Failed to check eligibility"),
  });
};

export const useOnboardAgent = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channel?: string) => onboardAgent(waSettingsId, channel),
    onSuccess: (data) => {
      qc.setQueryData(key("agent", waSettingsId), data);
      toast.success("Agent onboarding started");
    },
    onError: onErr("Failed to onboard agent"),
  });
};

// ---- allowlist ----
export const useAllowlist = (waSettingsId: string) =>
  useQuery({
    queryKey: key("allowlist", waSettingsId),
    queryFn: () => listAllowlist(waSettingsId),
    enabled: !!waSettingsId,
  });

export const useAddAllowlistEntry = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (phone: string) => addAllowlistEntry(waSettingsId, phone),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("allowlist", waSettingsId) });
      toast.success("Number added to allowlist");
    },
    onError: onErr("Failed to add allowlist entry"),
  });
};

export const useRemoveAllowlistEntry = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => removeAllowlistEntry(waSettingsId, entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("allowlist", waSettingsId) });
      toast.success("Removed from allowlist");
    },
    onError: onErr("Failed to remove allowlist entry"),
  });
};

export const useSyncAllowlist = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncAllowlist(waSettingsId),
    onSuccess: (data) => {
      qc.setQueryData(key("allowlist", waSettingsId), data);
      toast.success("Allowlist synced from Meta");
    },
    onError: onErr("Failed to sync allowlist"),
  });
};

// ---- agent settings ----
export const useAgentSettings = (waSettingsId: string) =>
  useQuery({
    queryKey: key("settings", waSettingsId),
    queryFn: () => getAgentSettings(waSettingsId),
    enabled: !!waSettingsId,
  });

export const useUpdateAgentSettings = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AgentSettings>) => updateAgentSettings(waSettingsId, data),
    onSuccess: (data) => {
      qc.setQueryData(key("settings", waSettingsId), data);
      toast.success("Agent settings saved and pushed to Meta");
    },
    onError: onErr("Failed to update agent settings"),
  });
};

export const useSyncAgentSettings = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncAgentSettings(waSettingsId),
    onSuccess: (data) => {
      qc.setQueryData(key("settings", waSettingsId), data);
      toast.success("Settings synced from Meta");
    },
    onError: onErr("Failed to sync settings"),
  });
};

// ---- knowledge: business info ----
export const useBusinessInfo = (waSettingsId: string) =>
  useQuery({
    queryKey: key("businessInfo", waSettingsId),
    queryFn: () => getBusinessInfo(waSettingsId),
    enabled: !!waSettingsId,
  });

export const useUpdateBusinessInfo = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BusinessInfo) => updateBusinessInfo(waSettingsId, data),
    onSuccess: (data) => {
      qc.setQueryData(key("businessInfo", waSettingsId), data);
      toast.success("Business info saved and pushed to Meta");
    },
    onError: onErr("Failed to update business info"),
  });
};

export const useSyncBusinessInfo = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncBusinessInfo(waSettingsId),
    onSuccess: (data) => {
      qc.setQueryData(key("businessInfo", waSettingsId), data);
      toast.success("Business info synced from Meta");
    },
    onError: onErr("Failed to sync business info"),
  });
};

// ---- knowledge: faqs ----
export const useFaqs = (waSettingsId: string) =>
  useQuery({
    queryKey: key("faqs", waSettingsId),
    queryFn: () => listFaqs(waSettingsId),
    enabled: !!waSettingsId,
  });

export const useCreateFaq = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Pick<Faq, "question" | "answer">) => createFaq(waSettingsId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("faqs", waSettingsId) });
      toast.success("FAQ created");
    },
    onError: onErr("Failed to create FAQ"),
  });
};

export const useUpdateFaq = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ faqId, data }: { faqId: string; data: Pick<Faq, "question" | "answer"> }) =>
      updateFaq(waSettingsId, faqId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("faqs", waSettingsId) });
      toast.success("FAQ updated");
    },
    onError: onErr("Failed to update FAQ"),
  });
};

export const useDeleteFaq = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (faqId: string) => deleteFaq(waSettingsId, faqId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("faqs", waSettingsId) });
      toast.success("FAQ deleted");
    },
    onError: onErr("Failed to delete FAQ"),
  });
};

export const useSyncFaqs = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncFaqs(waSettingsId),
    onSuccess: (data) => {
      qc.setQueryData(key("faqs", waSettingsId), data);
      toast.success("FAQs synced from Meta");
    },
    onError: onErr("Failed to sync FAQs"),
  });
};

// ---- knowledge: files ----
export const useKnowledgeFiles = (waSettingsId: string) =>
  useQuery({
    queryKey: key("files", waSettingsId),
    queryFn: () => listFiles(waSettingsId),
    enabled: !!waSettingsId,
  });

export const useUploadFile = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadFile(waSettingsId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("files", waSettingsId) });
      toast.success("File uploaded");
    },
    onError: onErr("Failed to upload file"),
  });
};

export const useDeleteFile = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => deleteFile(waSettingsId, fileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("files", waSettingsId) });
      toast.success("File deleted");
    },
    onError: onErr("Failed to delete file"),
  });
};

export const useSyncFiles = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncFiles(waSettingsId),
    onSuccess: (data) => {
      qc.setQueryData(key("files", waSettingsId), data);
      toast.success("Files synced from Meta");
    },
    onError: onErr("Failed to sync files"),
  });
};

// ---- knowledge: websites ----
export const useWebsites = (waSettingsId: string) =>
  useQuery({
    queryKey: key("websites", waSettingsId),
    queryFn: () => listWebsites(waSettingsId),
    enabled: !!waSettingsId,
  });

export const useCreateWebsite = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => createWebsite(waSettingsId, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("websites", waSettingsId) });
      toast.success("Website added for crawling");
    },
    onError: onErr("Failed to add website"),
  });
};

export const useDeleteWebsite = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (websiteId: string) => deleteWebsite(waSettingsId, websiteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("websites", waSettingsId) });
      toast.success("Website removed");
    },
    onError: onErr("Failed to remove website"),
  });
};

export const useSyncWebsites = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncWebsites(waSettingsId),
    onSuccess: (data) => {
      qc.setQueryData(key("websites", waSettingsId), data);
      toast.success("Websites synced from Meta");
    },
    onError: onErr("Failed to sync websites"),
  });
};

// ---- skills ----
export const useSkills = (waSettingsId: string) =>
  useQuery({
    queryKey: key("skills", waSettingsId),
    queryFn: () => listSkills(waSettingsId),
    enabled: !!waSettingsId,
  });

export const useCreateSkill = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Pick<Skill, "title" | "description" | "skill">) =>
      createSkill(waSettingsId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("skills", waSettingsId) });
      toast.success("Skill created");
    },
    onError: onErr("Failed to create skill"),
  });
};

export const useUpdateSkill = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      skillId,
      data,
    }: {
      skillId: string;
      data: Pick<Skill, "title" | "description" | "skill">;
    }) => updateSkill(waSettingsId, skillId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("skills", waSettingsId) });
      toast.success("Skill updated");
    },
    onError: onErr("Failed to update skill"),
  });
};

export const useDeleteSkill = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (skillId: string) => deleteSkill(waSettingsId, skillId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("skills", waSettingsId) });
      toast.success("Skill deleted");
    },
    onError: onErr("Failed to delete skill"),
  });
};

export const useSyncSkills = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncSkills(waSettingsId),
    onSuccess: (data) => {
      qc.setQueryData(key("skills", waSettingsId), data);
      toast.success("Skills synced from Meta");
    },
    onError: onErr("Failed to sync skills"),
  });
};

// ---- connectors ----
export const useConnectors = (waSettingsId: string) =>
  useQuery({
    queryKey: key("connectors", waSettingsId),
    queryFn: () => listConnectors(waSettingsId),
    enabled: !!waSettingsId,
  });

export const useCreateConnector = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createConnector>[1]) =>
      createConnector(waSettingsId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("connectors", waSettingsId) });
      toast.success("Connector created");
    },
    onError: onErr("Failed to create connector"),
  });
};

export const useDeleteConnector = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (connectorId: string) => deleteConnector(waSettingsId, connectorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("connectors", waSettingsId) });
      toast.success("Connector deleted");
    },
    onError: onErr("Failed to delete connector"),
  });
};

export const useSyncConnectors = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncConnectors(waSettingsId),
    onSuccess: (data) => {
      qc.setQueryData(key("connectors", waSettingsId), data);
      toast.success("Connectors synced from Meta");
    },
    onError: onErr("Failed to sync connectors"),
  });
};

export const useUpsertConnectorApiKey = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ connectorId, apiKey }: { connectorId: string; apiKey: string }) =>
      upsertConnectorApiKey(waSettingsId, connectorId, apiKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("connectors", waSettingsId) });
      toast.success("API key saved");
    },
    onError: onErr("Failed to save API key"),
  });
};

export const useUpsertConnectorOAuth = (waSettingsId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      connectorId,
      data,
    }: {
      connectorId: string;
      data: { client_id: string; client_secret: string; token_url?: string };
    }) => upsertConnectorOAuth(waSettingsId, connectorId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("connectors", waSettingsId) });
      toast.success("OAuth credentials saved");
    },
    onError: onErr("Failed to save OAuth credentials"),
  });
};

// ---- connector tools ----
export const useConnectorTools = (waSettingsId: string, connectorId: string) =>
  useQuery({
    queryKey: key("connectorTools", waSettingsId, connectorId),
    queryFn: () => listConnectorTools(waSettingsId, connectorId),
    enabled: !!waSettingsId && !!connectorId,
  });

export const useCreateConnectorTool = (waSettingsId: string, connectorId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createConnectorTool>[2]) =>
      createConnectorTool(waSettingsId, connectorId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("connectorTools", waSettingsId, connectorId) });
      toast.success("Tool created");
    },
    onError: onErr("Failed to create tool"),
  });
};

export const useDeleteConnectorTool = (waSettingsId: string, connectorId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (toolId: string) => deleteConnectorTool(waSettingsId, connectorId, toolId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("connectorTools", waSettingsId, connectorId) });
      toast.success("Tool deleted");
    },
    onError: onErr("Failed to delete tool"),
  });
};

export const useRunConnectorTool = (waSettingsId: string, connectorId: string) =>
  useMutation({
    mutationFn: ({ toolId, input }: { toolId: string; input?: Record<string, unknown> }) =>
      runConnectorTool(waSettingsId, connectorId, toolId, input),
    onError: onErr("Tool run failed"),
  });

export const useSyncConnectorTools = (waSettingsId: string, connectorId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncConnectorTools(waSettingsId, connectorId),
    onSuccess: (data) => {
      qc.setQueryData(key("connectorTools", waSettingsId, connectorId), data);
      toast.success("Tools synced from Meta");
    },
    onError: onErr("Failed to sync tools"),
  });
};

// ---- operate: eval (always button-triggered) ----
export const useListEvalCases = (waSettingsId: string) =>
  useMutation({
    mutationFn: () => listEvalCases(waSettingsId),
    onError: onErr("Failed to load eval cases"),
  });

export const useSubmitEvalRun = (waSettingsId: string) =>
  useMutation({
    mutationFn: (evalCaseIds: string[]) => submitEvalRun(waSettingsId, evalCaseIds),
    onError: onErr("Failed to submit eval run"),
  });

export const useEvalRunStatus = (waSettingsId: string, jobId?: string) =>
  useQuery({
    queryKey: key("evalRun", waSettingsId, jobId),
    queryFn: () => getEvalRunStatus(waSettingsId, jobId!),
    enabled: !!waSettingsId && !!jobId,
    refetchInterval: (query) =>
      query.state.data?.status === "QUEUED" || query.state.data?.status === "RUNNING"
        ? 3000
        : false,
  });

// ---- operate: events ----
export const useSubmitAgentEvent = (waSettingsId: string) =>
  useMutation({
    mutationFn: (data: Parameters<typeof submitAgentEvent>[1]) =>
      submitAgentEvent(waSettingsId, data),
    onSuccess: () => toast.success("Event submitted"),
    onError: onErr("Failed to submit event"),
  });

export const useAgentEventStatus = (waSettingsId: string, eventId?: string) =>
  useQuery({
    queryKey: key("eventStatus", waSettingsId, eventId),
    queryFn: () => getAgentEventStatus(waSettingsId, eventId!),
    enabled: !!waSettingsId && !!eventId,
  });

// ---- operate: test ----
export const useTestAgent = (waSettingsId: string) =>
  useMutation({
    mutationFn: ({ message, conversationId }: { message: string; conversationId?: string }) =>
      testAgent(waSettingsId, message, conversationId),
    onError: onErr("Failed to test agent"),
  });

// ---- operate: thread control ----
export const useSetThreadControl = (waSettingsId: string) =>
  useMutation({
    mutationFn: ({ action, to }: { action: "pass" | "release"; to: string }) =>
      setThreadControl(waSettingsId, action, to),
    onSuccess: (_data, variables) =>
      toast.success(
        variables.action === "pass" ? "Control passed to AI agent" : "Control released",
      ),
    onError: onErr("Failed to update thread control"),
  });
