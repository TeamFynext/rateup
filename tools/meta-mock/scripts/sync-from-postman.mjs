#!/usr/bin/env node
/**
 * Regenerate the fake Graph API's fixtures from Meta's own Postman collection.
 *
 *   node scripts/sync-from-postman.mjs                 # download the latest and write fixtures
 *   node scripts/sync-from-postman.mjs --file c.json   # use a collection already on disk
 *   node scripts/sync-from-postman.mjs --check         # fail if the fixtures are out of date
 *
 * Why generate rather than hand-write: `src/server.mjs` stands in
 * for the Graph API, and a stand-in is only useful if it answers in the shapes
 * the real thing answers in. Meta publishes those shapes as saved example
 * responses in the "WhatsApp Cloud API" collection, so the responses this stub
 * returns are Meta's, not a guess at what Meta returns — and when the API moves,
 * re-running this picks the change up instead of the suite quietly testing
 * against a stale idea of Graph.
 *
 * It also lifts the webhook payloads out of the "Webhook Payload Reference"
 * folder, which is what lets the stub drive *inbound* WhatsApp events — the
 * half of the integration that has no Graph endpoint to call at all.
 *
 * Source: https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderRoutesDoc } from "./write-routes-doc.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "graph-fixtures.json");
const DOC = path.join(HERE, "..", "ROUTES.md");

/**
 * Meta's public collections, resolved through Postman's own search API.
 *
 * Both matter, and they overlap: `POST /{id}/messages` exists in each and
 * answers with a completely different body — WhatsApp with a `messages[]`
 * envelope, Instagram with `{ recipient_id, message_id }`. Each route is
 * therefore tagged with the API it came from, and the matcher tells them apart
 * from the request body (see `apiOf` below).
 */
const SOURCES = [
  {
    api: "whatsapp",
    label: "WhatsApp Cloud API",
    uid: "13382743-84d01ff8-4253-4720-b454-af661f36acc2",
    owner: "13382743",
    page: "https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api",
  },
  {
    api: "instagram",
    label: "Instagram API",
    uid: "23987686-9386f468-7714-490f-9bfc-9442db5c8f00",
    owner: "23987686",
    page: "https://www.postman.com/meta/instagram/collection/23987686-9386f468-7714-490f-9bfc-9442db5c8f00",
  },
];

const collectionUrl = ({ uid, owner }) =>
  `https://www.postman.com/_api/collection/${uid}?owner=${owner}&populate=true`;

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");

/** `--file whatsapp=a.json --file instagram=b.json`, or one bare `--file x.json`. */
function fileOverrides() {
  const overrides = {};
  args.forEach((arg, index) => {
    if (arg !== "--file") return;
    const value = args[index + 1];
    if (!value) throw new Error("--file needs a path");
    const [maybeApi, ...rest] = value.split("=");
    if (rest.length > 0) overrides[maybeApi] = rest.join("=");
    else overrides[SOURCES[0].api] = value;
  });
  return overrides;
}

/* ------------------------------------------------------------------ *
 * Loading
 * ------------------------------------------------------------------ */

async function loadCollection(source, overrides) {
  const override = overrides[source.api];
  if (override) {
    console.log(`[sync] reading ${source.label} from ${override}`);
    return JSON.parse(fs.readFileSync(override, "utf8"));
  }

  console.log(`[sync] downloading the ${source.label} collection`);
  const response = await fetch(collectionUrl(source), {
    headers: { accept: "application/json", "user-agent": "meta-mock-sync" },
  });
  if (!response.ok) {
    throw new Error(
      `could not download ${source.label}: HTTP ${response.status}. ` +
        `Export it from Postman and pass --file ${source.api}=<path> instead.`,
    );
  }
  return response.json();
}

/* ------------------------------------------------------------------ *
 * Normalising a Postman request into a route the stub can match
 * ------------------------------------------------------------------ */

/**
 * Turn a collection URL into a matchable path pattern.
 *
 * `https://graph.facebook.com/{{Version}}/{{WABA-ID}}/flows` becomes
 * `/:id/flows`: the origin and the version prefix are stripped (the stub strips
 * them from incoming requests too), and every `{{Variable}}` becomes a
 * single-segment wildcard. Every id-shaped variable collapses to the same `:id`
 * because the stub cannot tell a WABA id from a phone number id by looking at
 * it — and neither can Graph, from the path alone.
 */
/** `{{Version}}`, `{{api_version}}`, `v23.0` — all the ways a version segment appears. */
const VERSION_SEGMENT = /^(\{\{\s*[\w-]*version[\w-]*\s*\}\}|v\d+\.\d+)$/i;

