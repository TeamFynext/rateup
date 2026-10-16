import { axiosClient } from "../apiClient";

/**
 * Partner API keys. Mirrors `rateup-api/src/modules/apiAccessToken` (the `/keys` and
 * `/usage` routes). Reads never return a key or its hash; the plaintext comes back only
 * from create and rotate, once.
 */

const base = "/api-access-token";

export type ApiKeyMode = "live" | "test";

/**
 * The partner API version a key opens; each key works on its own version only. v1 is
 * `/api/external/v1/{orgId}` with the original response shapes and always-live keys; v2 is
 * `/api/external/v2`, where the key alone names the org.
 */
export type ApiKeyVersion = "v1" | "v2";

/**
 * The partner API's feature areas a key can be limited to. Mirrors `API_KEY_FEATURES` in
 * rateup-api's `src/authz/apiKeyFeatures.ts`, which says which permissions each one grants.
 */
export const API_KEY_FEATURES = [
  "contacts",
  "teams",
  "campaigns",
  "surveys",
  "whatsapp",
  "loyalty",
  /** The embedded support widget's socket and `/api/support/*`; no partner API route. */
  "widget",
] as const;
export type ApiKeyFeature = (typeof API_KEY_FEATURES)[number];

export interface ApiKey {
  id: string;
  name: string;
  /**
   * The first characters of the key, for telling keys apart: `rk_live_ab12` for v2, and for
   * v1 (which has no prefix) four characters with the ellipsis already on, `ab12…`. Null for a
   * key minted before keys were SHA-256 hashed and not used since: the server only learns its
   * first characters when the key is next presented.
   */
  displayPrefix: string | null;
  mode: ApiKeyMode;
  version: ApiKeyVersion;
  /** Permission keys the key may exercise. Empty means full access. */
  scopes: string[];
  /**
   * The features those permissions fully cover (every feature for a full-access key). A key
   * limited permission by permission before features existed can cover none.
   */
  features: ApiKeyFeature[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  rotatedAt: string | null;
}

/** A key as the API sends it. Records from before the v1/v2 split may lack `version`. */
type ApiKeyRecord = Omit<ApiKey, "version" | "rotatedAt" | "features"> & {
  version?: string | null;
  rotatedAt?: string | null;
  features?: ApiKeyFeature[];
};

/**
 * Fills in `version` when the record lacks it: only v2 keys carry the `rk_` prefix, and
 * everything minted before v2 existed is v1.
 */
function toApiKey(record: ApiKeyRecord): ApiKey {
  const version: ApiKeyVersion =
    record.version === "v2" || record.version === "v1"
      ? record.version
      : record.displayPrefix?.startsWith("rk_")
        ? "v2"
        : "v1";
  return {
    ...record,
    version,
    rotatedAt: record.rotatedAt ?? null,
    features: record.features ?? [],
  };
}

export interface CreateApiKeyInput {
  name: string;
  /** Empty or absent: full access. */
  features?: ApiKeyFeature[];
  /** Ignored for v1, whose keys are always live. */
  mode?: ApiKeyMode;
  /** Defaults to v2 on the API. */
  version?: ApiKeyVersion;
  /** ISO timestamp; `null` or absent for a key that never expires. */
  expiresAt?: string | null;
}

export interface UpdateApiKeyInput {
  name?: string;
  /** Empty: full access. Absent: unchanged. */
  features?: ApiKeyFeature[];
  expiresAt?: string | null;
}

/** What create and rotate return: the plaintext, shown once, beside the public record. */
export interface IssuedApiKey {
  apiKey: string;
  key: ApiKey;
}

export interface RotatedApiKey extends IssuedApiKey {
  /** When the key that was rotated stops working. */
  previousKeyExpiresAt: string;
}

export interface ApiUsageDay {
  /** `YYYY-MM-DD`, UTC. */
  day: string;
  keyId: string | null;
  ok: number;
  clientErrors: number;
  serverErrors: number;
  p95LatencyMs: number | null;
}

export interface ApiUsageRequest {
  id: string;
  /** Null once the key that made it has been revoked. */
  keyId: string | null;
  method: string;
  route: string;
  status: number;
  latencyMs: number;
  createdAt: string;
}

export interface ApiUsage {
  daily: ApiUsageDay[];
}

/** One page of the request log, newest first. */
export interface ApiRequestPage {
  data: ApiUsageRequest[];
  /** Pass back as `cursor` for the next (older) page; null on the last one. */
  nextCursor: string | null;
}

export interface ApiRequestsFilter {
  keyId?: string;
  cursor?: string;
  limit?: number;
}

export interface ApiUsageFilter {
  days: number;
  keyId?: string;
}

export const MAX_API_KEYS = 20;

export async function listApiKeys() {
  const res = await axiosClient.get<{ keys: ApiKeyRecord[] }>(`${base}/keys`);
  return res.data.keys.map(toApiKey);
}

export async function createApiKey(input: CreateApiKeyInput): Promise<IssuedApiKey> {
  const res = await axiosClient.post<{ apiKey: string; key: ApiKeyRecord }>(`${base}/keys`, input);
  return { apiKey: res.data.apiKey, key: toApiKey(res.data.key) };
}

export async function updateApiKey({ keyId, ...input }: UpdateApiKeyInput & { keyId: string }) {
  const res = await axiosClient.patch<{ key: ApiKeyRecord }>(`${base}/keys/${keyId}`, input);
  return toApiKey(res.data.key);
}

export async function revokeApiKey(keyId: string) {
  await axiosClient.delete(`${base}/keys/${keyId}`);
}

export async function rotateApiKey({
  keyId,
  graceHours,
}: {
  keyId: string;
  graceHours: number;
}): Promise<RotatedApiKey> {
  const res = await axiosClient.post<{
    apiKey: string;
    key: ApiKeyRecord;
    previousKeyExpiresAt: string;
  }>(`${base}/keys/${keyId}/rotate`, { graceHours });
  return { ...res.data, key: toApiKey(res.data.key) };
}

export async function listApiRequests({ keyId, cursor, limit }: ApiRequestsFilter) {
  const res = await axiosClient.get<ApiRequestPage>(`${base}/usage/requests`, {
    params: {
      ...(keyId ? { keyId } : {}),
      ...(cursor ? { cursor } : {}),
      ...(limit ? { limit } : {}),
    },
  });
  return res.data;
}

export async function getApiUsage({ days, keyId }: ApiUsageFilter) {
  const res = await axiosClient.get<ApiUsage>(`${base}/usage`, {
    params: { days, ...(keyId ? { keyId } : {}) },
  });
  return res.data;
}
