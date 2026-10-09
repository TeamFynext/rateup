#!/usr/bin/env node
/**
 * Pushes the RateUp app (definition.mjs) to Make through its SDK Apps API.
 * Safe to run again: what exists is updated, what is missing is created.
 *
 *   MAKE_API_TOKEN=…  MAKE_ZONE=eu2  RATEUP_API_URL=https://… node make-app/deploy.mjs
 *   node make-app/deploy.mjs --print     # writes the generated components, calls nothing
 *
 * MAKE_API_TOKEN  a Make API token with the sdk-apps:read and sdk-apps:write scopes
 * MAKE_ZONE       the zone in your Make URL: eu1, eu2, us1 or us2
 * RATEUP_API_URL  the RateUp API's public address (your dev tunnel locally)
 * MAKE_APP_NAME   optional; the app's id in Make, default rateup-whatsapp
 */
import { buildApp } from "./definition.mjs";

const VERSION = 1;
const print = process.argv.includes("--print");
const apiUrl = process.env.RATEUP_API_URL;

if (!apiUrl && !print) fail("Set RATEUP_API_URL to the RateUp API's public https address.");
const app = buildApp(apiUrl ?? "https://api.example.com");

if (print) {
  console.log(JSON.stringify(app, null, 2));
  process.exit(0);
}

const token = process.env.MAKE_API_TOKEN;
const zone = process.env.MAKE_ZONE;
if (!token) fail("Set MAKE_API_TOKEN (Make → Profile → API access → Add token, sdk-apps scopes).");
if (!/^(eu|us)\d$/.test(zone ?? "")) fail("Set MAKE_ZONE to the zone in your Make URL, e.g. eu2.");
if (!apiUrl.startsWith("https://")) fail("RATEUP_API_URL must be https: Make will not call http.");

const MAKE = `https://${zone}.make.com/api/v2`;
let appName = process.env.MAKE_APP_NAME ?? "rateup-whatsapp";

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function call(method, path, body, contentType = "application/json") {
  const init = {
    method,
    headers: { authorization: `Token ${token}`, accept: "application/json" },
  };
  if (body !== undefined) {
    init.headers["content-type"] = contentType;
    init.body = JSON.stringify(body);
  }
  const response = await fetch(`${MAKE}${path}`, init);
  const text = await response.text();
  const data = text ? safeJson(text) : null;
  if (!response.ok) {
    const error = new Error(`${method} ${path} → ${response.status}: ${text.slice(0, 500)}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Make wraps lists as `{ appModules: [...] }`, `{ appWebhooks: [...] }`, …: the one array in the body. */
const listOf = (data) => Object.values(data ?? {}).find(Array.isArray) ?? [];
/** …and single records as `{ appModule: {...} }`. */
const recordOf = (data) =>
  Object.values(data ?? {}).find((v) => v && typeof v === "object" && !Array.isArray(v)) ?? {};

/** Sets one section of a component; sections are sent as JSON. */
const setSection = (path, content) => call("PUT", path, content, "application/jsonc");

async function ensureApp() {
  try {
    await call("GET", `/sdk/apps/${appName}/${VERSION}`);
    console.log(`• app ${appName} exists`);
  } catch (error) {
    if (error.status !== 404) throw error;
    const created = recordOf(
      await call("POST", "/sdk/apps", { name: appName, ...app.app, version: VERSION }),
    );
    appName = created.name ?? appName;
    console.log(`+ app ${appName} created`);
  }
  await setSection(`/sdk/apps/${appName}/${VERSION}/base`, app.base);
  console.log("  base set");
}

async function ensureConnection() {
  const existing = listOf(await call("GET", `/sdk/apps/${appName}/connections`)).find(
    (c) => c.label === app.connection.label,
  );
  const name =
    existing?.name ??
    recordOf(
      await call("POST", `/sdk/apps/${appName}/connections`, {
        type: app.connection.type,
        label: app.connection.label,
      }),
    ).name;
  console.log(`${existing ? "•" : "+"} connection ${name}`);
  await setSection(`/sdk/apps/connections/${name}/parameters`, app.connection.parameters);
  await setSection(`/sdk/apps/connections/${name}/api`, app.connection.api);
  return name;
}

async function ensureRpcs(connection) {
  const existing = new Set(
    listOf(await call("GET", `/sdk/apps/${appName}/${VERSION}/rpcs`)).map((r) => r.name),
  );
  for (const rpc of app.rpcs) {
    if (!existing.has(rpc.name)) {
      await call("POST", `/sdk/apps/${appName}/${VERSION}/rpcs`, {
        name: rpc.name,
        label: rpc.label,
        connection,
      });
    }
    await setSection(`/sdk/apps/${appName}/${VERSION}/rpcs/${rpc.name}/api`, rpc.api);
    console.log(`${existing.has(rpc.name) ? "•" : "+"} rpc ${rpc.name}`);
  }
}

/** Returns each trigger event's webhook name. */
async function ensureWebhooks(connection) {
  const existing = listOf(await call("GET", `/sdk/apps/${appName}/webhooks`));
  const names = {};
  for (const hook of app.webhooks) {
    const found = existing.find((w) => w.label === hook.label);
    const name =
      found?.name ??
      recordOf(
        await call("POST", `/sdk/apps/${appName}/webhooks`, {
          type: hook.type,
          label: hook.label,
          connection,
        }),
      ).name;
    for (const section of ["api", "parameters", "attach", "detach"]) {
      await setSection(`/sdk/apps/webhooks/${name}/${section}`, hook[section]);
    }
    names[hook.event] = name;
    console.log(`${found ? "•" : "+"} webhook ${name} (${hook.event})`);
  }
  return names;
}

async function ensureModules(connection, webhookNames) {
  const existing = new Set(
    listOf(await call("GET", `/sdk/apps/${appName}/${VERSION}/modules`)).map((m) => m.name),
  );
  for (const module of app.modules) {
    const path = `/sdk/apps/${appName}/${VERSION}/modules`;
    const link = module.webhookEvent
      ? { webhook: webhookNames[module.webhookEvent] }
      : { connection };
    if (existing.has(module.name)) {
      await call("PATCH", `${path}/${module.name}`, {
        label: module.label,
        description: module.description,
      });
    } else {
      await call("POST", path, {
        name: module.name,
        typeId: module.typeId,
        label: module.label,
        description: module.description,
        moduleInitMode: "blank",
        ...link,
      });
    }
    for (const section of ["api", "parameters", "expect", "interface", "samples"]) {
      await setSection(`${path}/${module.name}/${section}`, module[section]);
    }
    console.log(`${existing.has(module.name) ? "•" : "+"} module ${module.name}`);
  }
}

async function setGroups() {
  try {
    await setSection(`/sdk/apps/${appName}/${VERSION}/groups`, app.groups);
    console.log("  groups set");
  } catch (error) {
    // Grouping only orders the module list in Make's picker.
    console.warn(`! groups not set (${error.message}); the modules are all there regardless`);
  }
}

try {
  console.log(`Deploying to ${MAKE}, RateUp API ${apiUrl}`);
  await ensureApp();
  const connection = await ensureConnection();
  await ensureRpcs(connection);
  const webhookNames = await ensureWebhooks(connection);
  await ensureModules(connection, webhookNames);
  await setGroups();
  console.log(`\n✓ Done. In Make: Development tools → Custom apps → ${appName}.`);
} catch (error) {
  fail(error.message);
}
