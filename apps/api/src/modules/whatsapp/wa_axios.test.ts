import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const axiosMock = vi.fn();
vi.mock("axios", () => ({ default: axiosMock }));

const { callMetaApi, GraphApiError, MetaHttpError, META_API_TIMEOUT_MS, shouldRetryStatus } =
  await import("./wa_axios.js");
const { graphApiErrorDetail } = await import("../../utils/graphError.js");
const { classifyWaFailure, WaFailureClass } = await import("../../utils/waRetryableErrors.js");

const transportError = (code: string) =>
  Object.assign(new Error(`transport ${code}`), { name: "AxiosError", code });

const ok = { status: 200, data: { messages: [{ id: "wamid.1" }] } };

/** Run a call to completion through its backoff waits. */
async function run(promise: Promise<unknown>) {
  const settled = promise.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  await vi.runAllTimersAsync();
  return settled as Promise<{ value?: unknown; error?: unknown }>;
}

beforeEach(() => {
  vi.useFakeTimers();
  axiosMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("callMetaApi — timeouts", () => {
  it("bounds every call with a timeout", async () => {
    axiosMock.mockResolvedValue(ok);
    await run(callMetaApi("/phone-1/messages", "POST", "token", { to: "1" }));
    expect(axiosMock.mock.calls[0][0].timeout).toBe(META_API_TIMEOUT_MS);
  });

  it("gives an upload body longer than a JSON call", async () => {
    axiosMock.mockResolvedValue(ok);
    await run(callMetaApi("/upload", "POST", "token", Buffer.from("file")));
    expect(axiosMock.mock.calls[0][0].timeout).toBeGreaterThan(META_API_TIMEOUT_MS);
  });

  it("lets a caller override the timeout", async () => {
    axiosMock.mockResolvedValue(ok);
    await run(callMetaApi("/x", "GET", "token", undefined, { timeout: 1 }));
    expect(axiosMock.mock.calls[0][0].timeout).toBe(1);
  });

  // The double-send this guards against: the request may have reached Meta.
  it("sends a POST exactly once when it times out", async () => {
    axiosMock.mockRejectedValue(transportError("ECONNABORTED"));
    const { error } = await run(callMetaApi("/phone-1/messages", "POST", "token", { to: "1" }));
    expect((error as { code?: string }).code).toBe("ECONNABORTED");
    expect(axiosMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry an aborted or timed-out read either", async () => {
    for (const code of ["ETIMEDOUT", "ERR_CANCELED"]) {
      axiosMock.mockReset();
      axiosMock.mockRejectedValue(transportError(code));
      await run(callMetaApi("/x", "GET", "token"));
      expect(axiosMock).toHaveBeenCalledTimes(1);
    }
  });
});

describe("callMetaApi — retries", () => {
  it("retries a POST that never connected", async () => {
    axiosMock.mockRejectedValueOnce(transportError("ECONNREFUSED")).mockResolvedValueOnce(ok);
    const { value } = await run(callMetaApi("/phone-1/messages", "POST", "token", {}));
    expect((value as typeof ok).status).toBe(200);
    expect(axiosMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a POST whose connection reset mid-request", async () => {
    axiosMock.mockRejectedValue(transportError("ECONNRESET"));
    await run(callMetaApi("/phone-1/messages", "POST", "token", {}));
    expect(axiosMock).toHaveBeenCalledTimes(1);
  });

  it("retries a GET whose connection reset", async () => {
    axiosMock.mockRejectedValueOnce(transportError("ECONNRESET")).mockResolvedValueOnce(ok);
    await run(callMetaApi("/x", "GET", "token"));
    expect(axiosMock).toHaveBeenCalledTimes(2);
  });

  it("retries a POST on a 503 and a 429, and returns the success", async () => {
    axiosMock
      .mockResolvedValueOnce({ status: 503, data: "<html>Service Unavailable</html>" })
      .mockResolvedValueOnce({ status: 429, data: "" })
      .mockResolvedValueOnce(ok);
    const { value } = await run(callMetaApi("/phone-1/messages", "POST", "token", {}));
    expect((value as typeof ok).data).toEqual(ok.data);
    expect(axiosMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a POST on a 504, which may have been processed", () => {
    expect(shouldRetryStatus("POST", 504)).toBe(false);
    expect(shouldRetryStatus("GET", 504)).toBe(true);
    expect(shouldRetryStatus("POST", 400)).toBe(false);
  });

  it("stops after three attempts", async () => {
    axiosMock.mockResolvedValue({ status: 500, data: "" });
    await run(callMetaApi("/phone-1/messages", "POST", "token", {}));
    expect(axiosMock).toHaveBeenCalledTimes(3);
  });
});

describe("callMetaApi — errors keep their HTTP status", () => {
  it("classifies an HTML 502 as transient", async () => {
    axiosMock.mockResolvedValue({ status: 502, data: "<html>Bad Gateway</html>" });
    const { error } = await run(callMetaApi("/phone-1/messages", "POST", "token", {}));

    expect(error).toBeInstanceOf(MetaHttpError);
    const detail = graphApiErrorDetail(error);
    expect(detail.httpStatus).toBe(502);
    expect(classifyWaFailure(detail.code, detail.httpStatus)).toBe(WaFailureClass.TRANSIENT);
  });

  it("classifies an empty 429 as transient", async () => {
    axiosMock.mockResolvedValue({ status: 429, data: "" });
    const { error } = await run(callMetaApi("/phone-1/messages", "POST", "token", {}));

    const detail = graphApiErrorDetail(error);
    expect(detail.httpStatus).toBe(429);
    expect(classifyWaFailure(detail.code, detail.httpStatus)).toBe(WaFailureClass.TRANSIENT);
  });

  it("keeps the status on a Graph error, without changing its verdict", async () => {
    axiosMock.mockResolvedValue({
      status: 400,
      data: { error: { code: 131026, message: "Message undeliverable" } },
    });
    const { error } = await run(callMetaApi("/phone-1/messages", "POST", "token", {}));

    expect(error).toBeInstanceOf(GraphApiError);
    const detail = graphApiErrorDetail(error);
    expect(detail).toMatchObject({ code: 131026, httpStatus: 400 });
    expect(classifyWaFailure(detail.code, detail.httpStatus)).toBe(WaFailureClass.PERMANENT);
  });
});
