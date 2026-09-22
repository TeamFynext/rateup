import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { Connector, ConnectorAuthType } from "@/backend/metaAgent/metaAgent.api";
import { CONNECTOR_AUTH_TYPES } from "@/backend/metaAgent/metaAgent.api";
import { useCreateConnector, useUpdateConnector } from "@/backend/metaAgent/metaAgent.query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { connectorFormSchema, type ConnectorFormValues } from "../../metaAgent.schemas";
import { FormField } from "../shared/FormField";

const AUTH_LABELS: Record<ConnectorAuthType, { label: string; blurb: string }> = {
  NONE: { label: "None", blurb: "A public API that needs no credentials." },
  API_KEY: {
    label: "API key",
    blurb: "Meta injects fixed header, query or body fields on every call.",
  },
  BASIC: { label: "HTTP Basic", blurb: "A username and password pair." },
  OAUTH2: {
    label: "OAuth 2.0 (user)",
    blurb: "Each customer authorises individually; Meta stores their token.",
  },
  OAUTH2_CLIENT_CREDENTIALS: {
    label: "OAuth 2.0 client credentials",
    blurb: "One machine-to-machine token Meta refreshes for you.",
  },
  CUSTOM: { label: "Custom", blurb: "A scheme you drive yourself through tool definitions." },
};

const AUTH_ITEMS = CONNECTOR_AUTH_TYPES.map((value) => ({
  value,
  label: AUTH_LABELS[value].label,
}));

const LOCATION_ITEMS = [
  { value: "headers", label: "Header" },
  { value: "query", label: "Query parameter" },
  { value: "body", label: "Body field" },
  { value: "path", label: "Path segment" },
] as const;

export function ConnectorDialog({
  waSettingsId,
  connector,
  open,
  onOpenChange,
}: Readonly<{
  waSettingsId: string;
  connector: Connector | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const createConnector = useCreateConnector(waSettingsId);
  const updateConnector = useUpdateConnector(waSettingsId);

  const form = useForm<ConnectorFormValues>({
    resolver: zodResolver(connectorFormSchema),
    values: {
      name: connector?.name ?? "",
      description: connector?.description ?? "",
      base_url: connector?.baseUrl ?? "",
      auth_type: connector?.authType ?? "API_KEY",
      requires_certificate: connector?.requiresCertificate ?? false,
      injectUserAuth: !!connector?.userAuthInjectionConfig,
      userAuthLocation: connector?.userAuthInjectionConfig?.location ?? "headers",
      userAuthFieldName: connector?.userAuthInjectionConfig?.field_name ?? "Authorization",
      userAuthPrefix: connector?.userAuthInjectionConfig?.prefix ?? "Bearer ",
    },
  });

  const authType = form.watch("auth_type");
  const injectUserAuth = form.watch("injectUserAuth");
  const isPending = createConnector.isPending || updateConnector.isPending;

  const onSubmit = (values: ConnectorFormValues) => {
    const payload = {
      name: values.name,
      description: values.description,
      base_url: values.base_url,
      auth_type: values.auth_type,
      requires_certificate: values.requires_certificate,
      ...(values.injectUserAuth
        ? {
            user_auth_injection_config: {
              location: values.userAuthLocation,
              field_name: values.userAuthFieldName,
              prefix: values.userAuthPrefix,
            },
          }
        : {}),
    };
    const done = { onSuccess: () => onOpenChange(false) };
    if (connector) updateConnector.mutate({ connectorId: connector.id, data: payload }, done);
    else createConnector.mutate(payload, done);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      // The dialog stays mounted between opens, and `values` only resets the form
      // when it changes — two "Add"s in a row pass the same empty values, so the
      // last draft would reappear. Reset once it has finished closing instead.
      onOpenChangeComplete={(isOpen) => !isOpen && form.reset()}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{connector ? "Edit connector" : "Add connector"}</DialogTitle>
          <DialogDescription>
            Describes an external API. Credentials and the individual operations are configured
            after it exists.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <FormField control={form.control} name="name" label="Name" required>
              {(field, controlProps) => (
                <Input {...field} {...controlProps} placeholder="Order management system" />
              )}
            </FormField>

            <FormField
              control={form.control}
              name="description"
              label="Description"
              required
              description="The agent reads this to decide when this connector is the right one."
              hint={`${form.watch("description").length}/1024`}
            >
              {(field, controlProps) => (
                <Textarea
                  {...field}
                  {...controlProps}
                  rows={2}
                  placeholder="Looks up orders, shipments and refunds for a customer."
                />
              )}
            </FormField>

            <FormField
              control={form.control}
              name="base_url"
              label="Base URL"
              required
              description="Tool paths are appended to this. Must be https."
            >
              {(field, controlProps) => (
                <Input
                  {...field}
                  {...controlProps}
                  placeholder="https://api.example.com/v1"
                  className="font-mono text-sm"
                />
              )}
            </FormField>

            <FormField
              control={form.control}
              name="auth_type"
              label="Auth type"
              required
              description={AUTH_LABELS[authType]?.blurb}
            >
              {(field, controlProps) => (
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value ?? "NONE")}
                  items={AUTH_ITEMS}
                >
                  <SelectTrigger {...controlProps} className="w-full">
                    <SelectValue placeholder="Choose an auth type" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTH_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>

            <FormField
              control={form.control}
              name="requires_certificate"
              label="Require mTLS"
              orientation="horizontal"
              description="Your API demands a client certificate on the TLS handshake."
            >
              {(field) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            </FormField>

            <FieldSeparator />

            <FormField
              control={form.control}
              name="injectUserAuth"
              label="Inject the customer's own token"
              orientation="horizontal"
              description="For per-customer auth: Meta adds their stored token to every request."
            >
              {(field) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            </FormField>

            {injectUserAuth && (
              <div className="grid grid-cols-1 gap-4 rounded-lg border p-3 sm:grid-cols-3">
                <FormField control={form.control} name="userAuthLocation" label="Where" required>
                  {(field, controlProps) => (
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "headers")}
                      items={LOCATION_ITEMS}
                    >
                      <SelectTrigger {...controlProps} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCATION_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
                <FormField
                  control={form.control}
                  name="userAuthFieldName"
                  label="Field name"
                  required
                >
                  {(field, controlProps) => (
                    <Input {...field} {...controlProps} className="font-mono text-sm" />
                  )}
                </FormField>
                <FormField control={form.control} name="userAuthPrefix" label="Prefix">
                  {(field, controlProps) => (
                    <Input
                      {...field}
                      {...controlProps}
                      placeholder="Bearer "
                      className="font-mono text-sm"
                    />
                  )}
                </FormField>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isPending}>
                {connector ? "Save changes" : "Create connector"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
