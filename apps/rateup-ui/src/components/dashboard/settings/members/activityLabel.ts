/**
 * A plain sentence for an audit row. The API stores the method and the route it was made
 * on; people read "Sent a campaign", not `POST /api/campaign/:id/send`.
 */
const MODULES: Record<string, string> = {
  wa: "WhatsApp",
  contact: "Contacts",
  campaign: "Campaigns",
  team: "Teams",
  org: "Organisation",
  user: "Account",
  loyalty: "Loyalty",
  survey: "Surveys",
  question: "Surveys",
  response: "Responses",
  pipelines: "Pipelines",
  integrations: "Integrations",
  webhook: "Webhooks",
  payment: "Billing",
  subscription: "Billing",
  "meta-agent": "Meta Business Agent",
  commerce: "Commerce",
  testimonials: "Testimonials",
  lifecycles: "Lifecycles",
  notification: "Notifications",
  "api-access-token": "API key",
};

const VERBS: Record<string, string> = {
  POST: "Created",
  PUT: "Updated",
  PATCH: "Updated",
  DELETE: "Deleted",
};

/** Route tails that are actions rather than resources, with the verb they really mean. */
const ACTION_TAILS: Record<string, string> = {
  send: "Sent",
  "send-test": "Sent a test of",
  assign: "Assigned",
  "assign-bulk": "Assigned",
  invite: "Invited to",
  resend: "Resent an invite for",
  publish: "Published",
  sync: "Synced",
  import: "Imported into",
  export: "Exported",
  exportmessages: "Exported chats from",
  pause: "Paused",
  "change-role": "Changed a role in",
  permissions: "Fine-tuned permissions in",
  "transfer-ownership": "Transferred ownership of",
  "award-points": "Awarded points in",
  redeem: "Redeemed in",
  approve: "Approved in",
  reject: "Rejected in",
  cancel: "Cancelled in",
  block: "Blocked in",
  spam: "Marked spam in",
};

export interface ActivityDescription {
  /** "Sent a campaign" */
  title: string;
  /** The module the row belongs to, for grouping and filtering. */
  module: string;
  /** The raw request, for the curious. */
  detail: string;
}

export function describeActivity(method: string, route: string): ActivityDescription {
  const path = route.split("?")[0];
  const segments = path.split("/").filter(Boolean);
  const apiIndex = segments.indexOf("api");
  const parts = apiIndex === -1 ? segments : segments.slice(apiIndex + 1);
  const moduleKey = parts[0] ?? "";
  const module = MODULES[moduleKey] ?? humanise(moduleKey);
  // The last static segment says what happened when the route is an action, not a resource.
  const statics = parts.slice(1).filter((s) => !looksLikeId(s));
  const tail = statics[statics.length - 1];
  const verb = (tail && ACTION_TAILS[tail]) || VERBS[method.toUpperCase()] || method;
  const object = tail && !ACTION_TAILS[tail] ? humanise(tail) : module.toLowerCase();
  const title =
    tail && ACTION_TAILS[tail] ? `${verb} ${module.toLowerCase()}` : `${verb} ${object}`;
  return { title: capitalise(title), module, detail: `${method.toUpperCase()} ${path}` };
}

function looksLikeId(segment: string): boolean {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment) || /^\d+$/.test(segment) || segment.startsWith(":")
  );
}

function humanise(segment: string): string {
  return segment
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
