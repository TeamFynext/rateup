import { zodResolver } from "@hookform/resolvers/zod";
import { IconLock, IconPlus, IconTrash } from "@tabler/icons-react";
import { useFieldArray, useForm } from "react-hook-form";

import type { Connector } from "@/backend/metaAgent/metaAgent.api";
import {
  useUpsertConnectorApiKey,
  useUpsertConnectorCertificate,
  useUpsertConnectorOAuth,
} from "@/backend/metaAgent/metaAgent.query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { TagsInput } from "@/components/ui/tags-input";
import { Textarea } from "@/components/ui/textarea";

import {
  apiKeyFormSchema,
  type ApiKeyFormValues,
  certificateFormSchema,
  type CertificateFormValues,
  oauthFormSchema,
  type OAuthFormValues,
} from "../../metaAgent.schemas";
import { FormField } from "../shared/FormField";

/**
 * Secrets are written to Meta and never read back — not by the UI, not by the
 * API. Every form here starts empty on purpose: what you see is what you are
 * about to send, not what is already stored.
 */
export function ConnectorCredentials({
  waSettingsId,
  connector,
}: Readonly<{ waSettingsId: string; connector: Connector }>) {
  const needsApiKey = connector.authType === "API_KEY";
  const needsOAuth =
    connector.authType === "OAUTH2" || connector.authType === "OAUTH2_CLIENT_CREDENTIALS";

  return (
    <div className="space-y-5">
      <Alert>
        <IconLock />
        <AlertTitle>Credentials are stored at Meta, not here</AlertTitle>
        <AlertDescription>
          Rateup forwards what you enter and keeps only the connection status. Nothing you type
          below can be read back afterwards.
        </AlertDescription>
      </Alert>

      {needsApiKey && <ApiKeyForm waSettingsId={waSettingsId} connectorId={connector.id} />}
      {needsOAuth && <OAuthForm waSettingsId={waSettingsId} connectorId={connector.id} />}
      {!needsApiKey && !needsOAuth && (
        <p className="text-sm text-muted-foreground">
          This connector&apos;s auth type ({connector.authType.toLowerCase().replaceAll("_", " ")})
          needs no credentials registered here.
        </p>
      )}

      {connector.requiresCertificate && (
        <CertificateForm waSettingsId={waSettingsId} connector={connector} />
      )}
    </div>
  );
}

const API_KEY_LOCATIONS = [
  { value: "headers", label: "Headers" },
  { value: "query_params", label: "Query parameters" },
  { value: "body_params", label: "Body fields" },
] as const;

function ApiKeyForm({
  waSettingsId,
  connectorId,
}: Readonly<{ waSettingsId: string; connectorId: string }>) {
  const upsert = useUpsertConnectorApiKey(waSettingsId);
  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      location: "headers",
      params: [{ field_name: "Authorization", value: "", prefix: "Bearer " }],
    },
  });
  const fields = useFieldArray({ control: form.control, name: "params" });

  const onSubmit = (values: ApiKeyFormValues) =>
    upsert.mutate(
      { connectorId, config: { [values.location]: values.params } },
      { onSuccess: () => form.reset() },
    );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldSet>
        <FieldLegend variant="label">API key</FieldLegend>
        <FieldGroup className="gap-4">
          <FormField
            control={form.control}
            name="location"
            label="Send the key as"
            required
            description="Meta adds these to every request the agent makes through this connector."
          >
            {(field, controlProps) => (
              <Select
                name={field.name}
                value={field.value}
                onValueChange={(value) => field.onChange(value ?? "headers")}
                items={API_KEY_LOCATIONS}
              >
                <SelectTrigger {...controlProps} className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {API_KEY_LOCATIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          {fields.fields.map((entry, index) => (
            <div
              key={entry.id}
              className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_1fr_8rem_auto]"
            >
              <FormField
                control={form.control}
                name={`params.${index}.field_name`}
                label="Field name"
                required
              >
                {(field, controlProps) => (
                  <Input {...field} {...controlProps} className="font-mono text-sm" />
                )}
              </FormField>
              <FormField
                control={form.control}
                name={`params.${index}.value`}
                label="Value"
                required
              >
                {(field, controlProps) => (
                  <Input {...field} {...controlProps} type="password" autoComplete="off" />
                )}
              </FormField>
              <FormField control={form.control} name={`params.${index}.prefix`} label="Prefix">
                {(field, controlProps) => (
                  <Input {...field} {...controlProps} className="font-mono text-sm" />
                )}
              </FormField>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-6 shrink-0"
                aria-label="Remove field"
                disabled={fields.fields.length === 1}
                onClick={() => fields.remove(index)}
              >
                <IconTrash className="text-destructive" />
              </Button>
            </div>
          ))}

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fields.append({ field_name: "", value: "", prefix: "" })}
            >
              <IconPlus data-icon="inline-start" />
              Add field
            </Button>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending && <Spinner data-icon="inline-start" />}
              Save at Meta
            </Button>
          </div>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}

