import {
  IconBrandWhatsapp,
  IconClick,
  IconExternalLink,
  IconHandClick,
  IconPercentage,
  IconX,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type {
  ShopifyWidgetData,
  ShopifyWidgetPage,
  ShopifyWidgetSettings,
} from "@/backend/appsIntegration/shopify/shopify.api";
import {
  useSaveShopifyWidget,
  useShopifyWidget,
} from "@/backend/appsIntegration/shopify/shopify.query";
import { useChannels } from "@/backend/channels/channels.query";
import { ColorField } from "@/components/common/color-field.tsx";
import { StatTile } from "@/components/common/StatTile.tsx";
import { formatWhatsappNumber } from "@/components/dashboard/loyalty/joinLink.ts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";
import { cn } from "@/lib/utils.ts";
import { WhatsappSettingsStatus } from "@/types/enums.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";
import { HEX_COLOR } from "@/utils/color.ts";

// The limits below are the API's (shopifyWidgetSchema in rateup-api).
const LABEL_MAX = 40;
const GREETING_MAX = 300;
const PREFILL_MAX = 500;
const OFFSET_MAX = 400;

/** WhatsApp's own greens first, then the RateUp blues and a neutral. */
const WIDGET_SWATCHES = ["#25d366", "#128c7e", "#075e54", "#1c518e", "#0f2540", "#434a55"];

const PAGES: readonly { value: Exclude<ShopifyWidgetPage, "all">; label: string }[] = [
  { value: "home", label: "Home page" },
  { value: "product", label: "Product pages" },
  { value: "collection", label: "Collection pages" },
  { value: "cart", label: "Cart" },
];

// What the storefront script swaps into a message. Shown as typed, so never passed through
// `t()`: ICU would read the braces as a placeholder.
const PRODUCT_TOKEN = "{product}";
const URL_TOKEN = "{url}";

const ICON = "size-4 text-muted-foreground";

/** The message as a shopper would send it from a product page of this store. */
function sampleMessage(template: string, shop: string) {
  return template
    .replaceAll(PRODUCT_TOKEN, "Classic Cotton Tee")
    .replaceAll(URL_TOKEN, `https://${shop}/products/classic-cotton-tee`)
    .trim();
}

function TokenChips({
  tokens,
  onInsert,
  disabled,
}: Readonly<{ tokens: readonly string[]; onInsert: (token: string) => void; disabled: boolean }>) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{t("Insert")}</span>
      {tokens.map((token) => (
        <Button
          key={token}
          type="button"
          variant="outline"
          size="xs"
          className="font-mono"
          disabled={disabled}
          onClick={() => onInsert(token)}
        >
          {token}
        </Button>
      ))}
    </div>
  );
}

/** A corner of a storefront with the button on it, as the settings stand right now. */
function WidgetPreview({ settings }: Readonly<{ settings: ShopifyWidgetSettings }>) {
  const { t } = useTranslation();
  const color = HEX_COLOR.test(settings.color) ? settings.color : WIDGET_SWATCHES[0];
  const label = settings.buttonLabel.trim() || t("Chat on WhatsApp");
  const greeting = settings.greeting.trim();
  // The storefront button always carries a white icon, so the preview does too. The colours
  // are the merchant's own, which is why they are style values.
  const brand = { backgroundColor: color, color: "#ffffff" };

  return (
    <div
      aria-hidden
      className={cn(
        "relative h-96 overflow-hidden rounded-lg border border-border bg-muted",
        !settings.enabled && "opacity-60",
      )}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="h-3 w-24 rounded-full bg-background" />
        <div className="h-24 rounded-md bg-background" />
        <div className="h-3 w-40 rounded-full bg-background" />
        <div className="h-3 w-28 rounded-full bg-background" />
      </div>
      <div
        className={cn(
          "absolute flex flex-col gap-2",
          settings.position === "left" ? "left-4 items-start" : "right-4 items-end",
        )}
        // Scaled down: the frame is far shorter than a real page.
        style={{ bottom: 12 + Math.min(settings.offsetY, OFFSET_MAX) / 4 }}
      >
        {greeting && (
          <div className="relative w-56 rounded-xl bg-background p-3 text-sm text-foreground shadow-lg">
            <IconX className="absolute top-2 right-2 size-3.5 text-muted-foreground" />
            <p className="pr-4 break-words whitespace-pre-line">{greeting}</p>
            <div
              className="mt-3 rounded-md px-3 py-2 text-center text-sm font-semibold"
              style={brand}
            >
              {label}
            </div>
          </div>
        )}
        <div
          className="flex size-14 items-center justify-center rounded-full shadow-lg"
          style={brand}
        >
          <IconBrandWhatsapp className="size-7" />
        </div>
      </div>
    </div>
  );
}

