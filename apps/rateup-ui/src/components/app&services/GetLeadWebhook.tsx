import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  useGetLeadWebhook,
  useIssueGetLeadWebhookMutation,
} from "@/backend/appsIntegration/getlead/getlead.query";
import { LinkCopyElement } from "@/components/input/LinkCopyElement.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card";

/**
 * The payload templates an admin pastes into a workflow's JSON Template box.
 *
 * A JSON template rather than the Visual Mapper: this is the contract our
 * receiver reads, and a mapping built field-by-field by hand would drift from it
 * silently.
 *
 * `event` is ours, not GetLead's — one URL serves every workflow, so the body
 * has to say which trigger it came from. The rest are GetLead's placeholders,
 * taken from the trigger's "Available Fields" panel.
 *
 * The status-change spellings are confirmed against a real delivery. The rest
 * are inferred from the trigger's field labels: a wrong one arrives either empty
 * or as the literal `{{...}}` text, and the receiver logs exactly that — so a
 * first delivery corrects them rather than failing quietly.
 */
const TEMPLATES = [
  {
    trigger: "When lead status is changed",
    rows: 12,
    json: `{
  "event": "lead.status_changed",
  "lead_id": "{{lead.id}}",
  "name": "{{lead.name}}",
  "email": "{{lead.email}}",
  "phone": "{{lead.phone}}",
  "source": "{{lead.source}}",
  "status": "{{lead.status}}",
  "previous_status": "{{lead.previous_status}}",
  "new_status": "{{lead.new_status}}",
  "status_changed_at": "{{lead.status_changed_at}}"
}`,
  },
  {
    trigger: "When a lead is created",
    rows: 10,
    json: `{
  "event": "lead.created",
  "lead_id": "{{lead.id}}",
  "name": "{{lead.name}}",
  "email": "{{lead.email}}",
  "phone": "{{lead.phone}}",
  "source": "{{lead.source}}",
  "status": "{{lead.status}}",
  "created_at": "{{lead.created_at}}"
}`,
  },
];

/**
 * The rest of the inbound setup: the secret, the payload, and whether GetLead
 * has ever actually called.
 *
 * The URL itself sits on the API key card above, where saving a key produces
 * it. GetLead has no webhook subscription API — someone configures a workflow
 * by hand inside GetLead — so this screen's whole job is to hand over values to
 * paste and then report whether anything arrived.
 *
 * Both directions of the mapping are live: a status change moves the lead into
 * the mapped column, and a lead created in GetLead opens one there.
 */
export function GetLeadWebhook() {
  const { t } = useTranslation();
  const { data: webhook, isPending } = useGetLeadWebhook(true);
  const issueMutation = useIssueGetLeadWebhookMutation();

  const rotate = () => {
    if (
      webhook?.configured &&
      !window.confirm(
        t(
          "This replaces the URL and secret. The workflow in GetLead will stop delivering until you paste the new ones in.",
        ),
      )
    ) {
      return;
    }
    issueMutation.mutate();
  };

  return (
    <Card className="p-4">
      <h4 className="text-sm font-medium">{t("Leads and status changes from GetLead")}</h4>
      <p className="text-muted-foreground mb-3 max-w-150 text-sm">
        {t(
          "In GetLead: Automations → Workflows → pick a trigger → Send webhook notification. Paste the URL from above and the secret below, switch the payload to JSON Template, and paste the matching one. The secret is required — deliveries without it are refused. A lead only arrives if its GetLead status is mapped to a column above.",
        )}
      </p>

      {isPending ? (
        <div className="flex items-center gap-2">
          <IconLoader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          <span className="text-muted-foreground text-sm">{t("Loading...")}</span>
        </div>
      ) : (
        <div className="flex max-w-150 flex-col gap-3">
          {webhook?.secret && <LinkCopyElement link={webhook.secret} label={t("Secret")} />}

          {/* One per trigger, because the same URL serves both and only the
              body says which one fired. */}
          {TEMPLATES.map((template) => (
            <LinkCopyElement
              key={template.trigger}
              link={template.json}
              label={t("Payload for “{trigger}”", { trigger: template.trigger })}
              multiline
              rows={template.rows}
            />
          ))}

          <div className="text-sm">
            <dl className="text-muted-foreground grid grid-cols-2 gap-y-1">
              <dt>{t("Last delivery")}</dt>
              {/* The only evidence the workflow was actually created: nothing in
                  GetLead's API can be asked whether one exists. */}
              <dd>
                {webhook?.lastReceivedAt
                  ? new Date(webhook.lastReceivedAt).toLocaleString()
                  : t("None yet — check the workflow is active in GetLead")}
              </dd>
            </dl>

            {/* A delivery that arrived and was turned away. Louder than the
                accepted one: it means GetLead is calling and something about
                the signature does not line up — which otherwise looks exactly
                like nobody having created the workflow. */}
            {webhook?.lastRejectedAt && (
              <p className="text-destructive mt-2 flex items-start gap-1.5 text-xs">
                <IconAlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {t("A delivery was refused at {time}: {reason}", {
                    time: new Date(webhook.lastRejectedAt).toLocaleString(),
                    reason: webhook.lastRejectReason ?? "unknown",
                  })}
                </span>
              </p>
            )}

            {/* What actually arrived. An empty or literal {{placeholder}} here is
                the fastest way to spot a template field that does not exist. */}
            {webhook?.lastEvent && (
              <pre className="bg-muted text-muted-foreground mt-2 overflow-x-auto rounded-md px-2 py-1.5 font-mono text-xs">
                {webhook.lastEvent}
              </pre>
            )}
          </div>

          <div>
            <Button variant="outline" onClick={rotate} disabled={issueMutation.isPending}>
              {issueMutation.isPending
                ? t("Replacing...")
                : webhook?.configured
                  ? t("Replace URL and secret")
                  : t("Create webhook URL")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
