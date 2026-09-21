import { zodResolver } from "@hookform/resolvers/zod";
import { IconRefresh } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

import {
  useDeleteWaPaymentConfigurationMutation,
  useGetWaPaymentConfigurationByNameMutation,
  useIntegrationByType,
  useRegenerateWaPaymentConfigurationOauthMutation,
} from "@/backend/appsIntegration/integration.query";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import { IntegrationShell } from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import { MCC, PROVIDER_NAMES } from "@/components/integrations/utils.ts";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import NothingFound from "@/components/NothingFound/NothingFound.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";
import { IntegratedApps } from "@/types/enums.ts";

// TODO: re add create and get all wa payment config list
enum Providers {
  razorpay = "razorpay",
  payu = "payu",
  zaakpay = "zaakpay",
}

const providerOptions = Object.keys(Providers).map((name) => ({ value: name, label: name }));

export function WhatsappPayment() {
  const [opened, { close, open }] = useDisclosure(false);
  const { data, isPending } = useIntegrationByType(IntegratedApps.waPayment);
  // const { refetch } = useWaPaymentConfigurations();
  // const createWaPaymentConfigurationMutation =
  //   useCreateWaPaymentConfigurationMutation(IntegratedApps.waPayment);
  const getWaPaymentConfigurationByNameMutation = useGetWaPaymentConfigurationByNameMutation(
    IntegratedApps.waPayment,
  );
  const regenerateWaPaymentConfigurationOauthMutation =
    useRegenerateWaPaymentConfigurationOauthMutation(IntegratedApps.waPayment);
  const deleteMutation = useDeleteWaPaymentConfigurationMutation(IntegratedApps.waPayment);
  const schema = z.object({
    configuration_name: z
      .string()
      .min(4, "configuration_name must be at least 4 characters long")
      .max(40, "configuration_name must be at most 40 characters long")
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        "configuration_name can only contain alphanumeric characters, periods, hyphens, and underscores",
      )
      .regex(/^\S*$/, "configuration_name cannot contain spaces"),
    purpose_code: z.string().min(1),
    merchant_category_code: z.string().min(1),
    provider_name: z.enum(Providers),
  });
  const getConfigSchema = z.object({
    configuration_name: z
      .string()
      .min(4, "configuration_name must be at least 4 characters long")
      .max(40, "configuration_name must be at most 40 characters long")
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        "configuration_name can only contain alphanumeric characters, periods, hyphens, and underscores",
      )
      .regex(/^\S*$/, "configuration_name cannot contain spaces"),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      configuration_name: "",
      purpose_code: "00",
      merchant_category_code: "0000",
      provider_name: Providers.razorpay,
    },
  });
  const getConfigForm = useForm<z.infer<typeof getConfigSchema>>({
    resolver: zodResolver(getConfigSchema),
    defaultValues: {
      configuration_name: "",
    },
  });
  if (isPending) <RateupLoader />;
  const handleSubmit = () => {
    // showLoadingToast(
    //   "whatsapp payment configuration creating...",
    //   "waPaymentConfigurations-create",
    //   true,
    // );
    // createWaPaymentConfigurationMutation.mutate(form.getValues());
    // form.reset();
    toast.loading("getting whatsapp payment configuration...", {
      id: "waPaymentConfiguration-get-by-name",
    });
    getWaPaymentConfigurationByNameMutation.mutate(getConfigForm.getValues());
    getConfigForm.reset();
    close();
  };

  const config = INTEGRATIONS_CONFIG.waPayment;
  const configurationCount = data?.credential?.length ?? 0;

  return (
    <IntegrationShell
      icon={config.icon}
      name={config.name}
      connected={configurationCount > 0}
      detail={
        configurationCount > 0
          ? `${configurationCount} ${configurationCount === 1 ? "configuration" : "configurations"}`
          : undefined
      }
      action={
        <Button
          variant="outline"
          onClick={() => {
            open();
            // refetch().then(() => integrationListRefetch());
          }}
        >
          <IconRefresh data-icon="inline-start" />
          Fetch from WhatsApp
        </Button>
      }
    >
      <>
        <Dialog
          open={opened}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              close();
              form.reset();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Get Configuration</DialogTitle>
            </DialogHeader>
            <form onSubmit={getConfigForm.handleSubmit(handleSubmit)}>
              <FieldGroup className="gap-4">
                <Controller
                  name="configuration_name"
                  control={getConfigForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Payment configuration name</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                        placeholder="Enter configuration name"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <DialogFooter>
                  <DialogClose render={<Button variant="secondary" type="button" />}>
                    Cancel
                  </DialogClose>
                  <Button type="submit">Submit</Button>
                </DialogFooter>
              </FieldGroup>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog
          open={false}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              close();
              form.reset();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Configuration</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <FieldGroup className="gap-4">
                <Controller
                  name="configuration_name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Payment configuration name</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                        placeholder="Enter configuration name"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="merchant_category_code"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="merchant_category_code">
                        Merchant category code (MCC)
                      </FieldLabel>
                      <Select
                        name={field.name}
                        value={field.value}
                        onValueChange={field.onChange}
                        items={MCC}
                      >
                        <SelectTrigger
                          id="merchant_category_code"
                          className="w-full"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue placeholder="Select merchant category code (MCC)" />
                        </SelectTrigger>
                        <SelectContent>
                          {MCC.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="purpose_code"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="purpose_code">Purpose code</FieldLabel>
                      <Select
                        name={field.name}
                        value={field.value}
                        onValueChange={field.onChange}
                        items={PROVIDER_NAMES}
                      >
                        <SelectTrigger
                          id="purpose_code"
                          className="w-full"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue placeholder="Select purpose code" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVIDER_NAMES.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="provider_name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="provider_name">Provider name</FieldLabel>
                      <Select
                        name={field.name}
                        value={field.value}
                        onValueChange={field.onChange}
                        items={providerOptions}
                      >
                        <SelectTrigger
                          id="provider_name"
                          className="w-full"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue placeholder="Select provider name" />
                        </SelectTrigger>
                        <SelectContent>
                          {providerOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <DialogFooter>
                  <DialogClose render={<Button variant="secondary" type="button" />}>
                    Cancel
                  </DialogClose>
                  <Button type="submit">Submit</Button>
                </DialogFooter>
              </FieldGroup>
            </form>
          </DialogContent>
        </Dialog>
      </>
      <WhatsappPaymentList
        data={data}
        deleteMutation={deleteMutation}
        regenerateWaPaymentConfigurationOauthMutation={
          regenerateWaPaymentConfigurationOauthMutation
        }
      />
    </IntegrationShell>
  );
}

function WhatsappPaymentList({
  data,
  deleteMutation: _deleteMutation,
  regenerateWaPaymentConfigurationOauthMutation,
}: {
  data?: {
    credential?: Array<{
      configuration_name?: string;
      provider_name?: string;
      status?: string;
      oauth_url?: string;
      /** Both arrive as code objects carrying a human-readable description. */
      purpose_code?: { code?: string; description?: string };
      merchant_category_code?: { code?: string; description?: string };
      expiration?: number;
      description?: string;
    }>;
  };
  deleteMutation?: unknown;
  regenerateWaPaymentConfigurationOauthMutation: { mutate: (name: string) => void };
}) {
  if (!data?.credential || data?.credential?.length === 0) return <NothingFound text="" />;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data?.credential?.map((credential) => (
        <Card key={credential?.configuration_name}>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="mr-3 truncate">{credential?.configuration_name}</CardTitle>
            {/* <WhatsappPaymentCardMenu
              name={credential?.configuration_name}
              deleteMutation={deleteMutation}
            /> */}
          </CardHeader>
          <CardContent className="flex h-full flex-col justify-between gap-1">
            <div>
              <p>MCC: {credential?.merchant_category_code?.description}</p>
              <p>PC: {credential?.purpose_code?.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {credential.status === "Needs Connecting" &&
                credential?.expiration &&
                (dayjs.unix(credential?.expiration).isBefore(dayjs()) ? (
                  <>
                    <Tooltip>
                      <TooltipTrigger render={<Link to={credential?.oauth_url} target="_blank" />}>
                        <Button variant="secondary" size="sm" disabled>
                          Click to verify
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Click to refresh button to regenerate verification link
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            aria-label="Refresh"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              regenerateWaPaymentConfigurationOauthMutation.mutate(
                                credential?.configuration_name ?? "",
                              )
                            }
                          />
                        }
                      >
                        <IconRefresh />
                      </TooltipTrigger>
                      <TooltipContent>Click to regenerate verification link</TooltipContent>
                    </Tooltip>
                  </>
                ) : (
                  <Link to={credential?.oauth_url} target="_blank">
                    <Button size="sm">Click to verify</Button>
                  </Link>
                ))}
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{credential?.provider_name ?? "RazorPay"}</Badge>
              <Badge variant="outline">{credential?.status}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