function toPattern(rawUrl) {
  if (!rawUrl) return null;

  const withoutOrigin = String(rawUrl)
    .replace(/^https?:\/\/[^/]+/, "")
    .split("#")[0];
  const [pathPart, queryPart = ""] = withoutOrigin.split("?");

  const segments = pathPart
    .split("/")
    .filter(Boolean)
    /**
     * Drop the API version, however that collection spells it.
     *
     * The two collections disagree: WhatsApp writes `{{Version}}`, Instagram
     * writes `{{api_version}}`, and some requests hardcode `v23.0`. Matching
     * only the first spelling leaves every Instagram path with a spurious
     * leading `:id` — `/:id/:id/messages` — which then matches no real request
     * at all, so the fixtures look present and never fire.
     */
    .filter((segment, index) => !(index === 0 && VERSION_SEGMENT.test(segment)))
    .map((segment) => (/\{\{.+\}\}|^<.+>$/.test(segment) ? ":id" : segment));

  return {
    path: `/${segments.join("/")}`,
    /** Query keys that distinguish otherwise identical paths (e.g. ?fields=preview). */
    query: queryPart
      ? Object.fromEntries(
          queryPart
            .split("&")
            .filter(Boolean)
            .map((pair) => {
              const [key, ...rest] = pair.split("=");
              return [key, rest.join("=")];
            }),
        )
      : {},
  };
}

/**
 * The part of the query string that selects between routes sharing a path.
 *
 * Only `fields` does that on Graph, and only its leading token: `preview`
 * distinguishes a flow preview from the flow itself, `analytics` distinguishes
 * an analytics read from a plain node read. Everything after the first `.`,
 * `,` or `(` is arguments to that field, not a different endpoint.
 */
