import { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import { swaggerConfig } from "../config.js";
import { envFlag } from "../utils/envFlag.js";

/**
 * The spec is the partner API's contract, so it is always generated and always served as
 * JSON — an integrator should not need us to redeploy with a flag set before they can see
 * what they are integrating against. Each partner API version has its own document.
 *
 * The whole surface (dashboard routes included) is internal: `/api/openapi.json` and the
 * reference's "Internal" document exist only when running locally.
 *
 * The browsable Scalar UI stays behind `API_DOCS_ENABLED=true`, since that is the part with a cost. It
 * offers the versions as separate documents with a switcher, v2 first.
 */
export async function registerSwagger(server: FastifyInstance) {
  await server.register(swagger, swaggerConfig);

  // Exactly "development", the staff console's test for local: production leaves NODE_ENV
  // unset, so `config.nodeEnv` (which defaults to "development") would read as local there.
  const local = process.env.NODE_ENV === "development";

  if (local) {
    server.get(
      "/api/openapi.json",
      { schema: { hide: true }, config: { access: "public" } },
      async () => server.swagger(),
    );
  }

  // Built once per version from the full spec, on first request.
  for (const version of ["v1", "v2"] as const) {
    let spec: OpenApiDocument | undefined;
    server.get(
      `/api/external/${version}/openapi.json`,
      { schema: { hide: true }, config: { access: "public" } },
      async () => {
        spec ??= buildPartnerSpec(server.swagger() as OpenApiDocument, version);
        return spec;
      },
    );
  }

  if (envFlag("API_DOCS_ENABLED")) {
    await server.register(import("@scalar/fastify-api-reference"), {
      routePrefix: "/reference",
      configuration: {
        persistAuth: true,
        sources: [
          {
            title: "Partner API v2",
            slug: "v2",
            url: "/api/external/v2/openapi.json",
            default: true,
          },
          {
            title: "Partner API v1 (legacy)",
            slug: "v1",
            url: "/api/external/v1/openapi.json",
          },
          ...(local
            ? [{ title: "Internal (all routes)", slug: "internal", url: "/api/openapi.json" }]
            : []),
        ],
      },
    });
    server.log.trace("Swagger UI registered at /reference");
  }

  server.log.trace("OpenAPI specs available at /api/external/{v1,v2}/openapi.json");
}

interface OpenApiDocument {
  info?: Record<string, unknown>;
  paths?: Record<string, Record<string, { tags?: string[] }>>;
  tags?: { name: string; description?: string }[];
  [key: string]: unknown;
}

const PARTNER_VERSIONS = {
  v2: {
    prefix: "/api/external/v2/",
    title: "RateUp Partner API v2",
    description:
      "Authenticate with `Authorization: Bearer rk_live_…`; the key names your organisation, so " +
      "no org id goes in the path. Every error is `{ error: { code, message, details?, requestId } }`. " +
      "Lists are cursor-paged: pass `nextCursor` back as `cursor`. Writes accept an optional " +
      "`Idempotency-Key` header; send one on sends and loyalty writes, so a retry is replayed " +
      "instead of sending or awarding twice.",
  },
  v1: {
    prefix: "/api/external/v1/",
    title: "RateUp Partner API v1 (legacy)",
    description:
      "Kept for existing integrations; new work should use v2. Authenticate with " +
      "`Authorization: Bearer <v1 key>` and put your organisation id in the path. v1 keys do " +
      "not work on v2, nor v2 keys here.",
  },
} as const;

export function buildPartnerSpec(full: OpenApiDocument, version: keyof typeof PARTNER_VERSIONS) {
  const meta = PARTNER_VERSIONS[version];
  const paths = Object.fromEntries(
    Object.entries(full.paths ?? {}).filter(([path]) => path.startsWith(meta.prefix)),
  );
  const used = [
    ...new Set(
      Object.values(paths).flatMap((ops) => Object.values(ops).flatMap((op) => op.tags ?? [])),
    ),
  ];
  // v1's tags (Campaign, Team, …) are not in the catalogue in config.ts; list them bare
  // rather than drop them, so every operation still lands under a heading.
  const described = new Map((full.tags ?? []).map((tag) => [tag.name, tag]));
  return {
    ...full,
    info: {
      ...full.info,
      title: meta.title,
      version: version.slice(1),
      description: meta.description,
    },
    paths,
    tags: used.map((name) => described.get(name) ?? { name }),
  };
}
