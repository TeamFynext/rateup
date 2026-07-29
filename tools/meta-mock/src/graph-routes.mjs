/**
 * The endpoints that need to *behave*, not just answer.
 *
 * A canned example cannot model state: a flow created here has to turn up in
 * the next list, come back from a fetch by id, flip to PUBLISHED when
 * published, and disappear when deleted — otherwise "Sync" in the dashboard
 * shows something different from what the test just made. These handlers run
 * ahead of the fixtures for exactly that reason.
 *
 * Everything else is left to the fixtures deliberately. Graph has hundreds of
 * endpoints and this codebase drives a dozen; emulating the rest statefully
 * would be work with no caller and more surface to keep correct when Meta
 * changes it.
 */
export function createGraphRoutes({ state, mintId, publicUrl, onMessageSent }) {
  const { flows, templates } = state;

  return [
    /* ---- flows ---- */
    {
      method: "POST",
      match: /^\/(?<wabaId>\d+)\/flows$/,
      handle: ({ body }) => {
        // A clone names the flow it is copying; a create does not.
        const id = mintId();
        const source = body?.clone_flow_id ? flows.get(String(body.clone_flow_id)) : null;
        flows.set(id, {
          id,
          name: body?.name ?? source?.name ?? "Untitled flow",
          status: "DRAFT",
          categories: body?.categories ?? source?.categories ?? ["OTHER"],
          validation_errors: [],
          json: source?.json ?? null,
        });
        return { id, success: true };
      },
    },
    {
      method: "GET",
      match: /^\/(?<wabaId>\d+)\/flows$/,
      handle: () => ({
        data: [...flows.values()].map(({ json: _json, ...flow }) => flow),
        paging: { cursors: { before: "", after: "" } },
      }),
    },
    {
      method: "POST",
      match: /^\/(?<flowId>\d+)\/publish$/,
      handle: ({ params }) => {
        const flow = flows.get(params.flowId);
        if (flow) flow.status = "PUBLISHED";
        return { success: true };
      },
    },
    {
      method: "POST",
      match: /^\/(?<flowId>\d+)\/deprecate$/,
      handle: ({ params }) => {
        const flow = flows.get(params.flowId);
        if (flow) flow.status = "DEPRECATED";
        return { success: true };
      },
    },
    {
      /* The flow JSON upload — multipart, and the one caller that uses raw
         axios rather than callMetaApi (flow.service.ts `updateFlowJsonInWa`). */
      method: "POST",
      match: /^\/(?<flowId>\d+)\/assets$/,
      handle: ({ params, raw }) => {
        const flow = flows.get(params.flowId);
        if (flow) flow.json = raw;
        return { success: true };
      },
    },
    {
      method: "GET",
      match: /^\/(?<flowId>\d+)\/assets$/,
      handle: ({ params }) => ({
        data: [
          {
            name: "flow.json",
            asset_type: "FLOW_JSON",
            download_url: `${publicUrl()}/__stub/flow-json/${params.flowId}`,
          },
        ],
      }),
    },
    {
      /* Both "get one flow" and "get its preview" are a GET on the bare id; the
         preview form asks for it with ?fields=preview. */
      method: "GET",
      match: /^\/(?<flowId>\d+)$/,
      when: ({ query }) => flows.has(query.__params.flowId),
      handle: ({ params, query }) => {
        const { json: _json, ...flow } = flows.get(params.flowId);
        if (String(query.fields ?? "").includes("preview")) {
          return {
            id: flow.id,
            preview: {
              preview_url: `${publicUrl()}/__stub/preview/${flow.id}`,
              expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
            },
          };
        }
        return flow;
      },
    },
    {
      method: "DELETE",
      match: /^\/(?<flowId>\d+)$/,
      when: ({ query }) => flows.has(query.__params.flowId),
      handle: ({ params }) => {
        flows.delete(params.flowId);
        return { success: true };
      },
    },
    {
      /* Metadata update (name, categories, endpoint_uri) — a POST on the id. */
      method: "POST",
      match: /^\/(?<flowId>\d+)$/,
      when: ({ query }) => flows.has(query.__params.flowId),
      handle: ({ params, body }) => {
        const flow = flows.get(params.flowId);
        if (body?.name) flow.name = body.name;
        if (body?.categories) flow.categories = body.categories;
        return { success: true };
      },
    },

    /* ---- message templates ---- */
    {
      method: "POST",
      match: /^\/(?<wabaId>\d+)\/message_templates$/,
      handle: ({ body }) => {
        const id = mintId();
        templates.set(id, {
          id,
          name: body?.name ?? `template_${id}`,
          language: body?.language ?? "en",
          category: body?.category ?? "MARKETING",
          /* Real templates sit in PENDING until Meta reviews them; APPROVED is
             the state a dashboard can actually do something with. */
          status: "APPROVED",
          components: body?.components ?? [],
        });
        return { id, status: "APPROVED", category: body?.category ?? "MARKETING" };
      },
    },
    {
      method: "GET",
      match: /^\/(?<wabaId>\d+)\/message_templates$/,
      handle: ({ query }) => {
        const all = [...templates.values()];
        const wanted = query.name ? all.filter((t) => t.name === query.name) : all;
        return { data: wanted, paging: { cursors: { before: "", after: "" } } };
      },
    },
    {
      method: "DELETE",
      match: /^\/(?<wabaId>\d+)\/message_templates$/,
      handle: ({ query }) => {
        if (query.hsm_id) templates.delete(query.hsm_id);
        else for (const [id, t] of templates) if (t.name === query.name) templates.delete(id);
        return { success: true };
      },
    },
    {
      method: "POST",
      match: /^\/(?<templateId>\d+)$/,
      when: ({ query }) => templates.has(query.__params.templateId),
      handle: ({ params, body }) => {
        const template = templates.get(params.templateId);
        if (body?.category) template.category = body.category;
        if (body?.components) template.components = body.components;
        return { success: true };
      },
    },

    /* ---- outbound messages: the one path that would reach a real person ---- *
     *
     * Two endpoints, one behaviour. Marketing template sends go to
     * `/{phone-number-id}/marketing_messages` (Meta's MM Lite API) rather than
     * `/messages`, and answer with the same envelope — message-dispatcher picks
     * between them on the template's category.
     *
     * Matching only `/messages` is a quiet failure with two heads: no status
     * callbacks fire, *and* the generic fallback answers without a
     * `messages[0].id`, so the caller stores an undefined message id and could
     * never match a status to it later even if one arrived.
     */
    {
      method: "POST",
      match: /^\/(?<phoneId>\d+)\/(?<endpoint>messages|marketing_messages)$/,
      handle: ({ body, params }) => {
        const messageId = `wamid.STUB${mintId()}`;
        const recipientId = body?.to ?? "";

        // A real send is answered immediately and *then* produces sent →
        // delivered → read callbacks. Detached on purpose, so the response goes
        // back first, the way an integration actually sees it.
        onMessageSent?.({ messageId, recipientId, phoneNumberId: params.phoneId });

        return {
          messaging_product: "whatsapp",
          contacts: [{ input: recipientId, wa_id: recipientId }],
          messages: [{ id: messageId }],
        };
      },
    },

    /* ---- resumable uploads: two steps, the second keyed by the first ---- */
    {
      method: "POST",
      match: /^\/(?<appId>\d+)\/uploads$/,
      handle: () => ({ id: `upload:${mintId()}` }),
    },
    {
      method: "POST",
      match: /^\/upload:(?<sessionId>[\w-]+)$/,
      handle: () => ({ h: `stub-file-handle-${mintId()}` }),
    },

    /* ---- encryption keys for flows ---- */
    {
      method: "GET",
      match: /^\/(?<phoneId>\d+)\/whatsapp_business_encryption$/,
      handle: () => ({
        data: [
          {
            business_public_key: "stub-public-key",
            business_public_key_signature_status: "VALID",
          },
        ],
      }),
    },
    {
      method: "POST",
      match: /^\/(?<phoneId>\d+)\/whatsapp_business_encryption$/,
      handle: () => ({ success: true }),
    },

    /* ---- catalogs ---- */
    {
      method: "GET",
      match: /^\/(?<wabaId>\d+)\/product_catalogs$/,
      handle: () => ({ data: [] }),
    },
    {
      method: "POST",
      match: /^\/(?<catalogId>\d+)\/items_batch$/,
      handle: () => ({ handles: [`stub-batch-${mintId()}`] }),
    },

    /* ---- token lookups made on dashboard load ---- */
    {
      method: "GET",
      match: /^\/debug_token$/,
      handle: () => ({
        data: {
          app_id: "stub-app",
          is_valid: true,
          scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
          expires_at: 0,
        },
      }),
    },
    {
      method: "GET",
      match: /^\/oauth\/access_token$/,
      handle: () => ({ access_token: "stub-access-token", token_type: "bearer" }),
    },
  ];
}
