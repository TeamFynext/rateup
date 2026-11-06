import { IconAlertTriangle, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import type {
  ApiKey,
  ApiKeyFeature,
  ApiKeyMode,
  ApiKeyVersion,
} from "@/backend/apiKeys/apiKeys.api.ts";
import {
  useCreateApiKey,
  useRotateApiKey,
  useUpdateApiKey,
} from "@/backend/apiKeys/apiKeys.query.ts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { DatePicker } from "@/components/ui/date-picker.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Input } from "@/components/ui/input.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";

import { ApiCopyButton } from "./ApiCopyButton.tsx";
import { DEFAULT_GRACE_HOURS, GRACE_OPTIONS, type GraceHours } from "./apiKeyFormat.ts";
import { ApiScopePicker } from "./ApiScopePicker.tsx";

/** A freshly issued key: the plaintext, the record it belongs to, and for a rotation the old key's end. */
export interface RevealedKey {
  apiKey: string;
  key: ApiKey;
  previousKeyExpiresAt?: string;
}

const isPast = (date: Date) => dayjs(date).isBefore(dayjs(), "day");

// ---- create / edit ----

/**
 * One form for both creating a key and editing one. Version, mode and expiry are only set at
 * creation: a key's prefix carries its mode, a key opens one API version for good, and a later
 * expiry is what rotation is for.
 */