function selector(query) {
  const fields = query.fields;
  if (!fields) return "";
  const first = decodeURIComponent(fields).split(/[.,(]/)[0].trim();
  return first ? `fields=${first}` : "";
}

/** The example response worth keeping: a success one, else the first. */
function pickExample(request) {
  const responses = request.responses ?? [];
  if (responses.length === 0) return null;

  const ok =
    responses.find((response) => {
      const code = response.responseCode?.code ?? response.code;
      return code >= 200 && code < 300;
    }) ?? responses[0];

  let body = null;
  try {
    body = ok.text ? JSON.parse(ok.text) : null;
  } catch {
    // A few examples are prose or HTML rather than JSON; those are no use as a
    // canned response, so they are dropped rather than returned as a string.
    body = null;
  }

  return body === null
    ? null
    : { status: ok.responseCode?.code ?? ok.code ?? 200, body, name: ok.name };
}

/* ------------------------------------------------------------------ *
 * Extraction
 * ------------------------------------------------------------------ */

function extract(collection, source) {
  const data = collection.data ?? collection;
  const folders = data.folders ?? [];
  const requests = data.requests ?? [];

  if (requests.length === 0) {
    throw new Error("the collection has no requests — is this the right export?");
  }

  const foldersById = Object.fromEntries(folders.map((folder) => [folder.id, folder]));
  const folderPath = (folder) => {
    const parts = [];
    let current = folder;
    let depth = 0;
    while (current && depth++ < 8) {
      parts.unshift(current.name);
      current = foldersById[current.folder];
    }
    return parts.join(" / ");
  };

  const routes = [];
  const webhooks = [];
  /** Requests the collection documents but saves no usable example for. */
  const dropped = [];

  for (const request of requests) {
    const where = request.folder ? folderPath(foldersById[request.folder]) : "";

    // The "Webhook Payload Reference" entries are not requests to Graph — they
    // are the notifications Graph sends *to us*, parked in the collection as
    // request bodies. They become the stub's webhook catalogue.
    // Both collections park their notification payloads in a folder; the
    // WhatsApp one capitalises it, the Instagram one does not.
    if (/webhook payload reference/i.test(where)) {
      let payload = null;
      try {
        payload = request.rawModeData ? JSON.parse(request.rawModeData) : null;
      } catch {
        payload = null;
      }
      if (payload) {
        webhooks.push({ api: source.api, name: request.name, folder: where, payload });
      }
      continue;
    }

    const pattern = toPattern(request.url);
    if (!pattern) continue;

    const example = pickExample(request);
    if (!example) {
      dropped.push({
        api: source.api,
        method: String(request.method ?? "GET").toUpperCase(),
        path: pattern.path,
        name: request.name,
        folder: where,
      });
      continue;
    }

    routes.push({
      api: source.api,
      method: String(request.method ?? "GET").toUpperCase(),
      path: pattern.path,
      /**
       * What distinguishes two requests to the same path.
       *
       * `GET /:id` appears seventeen times — as a flow, a phone number, a
       * preview, an analytics query — separated only by `?fields=`. The leading
       * token of that value is what picks between them.
       */
      select: selector(pattern.query),
      name: request.name,
      folder: where,
      status: example.status,
      response: example.body,
    });
  }

  // Collapse the variants.
  //
  // The collection carries fifty-one `POST /:id/messages` entries — one per
  // message type — and Graph answers all of them with the same envelope, so
  // keeping fifty-one copies of that envelope would bloat the fixtures without
  // making the stub answer anything differently. One is kept and the rest are
  // recorded by name, which is also the readable index of what Cloud API can
  // send.
  const merged = new Map();
  for (const route of routes) {
    const key = `${route.api} ${route.method} ${route.path} ${route.select}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...route, variants: [] });
    } else if (existing.name !== route.name) {
      existing.variants.push(route.name);
    }
  }

  routes.length = 0;
  for (const route of merged.values()) {
    route.variants.sort();
    routes.push(route);
  }

  // Deterministic order: the file is committed, so it must not churn.
  return { routes, webhooks, dropped };
}

/** Stable order — the file is committed, so it must not churn between runs. */
function sortFixtures(routes, webhooks) {
  routes.sort(
    (a, b) =>
      a.path.localeCompare(b.path) ||
      a.method.localeCompare(b.method) ||
      a.select.localeCompare(b.select) ||
      a.api.localeCompare(b.api),
  );
  webhooks.sort((a, b) => a.api.localeCompare(b.api) || a.name.localeCompare(b.name));
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const overrides = fileOverrides();

const routes = [];
const webhooks = [];
const dropped = [];
const collections = [];

for (const source of SOURCES) {
  const collection = await loadCollection(source, overrides);
  const data = collection.data ?? collection;
  const extracted = extract(collection, source);

  routes.push(...extracted.routes);
  webhooks.push(...extracted.webhooks);
  dropped.push(...extracted.dropped);
  collections.push({
    api: source.api,
    name: data.name ?? source.label,
    page: source.page,
    updatedAt: data.updatedAt ?? null,
    routes: extracted.routes.length,
    webhooks: extracted.webhooks.length,
    dropped: extracted.dropped.length,
  });

  console.log(
    `[sync]   ${source.label}: ${extracted.routes.length} routes, ` +
      `${extracted.webhooks.length} webhook payloads`,
  );
}

sortFixtures(routes, webhooks);

// A notification name only has to be unique within its own API — "Messaging
// webhook" could plausibly appear in both — so anything ambiguous is qualified.
const nameCounts = {};
for (const hook of webhooks) nameCounts[hook.name] = (nameCounts[hook.name] ?? 0) + 1;
for (const hook of webhooks) {
  hook.qualifiedName = nameCounts[hook.name] > 1 ? `${hook.api}:${hook.name}` : hook.name;
}

const fixtures = {
  $comment:
    "GENERATED by scripts/sync-from-postman.mjs from Meta's published Postman collections. " +
    "Do not edit by hand — re-run the script.",
  collections,
  routes,
  webhooks,
};

dropped.sort(
  (a, b) => a.api.localeCompare(b.api) || a.path.localeCompare(b.path) || a.name.localeCompare(b.name),
);

const serialised = `${JSON.stringify(fixtures, null, 2)}\n`;
const doc = renderRoutesDoc({ collections, routes, webhooks, dropped });

const collisions = new Set();
const byPath = {};
for (const route of routes) {
  const key = `${route.method} ${route.path} ${route.select}`;
  if (byPath[key] && byPath[key] !== route.api) collisions.add(key);
  byPath[key] = route.api;
}

console.log(
  `[sync] ${routes.length} routes, ${webhooks.length} webhook payloads, ` +
    `${collisions.size} shared by both APIs`,
);
for (const key of collisions) console.log(`[sync]   shared: ${key}`);

if (checkOnly) {
  const currentDoc = fs.existsSync(DOC) ? fs.readFileSync(DOC, "utf8") : "";
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== serialised || currentDoc !== doc) {
    console.error(
      "[sync] graph-fixtures.json is out of date — run `node scripts/sync-from-postman.mjs`",
    );
    process.exit(1);
  }
  console.log("[sync] fixtures are up to date");
} else {
  fs.writeFileSync(OUT, serialised);
  fs.writeFileSync(DOC, doc);
  console.log(
    `[sync] wrote ${path.relative(process.cwd(), OUT)} and ${path.relative(process.cwd(), DOC)}`,
  );
}