const CONTENT_TYPES = [
  { value: "application/x-www-form-urlencoded", label: "Form URL-encoded (default)" },
  { value: "application/json", label: "JSON" },
] as const;

function OAuthForm({
  waSettingsId,
  connectorId,
}: Readonly<{ waSettingsId: string; connectorId: string }>) {
  const upsert = useUpsertConnectorOAuth(waSettingsId);
  const form = useForm<OAuthFormValues>({
    resolver: zodResolver(oauthFormSchema),
    defaultValues: {
      token_url: "",
      scopes_to_request: [],
      client_id: "",
      client_secret: "",
      token_request_content_type: "application/x-www-form-urlencoded",
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) =>
        upsert.mutate({ connectorId, config: values }, { onSuccess: () => form.reset() }),
      )}
    >
      <FieldSet>
        <FieldLegend variant="label">OAuth 2.0</FieldLegend>
        <FieldGroup className="gap-4">
          <FormField
            control={form.control}
            name="token_url"
            label="Token URL"
            required
            description="The endpoint Meta exchanges credentials at. Must be https."
          >
            {(field, controlProps) => (
              <Input
                {...field}
                {...controlProps}
                placeholder="https://auth.example.com/oauth/token"
                className="font-mono text-sm"
              />
            )}
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="client_id" label="Client id" required>
              {(field, controlProps) => <Input {...field} {...controlProps} autoComplete="off" />}
            </FormField>
            <FormField control={form.control} name="client_secret" label="Client secret" required>
              {(field, controlProps) => (
                <Input {...field} {...controlProps} type="password" autoComplete="off" />
              )}
            </FormField>
          </div>

          <FormField
            control={form.control}
            name="scopes_to_request"
            label="Scopes"
            required
            description="Press Enter after each scope."
          >
            {(field, controlProps) => (
              <TagsInput
                id={controlProps.id}
                aria-invalid={controlProps["aria-invalid"]}
                value={field.value}
                onValueChange={field.onChange}
                placeholder="orders.read"
              />
            )}
          </FormField>

          <FormField
            control={form.control}
            name="token_request_content_type"
            label="Token request encoding"
          >
            {(field, controlProps) => (
              <Select
                name={field.name}
                value={field.value}
                onValueChange={(value) =>
                  field.onChange(value ?? "application/x-www-form-urlencoded")
                }
                items={CONTENT_TYPES}
              >
                <SelectTrigger {...controlProps} className="w-full sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          <div className="flex justify-end">
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending && <Spinner data-icon="inline-start" />}
              Save at Meta
            </Button>
          </div>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}

function CertificateForm({
  waSettingsId,
  connector,
}: Readonly<{ waSettingsId: string; connector: Connector }>) {
  const upsert = useUpsertConnectorCertificate(waSettingsId);
  const form = useForm<CertificateFormValues>({
    resolver: zodResolver(certificateFormSchema),
    defaultValues: { client_certificate: "", client_key: "", ca_certificate: "" },
  });

  const mtls = connector.mtlsConfig;

  return (
    <form
      onSubmit={form.handleSubmit((values) =>
        upsert.mutate(
          {
            connectorId: connector.id,
            data: {
              client_certificate: values.client_certificate,
              client_key: values.client_key,
              ...(values.ca_certificate ? { ca_certificate: values.ca_certificate } : {}),
            },
          },
          { onSuccess: () => form.reset() },
        ),
      )}
    >
      <FieldSet>
        <FieldLegend variant="label">mTLS certificate</FieldLegend>
        <FieldGroup className="gap-4">
          {mtls?.has_certificate && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p>
                A certificate is installed
                {mtls.subject ? ` for ${mtls.subject}` : ""}
                {mtls.expires_at
                  ? `, expiring ${new Date(mtls.expires_at * 1000).toLocaleDateString()}`
                  : ""}
                .
              </p>
              {mtls.fingerprint && (
                <p className="mt-1 font-mono break-all">SHA-256 {mtls.fingerprint}</p>
              )}
              <p className="mt-1">Uploading a new one replaces it.</p>
            </div>
          )}

          <FormField
            control={form.control}
            name="client_certificate"
            label="Client certificate"
            required
            description="PEM-encoded, beginning with -----BEGIN CERTIFICATE-----."
          >
            {(field, controlProps) => (
              <Textarea {...field} {...controlProps} rows={4} className="font-mono text-xs" />
            )}
          </FormField>

          <FormField
            control={form.control}
            name="client_key"
            label="Client private key"
            required
            description="PEM-encoded PKCS8, RSA or EC key."
          >
            {(field, controlProps) => (
              <Textarea {...field} {...controlProps} rows={4} className="font-mono text-xs" />
            )}
          </FormField>

          <FormField
            control={form.control}
            name="ca_certificate"
            label="CA certificate"
            description="Optional — only if your API is signed by a private CA."
          >
            {(field, controlProps) => (
              <Textarea {...field} {...controlProps} rows={3} className="font-mono text-xs" />
            )}
          </FormField>

          <div className="flex justify-end">
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending && <Spinner data-icon="inline-start" />}
              Save at Meta
            </Button>
          </div>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}