export function ApiKeyFormDialog({
  open,
  onOpenChange,
  editing,
  onCreated,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The key being edited; absent to create one. */
  editing?: ApiKey;
  onCreated: (revealed: RevealedKey) => void;
}>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Capped at the viewport, so a short screen scrolls the fields rather than the page. */}
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-lg">
        {/* Keyed so the form starts from the key being edited each time it opens. */}
        {open && (
          <ApiKeyForm
            key={editing?.id ?? "new"}
            editing={editing}
            onDone={() => onOpenChange(false)}
            onCreated={onCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ApiKeyForm({
  editing,
  onDone,
  onCreated,
}: Readonly<{
  editing?: ApiKey;
  onDone: () => void;
  onCreated: (revealed: RevealedKey) => void;
}>) {
  const { t } = useTranslation();
  const uid = useId();
  const create = useCreateApiKey();
  const update = useUpdateApiKey();

  const [name, setName] = useState(editing?.name ?? "");
  const [version, setVersion] = useState<ApiKeyVersion>(editing?.version ?? "v2");
  const [mode, setMode] = useState<ApiKeyMode>(editing?.mode ?? "live");
  // Only a legacy key minted before scopes existed has an empty list (full access). Every
  // new key, and every key already limited, names at least one feature.
  const legacyFullAccess = editing !== undefined && editing.scopes.length === 0;
  const [restricted, setRestricted] = useState(!legacyFullAccess);
  const [features, setFeatures] = useState<Set<ApiKeyFeature>>(
    () => new Set(editing && editing.scopes.length > 0 ? editing.features : []),
  );
  // Limited permission by permission before keys were limited by feature: saving with a
  // feature selection replaces that list.
  const customScopes = Boolean(
    editing && editing.scopes.length > 0 && editing.features.length === 0,
  );
  const [expiresOn, setExpiresOn] = useState<Date | undefined>();
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted && !name.trim() ? t("Give the key a name") : null;
  const scopeError =
    submitted && restricted && features.size === 0 ? t("Pick at least one feature") : null;
  const pending = create.isPending || update.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!name.trim() || (restricted && features.size === 0)) return;
    const nextFeatures = [...features];

    if (editing) {
      update.mutate(
        // A legacy full-access key kept as it is sends no features, leaving its scopes alone.
        { keyId: editing.id, name: name.trim(), ...(restricted ? { features: nextFeatures } : {}) },
        { onSuccess: onDone },
      );
      return;
    }
    create.mutate(
      {
        name: name.trim(),
        version,
        // v1 has no test keys; the API forces live anyway, this just says so.
        mode: version === "v1" ? "live" : mode,
        features: nextFeatures,
        expiresAt: expiresOn ? dayjs(expiresOn).endOf("day").toISOString() : null,
      },
      {
        onSuccess: ({ apiKey, key }) => {
          onDone();
          onCreated({ apiKey, key });
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{editing ? t("Edit API key") : t("Create API key")}</DialogTitle>
        <DialogDescription>
          {editing
            ? t("Changes apply to the key straight away; its value stays the same.")
            : t(
                "Give each integration its own key, so you can rotate or revoke one without touching the others.",
              )}
        </DialogDescription>
      </DialogHeader>

      {/* Header and footer stay put; only the fields scroll. The negative margin and matching
          padding keep focus rings from being clipped at the scroll edge. */}
      <FieldGroup className="-mx-1 min-h-0 flex-1 gap-5 overflow-y-auto overscroll-contain px-1">
        <Field data-invalid={nameError ? true : undefined}>
          <FieldLabel htmlFor={`${uid}-name`}>{t("Name")}</FieldLabel>
          <Input
            id={`${uid}-name`}
            value={name}
            maxLength={80}
            autoFocus
            placeholder={t("e.g. Production POS")}
            aria-invalid={nameError ? true : undefined}
            onChange={(event) => setName(event.target.value)}
          />
          <FieldError>{nameError}</FieldError>
        </Field>

        {!editing && (
          <FieldSet className="gap-2">
            <FieldLegend variant="label">{t("API version")}</FieldLegend>
            <RadioGroup
              value={version}
              onValueChange={(value) => setVersion(value === "v1" ? "v1" : "v2")}
              className="flex flex-row gap-4"
            >
              <FieldLabel htmlFor={`${uid}-v2`} className="items-center font-normal">
                <RadioGroupItem id={`${uid}-v2`} value="v2" />
                {t("v2 (recommended)")}
              </FieldLabel>
              <FieldLabel htmlFor={`${uid}-v1`} className="items-center font-normal">
                <RadioGroupItem id={`${uid}-v1`} value="v1" />
                {t("v1 (legacy)")}
              </FieldLabel>
            </RadioGroup>
            <FieldDescription>
              {version === "v2"
                ? t(
                    "v2 keys call {path}, with no organisation ID in the URL. A key works on its own version only.",
                    { path: "/api/external/v2" },
                  )
                : t(
                    "v1 keys call {path} and get the old response shapes. Only for integrations still built on v1; v1 keys are always live.",
                    { path: "/api/external/v1/<orgId>" },
                  )}
            </FieldDescription>
          </FieldSet>
        )}

        {!editing && version === "v2" && (
          <FieldSet className="gap-2">
            <FieldLegend variant="label">{t("Mode")}</FieldLegend>
            <RadioGroup
              value={mode}
              onValueChange={(value) => setMode(value === "test" ? "test" : "live")}
              className="flex flex-row gap-4"
            >
              <FieldLabel htmlFor={`${uid}-live`} className="items-center font-normal">
                <RadioGroupItem id={`${uid}-live`} value="live" />
                {t("Live")}
              </FieldLabel>
              <FieldLabel htmlFor={`${uid}-test`} className="items-center font-normal">
                <RadioGroupItem id={`${uid}-test`} value="test" />
                {t("Test")}
              </FieldLabel>
            </RadioGroup>
            <FieldDescription>
              {t(
                "Test keys work like live ones but can't send WhatsApp messages, so you can build against real data safely.",
              )}
            </FieldDescription>
          </FieldSet>
        )}

        <div className="flex flex-col gap-2">
          <ApiScopePicker
            legacyFullAccess={legacyFullAccess}
            restricted={restricted}
            onRestrictedChange={setRestricted}
            features={features}
            onFeaturesChange={setFeatures}
          />
          {customScopes && (
            <FieldDescription>
              {t(
                "This key was limited to individual permissions. Saving replaces them with the features selected here.",
              )}
            </FieldDescription>
          )}
          <FieldError>{scopeError}</FieldError>
        </div>

        {!editing && (
          <Field>
            <FieldLabel htmlFor={`${uid}-expiry`}>{t("Expiry (optional)")}</FieldLabel>
            <div className="flex items-center gap-2">
              <DatePicker
                id={`${uid}-expiry`}
                value={expiresOn}
                onChange={setExpiresOn}
                disabled={isPast}
                placeholder={t("Never expires")}
                className="w-full sm:w-56"
              />
              {expiresOn && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("Clear expiry")}
                  onClick={() => setExpiresOn(undefined)}
                >
                  <IconX />
                </Button>
              )}
            </div>
            <FieldDescription>
              {t("The key stops working at the end of this day.")}
            </FieldDescription>
          </Field>
        )}
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("Cancel")}
        </Button>
        <Button type="submit" loading={pending}>
          {editing ? t("Save") : t("Create key")}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ---- rotate ----

export function RotateApiKeyDialog({
  apiKey,
  onOpenChange,
  onRotated,
}: Readonly<{
  /** The key to rotate; `undefined` closes the dialog. */
  apiKey: ApiKey | undefined;
  onOpenChange: (open: boolean) => void;
  onRotated: (revealed: RevealedKey) => void;
}>) {
  const { t } = useTranslation();
  const uid = useId();
  const rotate = useRotateApiKey();
  const [grace, setGrace] = useState<GraceHours>(DEFAULT_GRACE_HOURS);

  const graceLabel: Record<GraceHours, string> = {
    0: t("Immediately"),
    1: t("After 1 hour"),
    24: t("After 24 hours"),
    168: t("After 7 days"),
  };

  function handleRotate() {
    if (!apiKey) return;
    rotate.mutate(
      { keyId: apiKey.id, graceHours: grace },
      {
        onSuccess: (data) => {
          onOpenChange(false);
          setGrace(DEFAULT_GRACE_HOURS);
          onRotated(data);
        },
      },
    );
  }

  return (
    <Dialog open={apiKey !== undefined} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Rotate “{name}”", { name: apiKey?.name ?? "" })}</DialogTitle>
          <DialogDescription>
            {t(
              "A new key is issued with the same name, mode and permissions. Keep the old one working long enough to redeploy with the new value.",
            )}
          </DialogDescription>
        </DialogHeader>

        <FieldSet className="gap-2">
          <FieldLegend variant="label">{t("Old key stops working")}</FieldLegend>
          <RadioGroup
            value={String(grace)}
            onValueChange={(value) => {
              const hours = GRACE_OPTIONS.find((option) => String(option) === value);
              if (hours !== undefined) setGrace(hours);
            }}
            className="gap-2"
          >
            {GRACE_OPTIONS.map((hours) => (
              <FieldLabel
                key={hours}
                htmlFor={`${uid}-${hours}`}
                className="items-center font-normal"
              >
                <RadioGroupItem id={`${uid}-${hours}`} value={String(hours)} />
                {graceLabel[hours]}
              </FieldLabel>
            ))}
          </RadioGroup>
        </FieldSet>

        {grace === 0 && (
          <Alert variant="destructive">
            <IconAlertTriangle />
            <AlertDescription>
              {t("Anything still using the old key will start failing as soon as you rotate.")}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button type="button" onClick={handleRotate} loading={rotate.isPending}>
            {t("Rotate key")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- show once ----

/** The only time a key's value is on screen. Closing it is the user saying they have it. */
export function RevealApiKeyDialog({
  revealed,
  onClose,
}: Readonly<{ revealed: RevealedKey | null; onClose: () => void }>) {
  const { t } = useTranslation();
  const uid = useId();
  const previousEnds = revealed?.previousKeyExpiresAt ? dayjs(revealed.previousKeyExpiresAt) : null;

  return (
    <Dialog
      open={revealed !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      // A stray click outside must not throw away a key that can never be shown again.
      disablePointerDismissal
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Copy your new API key")}</DialogTitle>
          <DialogDescription>{revealed?.key.name}</DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor={`${uid}-key`}>{t("Key")}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id={`${uid}-key`}
              readOnly
              value={revealed?.apiKey ?? ""}
              className="font-mono"
              onFocus={(event) => event.currentTarget.select()}
            />
            <InputGroupAddon align="inline-end">
              <ApiCopyButton value={revealed?.apiKey ?? ""} />
            </InputGroupAddon>
          </InputGroup>
        </Field>

        <Alert>
          <IconAlertTriangle />
          <AlertTitle>{t("You won't see this key again")}</AlertTitle>
          <AlertDescription>
            {t(
              "Store it somewhere safe, like your server's secret manager. If you lose it, rotate the key to get a new one.",
            )}
          </AlertDescription>
        </Alert>

        {previousEnds && (
          <p className="text-sm text-muted-foreground">
            {previousEnds.isAfter(dayjs())
              ? t("The previous key keeps working until {time}.", {
                  time: previousEnds.format("D MMM YYYY, h:mm A"),
                })
              : t("The previous key has stopped working.")}
          </p>
        )}

        <DialogFooter>
          <Button type="button" onClick={onClose}>
            {t("I've copied it")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
