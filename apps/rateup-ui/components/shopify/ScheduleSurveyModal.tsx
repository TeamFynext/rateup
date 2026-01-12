"use client";

import { useEffect, useMemo, useState } from "react";

import {
  IconAlertCircle,
  IconBolt,
  IconClock,
  IconMessage,
  IconPlus,
  IconRefresh,
  IconSettings,
} from "@tabler/icons-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
  IntegratedApps,
  LoyaltyApiFeature,
  ShopifyEvents,
} from "@/types/enums";
import { ShopifyIntegration } from "@/types/global";
import useTemplatesAvailableForTeam from "@/hooks/team";
import { useUpdateIntegrationMutation } from "@/backend/appsIntegration/integration.query";
import { getProductsFromShopify } from "@/backend/appsIntegration/shopify/shopify.api";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";

import { shopifyEventData } from "../../utils/constants";
import { showLoadingToast } from "../../utils/notifications";
import { TeamSelector } from "../input/TeamSelector";
import WaTemplateSelector from "../input/WaTemplateSelector";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import VariableMapping from "./VariableMapping";

const formSchema = z.object({
  waTemplateId: z.string().min(1, "WhatsApp Template is required"),
  event: z.string().min(1, "Event is required"),
  isProductSpecific: z.boolean().default(false),
  productId: z.string().optional(),
  teamId: z.string().min(1, "Team is required"),
  timeDelay: z.coerce.number().min(0, "Delay must be positive"),
  repeatInterval: z.object({
    value: z.coerce.number().min(0),
    unit: z.enum(["hour", "day"]).default("hour"),
  }),
  variableMapping: z
    .array(
      z.object({
        templateParamIndex: z.number(),
        shopifyPath: z.string(),
      }),
    )
    .default([]),
  // Fields to be hidden but kept in schema for compatibility
  actionId: z.string().optional(),
  loyaltyApiFeature: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const ScheduleSurveyModal = ({
  opened,
  close,
  shopifyInfo,
  setShopifyProducts,
}: {
  opened: boolean;
  close: () => void;
  shopifyInfo: ShopifyIntegration;
  setShopifyProducts: React.Dispatch<React.SetStateAction<any[]>>;
}) => {
  const [productData, setProductData] = useState<
    { label: string; value: string }[]
  >([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const translations = useTranslations();
  const updateIntegration = useUpdateIntegrationMutation(
    IntegratedApps.shopify,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      waTemplateId: "",
      event: "",
      isProductSpecific: false,
      productId: "",
      teamId: "",
      timeDelay: 0,
      repeatInterval: {
        value: 0,
        unit: "hour",
      },
      variableMapping: [],
      actionId: "",
      loyaltyApiFeature: "",
    },
  });

  const { watch, setValue } = form;
  const selectedEvent = watch("event");
  const isProductSpecific = watch("isProductSpecific");
  const waTemplateId = watch("waTemplateId");
  const teamId = watch("teamId"); // Watch teamId for template filtering

  const { data: allTemplates, isLoading: isTemplatesLoading } =
    useWaTemplates();
  const availableTemplates = teamId
    ? useTemplatesAvailableForTeam(teamId)
    : allTemplates;

  const templatesData = useMemo(
    () =>
      availableTemplates?.map((t) => ({
        value: String(t?.id),
        label: t?.data?.name,
      })),
    [availableTemplates],
  );

  const handleScheduleSurvey = (values: FormValues) => {
    const newShopifySurveys = [
      ...(shopifyInfo.credential.shopifySurveys || []),
    ];
    const isEventExist = newShopifySurveys.find(
      (s) => s.event === values.event,
    );

    if (isEventExist) {
      form.setError("event", {
        message: "You already have a schedule for this event",
      });
      return;
    }

    newShopifySurveys.push({
      waTemplateId: values.waTemplateId ?? "",
      event: values.event as ShopifyEvents,
      isProductSpecific: values.isProductSpecific ?? false,
      productId: values.productId,
      teamId: values.teamId ?? "",
      timeDelay: values.timeDelay ?? 0,
      repeatInterval: {
        value: values.repeatInterval?.value ?? 0,
        unit: values.repeatInterval?.unit ?? "hour",
      },
      variableMapping:
        values.variableMapping?.map((m) => ({
          templateParamIndex: m.templateParamIndex ?? 0,
          shopifyPath: m.shopifyPath ?? "",
        })) ?? [],
      actionId: values.actionId,
      loyaltyApiFeature: values.loyaltyApiFeature,
      active: true,
      schedules: [],
      createdAt: new Date(),
    });

    showLoadingToast(
      translations("Creating Survey Schedule"),
      "integration-update",
      true,
      translations("Loading"),
      "",
      false,
    );

    updateIntegration.mutate(
      {
        credential: {
          ...shopifyInfo.credential,
          shopifySurveys: newShopifySurveys,
        },
      },
      {
        onSuccess: () => {
          form.reset();
          close();
        },
      },
    );
  };

  const loadShopifyProducts = async () => {
    setLoadingProducts(true);
    try {
      const products = await getProductsFromShopify();
      setShopifyProducts(products ?? []);
      setProductData(
        products
          ? products?.map((product: any) => ({
              label: product.title,
              value: product.id.toString(),
            }))
          : [],
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  const isWebhookMissing =
    selectedEvent &&
    selectedEvent !== ShopifyEvents.ABANDONED_CHECKOUTS &&
    !shopifyInfo.credential.isWebhookRegistered;

  return (
    <Dialog open={opened} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden rounded-xl border-none shadow-2xl">
        <div className="bg-gradient-to-r from-primary/10 via-background to-background p-6 border-b">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-primary/20 rounded-lg text-primary">
                <IconSettings size={20} />
              </div>
              <DialogTitle className="text-xl font-bold">
                Shopify Automations
              </DialogTitle>
            </div>
            <DialogDescription>
              Configure automated WhatsApp messages triggered by Shopify events.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleScheduleSurvey)}>
            <ScrollArea className="max-h-[65vh] px-6 py-6 bg-muted/5">
              <div className="space-y-6">
                {isWebhookMissing && (
                  <Alert
                    variant="destructive"
                    className="bg-destructive/10 text-destructive border-destructive/20"
                  >
                    <IconAlertCircle className="h-4 w-4" />
                    <AlertTitle>Webhook Required</AlertTitle>
                    <AlertDescription className="text-xs">
                      Allow Rateup to subscribe to your store events in settings
                      before scheduling.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Trigger Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <IconBolt size={16} />
                    <span>Trigger Conditions</span>
                  </div>
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="teamId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Team
                              </FormLabel>
                              <FormControl>
                                <TeamSelector
                                  {...field}
                                  styles={{
                                    input: {
                                      borderRadius: "0.5rem",
                                      border: "1px solid hsl(var(--input))",
                                      height: "2.5rem",
                                    },
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="event"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Shopify Event
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="rounded-lg h-10">
                                    <SelectValue placeholder="Select Event" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {shopifyEventData.map((event) => (
                                    <SelectItem
                                      key={event.value}
                                      value={event.value}
                                    >
                                      {event.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {selectedEvent !== ShopifyEvents.ABANDONED_CHECKOUTS && (
                        <div className="pt-2 border-t">
                          <FormField
                            control={form.control}
                            name="isProductSpecific"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">
                                    Product Specific
                                  </FormLabel>
                                  <FormDescription>
                                    Trigger only if certain products are in the
                                    order.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {isProductSpecific && (
                            <div className="mt-4 flex items-end gap-2">
                              <FormField
                                control={form.control}
                                name="productId"
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormLabel className="text-[10px] uppercase text-muted-foreground">
                                      Product
                                    </FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="rounded-lg">
                                          <SelectValue placeholder="Select Product" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {productData.map((prod) => (
                                          <SelectItem
                                            key={prod.value}
                                            value={prod.value}
                                          >
                                            {prod.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={loadShopifyProducts}
                                disabled={loadingProducts}
                                className="rounded-lg mb-[2px]"
                              >
                                {loadingProducts ? (
                                  <Loader2 className="animate-spin h-4 w-4" />
                                ) : (
                                  <IconRefresh size={18} />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Action Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <IconMessage size={16} />
                    <span>Action & Content</span>
                  </div>
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <FormField
                        control={form.control}
                        name="waTemplateId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              WhatsApp Template
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value} // Controlled value
                              disabled={isTemplatesLoading}
                            >
                              <FormControl>
                                <SelectTrigger className="rounded-lg h-10">
                                  <SelectValue
                                    placeholder={
                                      isTemplatesLoading
                                        ? "Loading templates..."
                                        : "Select a template"
                                    }
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {templatesData?.length ? (
                                  templatesData.map((template) => (
                                    <SelectItem
                                      key={template.value}
                                      value={template.value}
                                    >
                                      {template.label}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="p-2 text-sm text-muted-foreground text-center">
                                    No templates found
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {waTemplateId && (
                        <VariableMapping
                          waTemplateId={waTemplateId}
                          value={
                            watch("variableMapping") as {
                              templateParamIndex: number;
                              shopifyPath: string;
                            }[]
                          }
                          onChange={(val) => setValue("variableMapping", val)}
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Timing Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <IconClock size={16} />
                    <span>Timing & Frequency</span>
                  </div>
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="timeDelay"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Time Delay (Minutes)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  className="rounded-lg"
                                />
                              </FormControl>
                              <FormDescription className="text-[10px]">
                                Wait time after event before sending.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {selectedEvent ===
                          ShopifyEvents.ABANDONED_CHECKOUTS && (
                          <div className="grid grid-cols-2 gap-2">
                            <FormField
                              control={form.control}
                              name="repeatInterval.value"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] uppercase text-muted-foreground">
                                    Repeat Every
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      {...field}
                                      className="rounded-lg"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="repeatInterval.unit"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] uppercase text-muted-foreground">
                                    Unit
                                  </FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="rounded-lg">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="hour">
                                        Hours
                                      </SelectItem>
                                      <SelectItem value="day">Days</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Loyalty fields preserved as comments */}
                {/* 
                <FormField
                  control={form.control}
                  name="actionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loyalty Action</FormLabel>
                      <LASelector {...field} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="loyaltyApiFeature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loyalty API</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select API Feature" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(LoyaltyApiFeature).map((feat) => (
                            <SelectItem key={feat} value={feat}>{feat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                */}

                {selectedEvent !== ShopifyEvents.ABANDONED_CHECKOUTS && (
                  <div className="space-y-4 rounded-lg border p-4">
                    <FormField
                      control={form.control}
                      name="isProductSpecific"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium">
                              Product Specific
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Trigger only if certain products are in the order.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {isProductSpecific && (
                      <div className="flex items-end gap-2">
                        <FormField
                          control={form.control}
                          name="productId"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-[10px] uppercase text-muted-foreground">
                                Product
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="rounded-lg">
                                    <SelectValue placeholder="Select Product" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {productData.map((prod) => (
                                    <SelectItem
                                      key={prod.value}
                                      value={prod.value}
                                    >
                                      {prod.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={loadShopifyProducts}
                          disabled={loadingProducts}
                          className="rounded-lg"
                        >
                          {loadingProducts ? (
                            <Loader2 className="animate-spin h-4 w-4" />
                          ) : (
                            <IconRefresh size={18} />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 bg-muted/30 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={close}
                className="rounded-lg hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-lg px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all font-semibold"
                disabled={isWebhookMissing || updateIntegration.isPending}
              >
                {updateIntegration.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {translations("Create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleSurveyModal;
