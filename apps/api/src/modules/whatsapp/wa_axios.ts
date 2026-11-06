import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { log } from "../../utils/logger.js";
import { graphUrl } from "../../utils/meta.js";

/**
 * How long one Graph call may take before it is abandoned. There used to be no
 * limit at all, so a connection Meta never answered held a campaign worker slot
 * (one of 250) until the socket died on its own — minutes, not seconds.
 */
export const META_API_TIMEOUT_MS = 15_000;

/** Uploads stream a file body, which can legitimately take far longer. */
export const META_API_UPLOAD_TIMEOUT_MS = 120_000;

/**
 * Failures where the request provably never left: no connection was opened, so
 * Meta cannot have acted on it. The only transport failures a write may be
 * retried on.
 */
const CONNECT_PHASE_ERRORS: ReadonlySet<string> = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
]);

/**
 * What a read may also be retried on: the connection broke after it opened,
 * which repeats harmlessly for a GET but may already have delivered a POST.
 */
const READ_RETRYABLE_ERRORS: ReadonlySet<string> = new Set([
  ...CONNECT_PHASE_ERRORS,
  "ECONNRESET",
  "EPROTO",
]);

/**
 * Never retried, whatever the method. A timeout or an abort means the request
 * may well have reached Meta and been acted on; sending it again is how a
 * campaign recipient gets the same message twice.
 */
const NEVER_RETRY_ERRORS: ReadonlySet<string> = new Set([
  "ECONNABORTED",
  "ETIMEDOUT",
  "ERR_CANCELED",
]);

const IDEMPOTENT_METHODS: ReadonlySet<string> = new Set(["GET", "HEAD", "OPTIONS"]);

/** Wait before the second attempt; doubled for each one after. */
const RETRY_BASE_DELAY_MS = 250;

function isIdempotent(method: AxiosRequestConfig["method"]): boolean {
  return IDEMPOTENT_METHODS.has((method ?? "GET").toUpperCase());
}

/** Whether a request that threw (no response at all) is safe to send again. */
export function shouldRetryError(method: AxiosRequestConfig["method"], code?: string): boolean {
  if (!code || NEVER_RETRY_ERRORS.has(code)) return false;
  return isIdempotent(method) ? READ_RETRYABLE_ERRORS.has(code) : CONNECT_PHASE_ERRORS.has(code);
}

/**
 * Whether a response is worth another attempt: a throttle, or Meta being
 * briefly unwell. A 504 is the exception for a write — the gateway stopped
 * waiting on a request that may still have been processed, which is the
 * timeout case again.
 */
export function shouldRetryStatus(method: AxiosRequestConfig["method"], status: number): boolean {
  if (status === 429) return true;
  if (status < 500 || status > 599) return false;
  return status !== 504 || isIdempotent(method);
}

async function axiosWithRetry<T = any>(
  config: AxiosRequestConfig,
  retries = 3,
): Promise<AxiosResponse<T>> {
  for (let attempt = 1; ; attempt++) {
    const isLast = attempt >= retries;
    try {
      const response = await axios<T>({
        ...config,
        validateStatus: () => true,
      });

      // The last response is returned whatever it is, so the caller still sees
      // Meta's verdict rather than a retry wrapper's.
      if (isLast || !shouldRetryStatus(config.method, response.status)) {
        return response;
      }
      log.warn(
        { status: response.status, method: config.method, url: config.url, attempt },
        "WhatsApp API returned a retryable status. Retrying...",
      );
    } catch (error) {
      const axiosError = error as AxiosError;
      if (isLast || !shouldRetryError(config.method, axiosError.code)) {
        throw error;
      }
      log.warn(
        {
          code: axiosError.code,
          method: config.method,
          attempt,
        },
        "WhatsApp API request failed. Retrying...",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)));
  }
}

/** A streamed or binary body — a file upload rather than a JSON call. */
function isUploadBody(data: unknown): boolean {
  if (data === null || typeof data !== "object") return false;
  if (Buffer.isBuffer(data) || ArrayBuffer.isView(data)) return true;
  if (data instanceof Blob || data instanceof FormData) return true;
  // Node streams, and the `form-data` package's FormData (itself a stream).
  const candidate = data as { pipe?: unknown; getHeaders?: unknown };
  return typeof candidate.pipe === "function" || typeof candidate.getHeaders === "function";
}

/** Re-exported so existing importers of wa_axios keep working. */
export { META_API_HOST, META_API_VERSION } from "../../utils/meta.js";

export async function callMetaApi(
  url: string,
  method: AxiosRequestConfig["method"],
  // `null` is a legitimate, intentional value here (as opposed to just
  // omitting the argument): some callers embed the access token in the
  // request body instead of the Authorization header (e.g. Meta's catalog
  // items_batch endpoint) and explicitly pass `null` to make that clear.
  accessToken?: string | null,
  data?: AxiosRequestConfig["data"],
  otherConfig: AxiosRequestConfig = {},
  headerConfig: AxiosRequestConfig["headers"] = {},
  params: AxiosRequestConfig["params"] = {},
): Promise<AxiosResponse<any, any>> {
  const headAuth = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const config: AxiosRequestConfig = {
    url: graphUrl(url),
    method,
    data,
    params,
    headers: {
      ...headAuth,
      ...headerConfig,
    },
    validateStatus: () => true, // don't throw error on non-2xx status
    // Before `otherConfig`, so a caller that knows better can still override it.
    timeout: isUploadBody(data) ? META_API_UPLOAD_TIMEOUT_MS : META_API_TIMEOUT_MS,
    ...otherConfig,
  };
  log.trace("Calling Meta API with config: %s %s \n%o", config.method, config.url, config.data);
  const res = await axiosWithRetry(config);
  if (res.status.toString().startsWith("2")) {
    return res;
  } else {
    // Callers log the thrown error with their own context; this line only adds
    // what they can't see. Never log `res` itself — its config carries the token.
    log.warn(
      { status: res.status, method: config.method, url: config.url, graphError: res.data?.error },
      "Meta API returned an error",
    );
    if (res.data?.error) {
      throw new GraphApiError(res);
    } else {
      // An HTML 502 from the edge, an empty 429: no Graph payload, but the status
      // alone is a verdict, so it is kept for the failure classifier.
      throw new MetaHttpError(res.status);
    }
  }
}

interface GraphApiErrorType {
  message: string;
  type: string;
  code: number;
  fbtrace_id: string;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
}

export class GraphApiError extends Error {
  error: GraphApiErrorType;
  /** The HTTP status Graph answered with. */
  status?: number;
  constructor(res: AxiosResponse) {
    let message = "Something went wrong";
    super(message);
    this.name = "GraphApiError";
    this.error = res.data.error;
    this.status = res.status;
  }
}

/** A non-2xx response that carried no Graph `{ error }` body. */
export class MetaHttpError extends Error {
  status: number;
  constructor(status: number) {
    super("Error calling Meta API");
    this.name = "MetaHttpError";
    this.status = status;
  }
}