function WidgetEditor({ data }: Readonly<{ data: ShopifyWidgetData }>) {
  const { t } = useTranslation();
  const canEdit = usePermissions().can("integrations.shopify");
  const save = useSaveShopifyWidget();
  const { data: channels = [], isPending: channelsPending } = useChannels(true, "WHATSAPP");
  const [draft, setDraft] = useState(data.settings);

  // A disconnected number is never offered, the same rule the API saves by.
  const numbers = channels
    .filter((channel) => channel.address && channel.status !== WhatsappSettingsStatus.DISCONNECTED)
    .map((channel) => {
      const number = formatWhatsappNumber((channel.address ?? "").replace(/\D/g, ""));
      return { value: channel.id, label: channel.name ? `${channel.name} · ${number}` : number };
    });
  // Until one is chosen, the org's first number stands in, so a single-number org never
  // has to open the picker.
  const channelId = numbers.some((number) => number.value === draft.channelId)
    ? draft.channelId
    : (numbers[0]?.value ?? null);
  const settings: ShopifyWidgetSettings = { ...draft, channelId };

  const set = <K extends keyof ShopifyWidgetSettings>(key: K, value: ShopifyWidgetSettings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const insertToken = (key: "prefill" | "productPrefill", token: string) =>
    setDraft((current) => {
      const text = current[key];
      const spaced = text && !/\s$/.test(text) ? `${text} ${token}` : `${text}${token}`;
      return { ...current, [key]: spaced.slice(0, PREFILL_MAX) };
    });

  const everywhere = settings.showOn.includes("all");
  const togglePage = (page: Exclude<ShopifyWidgetPage, "all">, checked: boolean) => {
    const chosen = settings.showOn.filter((value) => value !== "all" && value !== page);
    const next = checked ? [...chosen, page] : chosen;
    // Nothing ticked would hide the button everywhere; that is what the main switch is for.
    set("showOn", next.length ? next : ["all"]);
  };

  const colorValid = HEX_COLOR.test(settings.color);
  const needsNumber = settings.enabled && !channelId;
  const dirty = JSON.stringify(settings) !== JSON.stringify(data.settings);
  const disabled = !canEdit || save.isPending;

  const handleSave = () => {
    save.mutate(settings, {
      onSuccess: () => toast.success(t("WhatsApp button saved")),
      onError: (error) =>
        toast.error(getApiErrorMessage(error, t("Couldn't save the WhatsApp button"))),
    });
  };

  const { opens, clicks, days } = data.stats;
  const preview = sampleMessage(settings.productPrefill || settings.prefill, data.shop);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label={t("Button taps")}
          value={opens.toLocaleString()}
          note={t("Last {days} days", { days })}
          icon={<IconHandClick className={ICON} />}
        />
        <StatTile
          label={t("Chats started")}
          value={clicks.toLocaleString()}
          note={t("Shoppers who went on to WhatsApp")}
          icon={<IconClick className={ICON} />}
        />
        <StatTile
          label={t("Tap-to-chat rate")}
          value={opens ? `${Math.round((clicks / opens) * 100)}%` : null}
          emptyValue={t("No taps yet")}
          icon={<IconPercentage className={ICON} />}
        />
      </div>

      {!canEdit && (
        <Alert>
          <AlertTitle>{t("You can view these settings but not change them")}</AlertTitle>
          <AlertDescription>
            {t("Ask an admin for the Shopify integration permission.")}
          </AlertDescription>
        </Alert>
      )}

      {!channelsPending && numbers.length === 0 && (
        <Alert>
          <AlertTitle>{t("Connect a WhatsApp number first")}</AlertTitle>
          <AlertDescription>
            {t("The button needs a connected WhatsApp number to send shoppers to.")}{" "}
            <Link to="/dashboard/settings/channels" className="font-medium underline">
              {t("Open channels")}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("WhatsApp button on your store")}</CardTitle>
              <CardDescription>
                {t(
                  "A floating button shoppers tap to message you on WhatsApp. Their chats arrive in your RateUp inbox.",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="widget-enabled">{t("Show the button")}</FieldLabel>
                    <FieldDescription>
                      {t("Switch it off here to hide it from your store at any time.")}
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="widget-enabled"
                    checked={settings.enabled}
                    disabled={disabled}
                    onCheckedChange={(checked) => set("enabled", checked)}
                  />
                </Field>

                <Field data-invalid={needsNumber}>
                  <FieldLabel htmlFor="widget-number">{t("WhatsApp number")}</FieldLabel>
                  <Select
                    value={channelId}
                    onValueChange={(value) => set("channelId", value)}
                    items={numbers}
                    disabled={disabled || numbers.length === 0}
                  >
                    <SelectTrigger id="widget-number" className="w-full" aria-invalid={needsNumber}>
                      <SelectValue placeholder={t("Choose a number")} />
                    </SelectTrigger>
                    <SelectContent>
                      {numbers.map((number) => (
                        <SelectItem key={number.value} value={number.value}>
                          {number.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    {t("Shoppers who tap the button open a chat with this number.")}
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("Messages")}</CardTitle>
              <CardDescription>
                {t("What shoppers see on the button, and what is typed for them in WhatsApp.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="widget-label">{t("Button text")}</FieldLabel>
                  <Input
                    id="widget-label"
                    value={settings.buttonLabel}
                    maxLength={LABEL_MAX}
                    disabled={disabled}
                    placeholder={t("Chat on WhatsApp")}
                    onChange={(event) => set("buttonLabel", event.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="widget-greeting">{t("Greeting")}</FieldLabel>
                  <Textarea
                    id="widget-greeting"
                    rows={2}
                    value={settings.greeting}
                    maxLength={GREETING_MAX}
                    disabled={disabled}
                    onChange={(event) => set("greeting", event.target.value)}
                  />
                  <FieldDescription>
                    {t(
                      "Shown in a small card when the button is tapped. Leave it empty to open WhatsApp straight away.",
                    )}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="widget-prefill">{t("Pre-filled message")}</FieldLabel>
                  <Textarea
                    id="widget-prefill"
                    rows={2}
                    value={settings.prefill}
                    maxLength={PREFILL_MAX}
                    disabled={disabled}
                    onChange={(event) => set("prefill", event.target.value)}
                  />
                  <TokenChips
                    tokens={[URL_TOKEN]}
                    disabled={disabled}
                    onInsert={(token) => insertToken("prefill", token)}
                  />
                  <FieldDescription>
                    {t("Typed into the chat for the shopper, who can edit it before sending.")}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="widget-product-prefill">
                    {t("Pre-filled message on product pages")}
                  </FieldLabel>
                  <Textarea
                    id="widget-product-prefill"
                    rows={2}
                    value={settings.productPrefill}
                    maxLength={PREFILL_MAX}
                    disabled={disabled}
                    onChange={(event) => set("productPrefill", event.target.value)}
                  />
                  <TokenChips
                    tokens={[PRODUCT_TOKEN, URL_TOKEN]}
                    disabled={disabled}
                    onInsert={(token) => insertToken("productPrefill", token)}
                  />
                  <FieldDescription>
                    {t(
                      "So you can see which product a shopper is asking about. Leave it empty to use the message above.",
                    )}
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("Look and placement")}</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <ColorField
                  id="widget-color"
                  label={t("Button colour")}
                  value={settings.color}
                  onChange={(hex) => set("color", hex)}
                  swatches={WIDGET_SWATCHES}
                  invalid={!colorValid}
                  error={{ message: t("Enter a six-digit hex colour, like #25D366") }}
                />

                <Field>
                  <FieldLabel>{t("Corner")}</FieldLabel>
                  <ToggleGroup
                    variant="outline"
                    value={[settings.position]}
                    disabled={disabled}
                    onValueChange={(value) => {
                      const next = value[0];
                      if (next === "left" || next === "right") set("position", next);
                    }}
                  >
                    <ToggleGroupItem value="left">{t("Bottom left")}</ToggleGroupItem>
                    <ToggleGroupItem value="right">{t("Bottom right")}</ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <Field>
                  <FieldLabel htmlFor="widget-offset">{t("Distance from the bottom")}</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      id="widget-offset"
                      type="number"
                      className="w-24"
                      min={0}
                      max={OFFSET_MAX}
                      value={settings.offsetY}
                      disabled={disabled}
                      onChange={(event) => {
                        const value = Math.round(Number(event.target.value));
                        set("offsetY", Math.min(Math.max(value || 0, 0), OFFSET_MAX));
                      }}
                    />
                    <span className="text-sm text-muted-foreground">px</span>
                  </div>
                  <FieldDescription>
                    {t(
                      "Raise it if it covers something, like a cookie bar or another chat button.",
                    )}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>{t("Pages")}</FieldLabel>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={everywhere}
                        disabled={disabled}
                        onCheckedChange={(checked) =>
                          set("showOn", checked ? ["all"] : PAGES.map((page) => page.value))
                        }
                      />
                      {t("Every page")}
                    </label>
                    {PAGES.map((page) => (
                      <label key={page.value} className="flex items-center gap-2 pl-6 text-sm">
                        <Checkbox
                          checked={everywhere || settings.showOn.includes(page.value)}
                          disabled={disabled || everywhere}
                          onCheckedChange={(checked) => togglePage(page.value, checked)}
                        />
                        {t(page.label)}
                      </label>
                    ))}
                  </div>
                </Field>

                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="widget-hide-mobile">{t("Hide on phones")}</FieldLabel>
                    <FieldDescription>
                      {t("Only show the button on tablets and computers.")}
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="widget-hide-mobile"
                    checked={settings.hideOnMobile}
                    disabled={disabled}
                    onCheckedChange={(checked) => set("hideOnMobile", checked)}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleSave}
              loading={save.isPending}
              disabled={!canEdit || !dirty || !colorValid || needsNumber}
            >
              {t("Save")}
            </Button>
            {needsNumber && (
              <p className="text-sm text-destructive">
                {t("Choose a WhatsApp number before switching the button on.")}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("Preview")}</CardTitle>
              <CardDescription>
                {settings.enabled
                  ? t("How the button sits on your store.")
                  : t("The button is switched off, so shoppers don't see it yet.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <WidgetPreview settings={settings} />
              {preview && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("From a product page, the shopper's message starts as")}
                  </p>
                  <p className="rounded-md bg-muted p-2 text-sm break-words">{preview}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("Turn it on in your theme")}</CardTitle>
              <CardDescription>
                {t(
                  "One last step, once: switch on “WhatsApp chat button” under App embeds in your Shopify theme, then save the theme.",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.themeEditorUrl ? (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    <a href={data.themeEditorUrl} target="_blank" rel="noopener noreferrer" />
                  }
                >
                  {t("Open the theme editor")}
                  <IconExternalLink data-icon="inline-end" />
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("In Shopify, go to Online Store › Themes › Customize › App embeds.")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** The storefront WhatsApp button: its settings, a live preview and how often it is tapped. */
export default function ShopifyWidget() {
  const { t } = useTranslation();
  const query = useShopifyWidget();

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-[104px] w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("Couldn't load the WhatsApp button")}</AlertTitle>
        <AlertDescription>
          {getApiErrorMessage(query.error, t("Something went wrong"))}
          <Button variant="outline" size="sm" className="mt-2" onClick={() => query.refetch()}>
            {t("Try again")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return <WidgetEditor data={query.data} />;
}
