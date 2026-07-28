import { createServer } from "node:http";

import { fallbackResponse, fixtures, matchFixture, stripVersion } from "./fixtures.mjs";
import { createGraphRoutes } from "./graph-routes.mjs";
import { runStatusProgression, statusPayload } from "./status-progression.mjs";
import { listWebhooks, replayWebhook } from "./webhooks.mjs";

/**
 * A local stand-in for Meta's Graph API.
 *
 * Requests are answered in three layers, and `/__stub/calls` reports which one
 * answered:
 *
 *   1. **stateful handlers** — flows and templates behave, because a canned
 *      example cannot model "created, then listed, then published";
 *   2. **fixtures** — Meta's own saved example response for that route,
 *      generated from its published Cloud API collection;
 *   3. **fallback** — a generic Graph-shaped answer, marked `matched: false`
 *      so unmapped calls stay visible instead of being papered over.
 *
 * Every request is recorded, which is what turns the mock into an assertion
 * surface: a test can check the payload that *would* have gone to Meta without
 * sending it.
 */
export function createMetaMock(options = {}) {
  const port = Number(options.port ?? process.env.META_MOCK_PORT ?? 3099);
  const host = options.host ?? process.env.META_MOCK_HOST ?? "127.0.0.1";
  const verbose = options.verbose ?? process.env.META_MOCK_VERBOSE === "1";

  /**
   * Which API wins on the endpoints WhatsApp and Instagram share, when the
   * request body gives nothing away (a GET, mostly). WhatsApp by default —
   * it is the dominant integration and the one with stateful handlers.
   */
  const defaultApi = options.defaultApi ?? process.env.META_MOCK_DEFAULT_API ?? "whatsapp";

  /** Where replayed webhooks are delivered. */
  const webhookTarget =
    options.webhookUrl ??
    process.env.META_MOCK_WEBHOOK_URL ??
    "http://localhost:3001/api/wa/webhook";

  /**
   * Deliver sent → delivered → read after each send.
   *
   * Off by default: firing webhooks at an external URL as a side effect of a
   * request is a surprise, and suites that only assert on the outbound payload
   * do not want it. The `whatsapp-mock-api` server this replaces did it
   * unconditionally, which is why message-dispatcher's dev setup expects it.
   */
  const statusProgression =
    options.statusProgression ?? process.env.META_MOCK_STATUS_PROGRESSION === "1";

  /** Identity stamped onto status callbacks, so the app can resolve the tenant. */
  const identity = {
    wabaId: options.wabaId ?? process.env.META_MOCK_WABA_ID ?? "",
    phoneNumberId: options.phoneNumberId ?? process.env.META_MOCK_PHONE_NUMBER_ID ?? "",
    displayPhoneNumber:
      options.displayPhoneNumber ?? process.env.META_MOCK_DISPLAY_PHONE_NUMBER ?? "",
  };

  /** Chance a send fails after `sent`. Zero by default — a test cannot assert on dice. */
  const failureRate = Number(options.failureRate ?? process.env.META_MOCK_FAILURE_RATE ?? 0);
  const statusDelays = options.statusDelays;

  /** Statuses in flight, so `close()` does not leave timers behind. */
  const pending = new Set();

  const startedAt = Date.now();

  /** Every request this mock has answered, oldest first. */
  const calls = [];
  const state = { flows: new Map(), templates: new Map() };

  let nextId = 1;
  /** Graph ids are numeric strings; keep that shape so nothing downstream trips. */
  const mintId = () => String(100000000000000 + nextId++);

  let listening = null;
  const publicUrl = () => `http://${host}:${listening?.port ?? port}`;

  const rules = createGraphRoutes({
    state,
    mintId,
    publicUrl,
    onMessageSent: ({ messageId, recipientId, phoneNumberId }) => {
      if (!statusProgression) return;

      const run = runStatusProgression({
        messageId,
        recipientId,
        target: webhookTarget,
        identity: { ...identity, phoneNumberId: identity.phoneNumberId || phoneNumberId },
        delays: statusDelays,
        failureRate,
        log: (line) => verbose && console.log(`[meta-mock] ${line}`),
      }).finally(() => pending.delete(run));

      pending.add(run);
    },
  });

  /* ---------------------------------------------------------------- *
   * Plumbing
   * ---------------------------------------------------------------- */

  const readBody = (req) =>
    new Promise((resolve) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", () => resolve(Buffer.alloc(0)));
    });

  const parseBody = (raw, contentType = "") => {
    if (raw.length === 0) return undefined;
    if (contentType.includes("multipart")) return "<multipart>";
    const text = raw.toString("utf8");
    try {
      return JSON.parse(text);
    } catch {
      return text.slice(0, 2000);
    }
  };

  const send = (res, status, payload) => {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(body),
    });
    res.end(body);
  };

  /* ---------------------------------------------------------------- *
   * Control plane
   * ---------------------------------------------------------------- */

  async function handleControl(req, res, url, rawBody) {
    if (!url.pathname.startsWith("/__stub/")) return false;

    if (url.pathname === "/__stub/health") {
      send(res, 200, {
        ok: true,
        calls: calls.length,
        flows: state.flows.size,
        templates: state.templates.size,
        routes: fixtures.routes.length,
        webhooks: fixtures.webhooks.length,
        statusProgression,
        collections: fixtures.collections,
        uptimeMs: Date.now() - startedAt,
      });
      return true;
    }

    if (url.pathname === "/__stub/calls") {
      const since = Number(url.searchParams.get("since") ?? 0);
      const pathFilter = url.searchParams.get("path");
      const methodFilter = url.searchParams.get("method");
      const selected = calls
        .slice(Number.isFinite(since) ? since : 0)
        .filter((call) => (pathFilter ? call.path.includes(pathFilter) : true))
        .filter((call) => (methodFilter ? call.method === methodFilter.toUpperCase() : true));
      send(res, 200, { total: calls.length, calls: selected });
      return true;
    }

    if (url.pathname === "/__stub/routes") {
      send(res, 200, {
        collections: fixtures.collections,
        routes: fixtures.routes.map((route) => ({
          api: route.api,
          method: route.method,
          path: route.path,
          select: route.select,
          name: route.name,
          folder: route.folder,
          variants: route.variants?.length ?? 0,
        })),
      });
      return true;
    }

    if (url.pathname === "/__stub/webhooks") {
      send(res, 200, { target: webhookTarget, webhooks: listWebhooks() });
      return true;
    }

    if (url.pathname === "/__stub/webhook" && req.method === "POST") {
      const request = parseBody(rawBody, req.headers["content-type"] ?? "") ?? {};
      if (!request.name) {
        send(res, 400, {
          error: 'POST /__stub/webhook needs { "name": "<payload name>" }',
          available: listWebhooks().map((entry) => entry.name),
        });
        return true;
      }
      const result = await replayWebhook({ target: webhookTarget, ...request });
      send(res, result.ok ? 200 : 502, result);
      return true;
    }

    /* Fire one status by hand, for the cases progression does not cover. */
    if (url.pathname === "/__stub/status" && req.method === "POST") {
      const request = parseBody(rawBody, req.headers["content-type"] ?? "") ?? {};
      if (!request.messageId || !request.status) {
        send(res, 400, {
          error: 'POST /__stub/status needs { "messageId": "...", "status": "delivered" }',
          statuses: ["sent", "delivered", "read", "failed"],
        });
        return true;
      }

      const payload = statusPayload({ ...identity, ...request });
      try {
        const response = await fetch(webhookTarget, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        send(res, response.ok ? 200 : 502, {
          ok: response.ok,
          status: response.status,
          target: webhookTarget,
          payload,
        });
      } catch (error) {
        send(res, 502, { ok: false, error: error.message, payload });
      }
      return true;
    }

    if (url.pathname === "/__stub/reset" && req.method === "POST") {
      reset();
      send(res, 200, { ok: true });
      return true;
    }

    /* Flow JSON and preview URLs the mock hands out point back here. */
    if (url.pathname.startsWith("/__stub/flow-json/")) {
      const id = url.pathname.split("/").pop();
      send(res, 200, state.flows.get(id)?.json ?? { version: "7.2", screens: [] });
      return true;
    }
    if (url.pathname.startsWith("/__stub/preview/")) {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<!doctype html><title>mock flow preview</title><p>mock flow preview</p>");
      return true;
    }

    send(res, 404, { error: { message: `no control route ${url.pathname}` } });
    return true;
  }

  /* ---------------------------------------------------------------- *
   * Request handling
   * ---------------------------------------------------------------- */

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, publicUrl());

    const raw = await readBody(req);
    if (await handleControl(req, res, url, raw)) return;

    const body = parseBody(raw, req.headers["content-type"] ?? "");
    const requestPath = stripVersion(url.pathname);
    const query = Object.fromEntries(url.searchParams);
    const method = req.method.toUpperCase();

    const rule = rules.find((candidate) => {
      if (candidate.method !== method) return false;
      const match = candidate.match.exec(requestPath);
      if (!match) return false;
      if (!candidate.when) return true;
      return candidate.when({ query: { ...query, __params: match.groups ?? {} }, body });
    });

    const fixture = rule ? null : matchFixture(method, requestPath, query, { body, defaultApi });

    let status = 200;
    let payload;
    let source = "fallback";

    try {
      if (rule) {
        const params = rule.match.exec(requestPath).groups ?? {};
        payload = rule.handle({ params, query, body, raw, method, path: requestPath });
        source = "handler";
      } else if (fixture) {
        payload = fixture.response;
        status = fixture.status ?? 200;
        source = "fixture";
      } else {
        payload = fallbackResponse(method, mintId);
      }
    } catch (error) {
      status = 500;
      payload = { error: { message: `mock handler threw: ${error.message}`, type: "MockError" } };
    }

    calls.push({
      at: new Date().toISOString(),
      method,
      path: requestPath,
      rawPath: url.pathname,
      query,
      body,
      matched: source !== "fallback",
      source,
      /** Which collection request answered this, when a fixture did. */
      fixture: fixture ? fixture.name : null,
      /** Which API answered — "whatsapp" or "instagram". */
      api: fixture ? fixture.api : rule ? "whatsapp" : null,
      status,
    });

    if (verbose) {
      const tag = source === "fixture" ? `${fixture.api} fixture: ${fixture.name}` : source;
      console.log(`[meta-mock] ${method} ${requestPath} -> ${status} (${tag})`);
    }

    send(res, status, payload);
  });

  function reset() {
    calls.length = 0;
    state.flows.clear();
    state.templates.clear();
  }

  return {
    /** Start listening. Resolves once the port is bound. */
    async listen() {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, resolve);
      });
      listening = server.address();
      return this;
    },

    /** Stop listening and release the port. */
    async close() {
      // Let in-flight status callbacks finish, so they do not fire into a
      // closed test or keep the process alive.
      await Promise.allSettled([...pending]);
      await new Promise((resolve) => server.close(resolve));
      listening = null;
    },

    get url() {
      return publicUrl();
    },
    get port() {
      return listening?.port ?? port;
    },

    /** Everything the mock has answered, for assertions. */
    calls: (filter = {}) =>
      calls
        .slice(filter.since ?? 0)
        .filter((call) => (filter.path ? call.path.includes(filter.path) : true))
        .filter((call) =>
          filter.method ? call.method === String(filter.method).toUpperCase() : true,
        ),

    /** How this instance is configured — the CLI prints it so the mode is never a guess. */
    config: {
      statusProgression,
      webhookUrl: webhookTarget,
      failureRate,
      wabaId: identity.wabaId,
      phoneNumberId: identity.phoneNumberId,
      displayPhoneNumber: identity.displayPhoneNumber,
      defaultApi,
    },

    reset,
    replayWebhook: (request) => replayWebhook({ target: webhookTarget, ...request }),
    webhooks: listWebhooks,
    fixtures,
    server,
  };
}
