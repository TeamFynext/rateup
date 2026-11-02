import {
  IconAlertTriangle,
  IconHandFinger,
  IconInfoCircle,
  IconMenu2,
  IconMessageDots,
  IconMessageCircle,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type {
  MessengerIceBreaker,
  MessengerMenuItem,
  MessengerProfile,
} from "@/backend/whatsapp/messenger-profile/messengerProfile.api";
import {
  useMessengerProfile,
  useMessengerProfileMutation,
} from "@/backend/whatsapp/messenger-profile/messengerProfile.query";
import { PersistentMenuPhone } from "@/components/dashboard/instagram/instagram-preview.tsx";
import {
  ChannelPreviewButton,
  WithChannelPreview,
} from "@/components/dashboard/meta-channels/ChannelPreview.tsx";
import { ChannelSection } from "@/components/dashboard/meta-channels/ChannelSection.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useCan } from "@/hooks/usePermission.ts";

import { MessengerWelcomePhone } from "./messenger-preview.tsx";
import {
  draftMenuItem,
  isValidIceBreakers,
  isValidMenu,
  MESSENGER_LIMITS,
  type DraftMenuItem,
} from "./messengerProfile.ts";

/**
 * Loads the Page's Messenger profile for one of the welcome tools: a skeleton while it loads,
 * the error with a retry, then the tool with what is live. Each card saves straight to Meta,
 * so what loads is what is live.
 */
function ProfileTool({
  channelId,
  children,
}: Readonly<{ channelId: string; children: (profile: MessengerProfile) => ReactNode }>) {
  const { t } = useTranslation();
  const { data: profile, isPending, isError, error, refetch } = useMessengerProfile(channelId);
  const canManage = useCan("channels.manage");

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <Alert variant="destructive">
        <IconAlertTriangle />
        <AlertDescription className="flex flex-wrap items-center gap-3">
          {error?.message || t("Couldn't read this Page's Messenger profile from Meta.")}
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            {t("Try again")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {!canManage && (
        <p className="text-sm text-muted-foreground">
          {t(
            "You can view these settings. Ask an admin for the manage channels permission to change them.",
          )}
        </p>
      )}
      {children(profile)}
      <p className="flex gap-2 text-xs text-muted-foreground">
        <IconInfoCircle className="mt-0.5 size-3.5 shrink-0" />
        {t(
          "These are shown when someone opens a chat with your Page, and change in Messenger as soon as you save. A tap sends its keyword as a message, so use a keyword one of your Messenger journeys or rules answers.",
        )}
      </p>
    </div>
  );
}

/**
 * Saving needs `channels.manage` on the API; without it every control in a card is disabled
 * natively by this fieldset (`min-w-0` lets wide cards shrink to the page). The preview button
 * sits in the card's header, outside it, so it stays usable.
 */
function ManageFieldset({ children }: Readonly<{ children: ReactNode }>) {
  const canManage = useCan("channels.manage");
  return (
    <fieldset disabled={!canManage} className="min-w-0 space-y-4">
      {children}
    </fieldset>
  );
}

/** Get Started and the greeting: the welcome screen of a new chat, with its preview. */
export function MessengerWelcomeTool({
  channelId,
  pageName,
}: Readonly<{ channelId: string; pageName: string }>) {
  return (
    <ProfileTool channelId={channelId}>
      {(profile) => <WelcomeEditor channelId={channelId} profile={profile} pageName={pageName} />}
    </ProfileTool>
  );
}

function WelcomeEditor({
  channelId,
  profile,
  pageName,
}: Readonly<CardProps & { pageName: string }>) {
  // Unset until edited, so a save (which replaces the cached profile) shows Meta's copy again.
  const [getStarted, setGetStarted] = useState<string>();
  const [greeting, setGreeting] = useState<string>();
  const getStartedValue = getStarted ?? profile.getStarted ?? "";
  const greetingValue = greeting ?? profile.greeting ?? "";
  const preview = (
    <MessengerWelcomePhone
      name={pageName}
      greeting={greetingValue.trim() || null}
      getStarted={Boolean(getStartedValue.trim())}
      iceBreakers={profile.iceBreakers.map((item) => item.question)}
    />
  );

  return (
    <WithChannelPreview platform="facebook" preview={preview}>
      <div className="space-y-4">
        <GetStartedCard
          channelId={channelId}
          profile={profile}
          value={getStartedValue}
          onChange={setGetStarted}
          preview={preview}
        />
        <GreetingCard
          channelId={channelId}
          profile={profile}
          value={greetingValue}
          onChange={setGreeting}
          preview={preview}
        />
      </div>
    </WithChannelPreview>
  );
}

export function MessengerIceBreakersTool({
  channelId,
  pageName,
}: Readonly<{ channelId: string; pageName: string }>) {
  return (
    <ProfileTool channelId={channelId}>
      {(profile) => (
        // Keyed by what is live, so a save or a reload starts the card from Meta's copy.
        <IceBreakersCard
          key={`ib-${JSON.stringify(profile.iceBreakers)}`}
          channelId={channelId}
          profile={profile}
          pageName={pageName}
        />
      )}
    </ProfileTool>
  );
}

export function MessengerMenuTool({
  channelId,
  pageName,
}: Readonly<{ channelId: string; pageName: string }>) {
  return (
    <ProfileTool channelId={channelId}>
      {(profile) => (
        <PersistentMenuCard
          key={`pm-${profile.getStarted}-${JSON.stringify(profile.persistentMenu)}`}
          channelId={channelId}
          profile={profile}
          pageName={pageName}
        />
      )}
    </ProfileTool>
  );
}

interface CardProps {
  channelId: string;
  profile: MessengerProfile;
}

function LiveBadge({ live }: Readonly<{ live: boolean }>) {
  const { t } = useTranslation();
  return live ? (
    <Badge variant="secondary">{t("Live")}</Badge>
  ) : (
    <Badge variant="outline">{t("Not set")}</Badge>
  );
}

function SectionActions({
  live,
  canSave,
  pending,
  onSave,
  onRemove,
  children,
}: Readonly<{
  live: boolean;
  canSave: boolean;
  pending: boolean;
  onSave: () => void;
  onRemove: () => void;
  children?: ReactNode;
}>) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      <div className="flex-1" />
      {live && (
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={pending}>
          <IconTrash className="mr-1.5 size-4" />
          {t("Remove")}
        </Button>
      )}
      <Button type="button" size="sm" onClick={onSave} disabled={!canSave} loading={pending}>
        {t("Save")}
      </Button>
    </div>
  );
}

/** A welcome card's draft, held by `WelcomeEditor` so the preview beside both follows it. */
interface DraftProps extends CardProps {
  value: string;
  /** `undefined` drops the draft, back to what is live. */
  onChange: (value: string | undefined) => void;
  preview: ReactNode;
}

function GetStartedCard({
  channelId,
  profile,
  value: payload,
  onChange,
  preview,
}: Readonly<DraftProps>) {
  const { t } = useTranslation();
  const uid = useId();
  const confirm = useConfirm();
  const reset = { onSuccess: () => onChange(undefined) };
  const mutation = useMessengerProfileMutation(channelId, "get-started", {
    saved: t("Get Started button saved"),
    removed: t("Get Started button removed"),
  });

  const remove = async () => {
    if (profile.persistentMenu.length > 0) {
      const ok = await confirm({
        title: t("Remove Get Started button"),
        description: t(
          "Messenger only shows the persistent menu with a Get Started button, so your menu is removed too.",
        ),
        confirmText: t("Remove"),
        cancelText: t("Cancel"),
      });
      if (!ok) return;
    }
    mutation.mutate(null, reset);
  };

  const trimmed = payload.trim();

  return (
    <ChannelSection
      icon={IconHandFinger}
      title={t("Get Started button")}
      description={t(
        "People chatting with your Page for the first time tap this before they can type. It also passes on the ref of the m.me link they came from.",
      )}
      actions={
        <>
          <ChannelPreviewButton platform="facebook">{preview}</ChannelPreviewButton>
          <LiveBadge live={Boolean(profile.getStarted)} />
        </>
      }
    >
      <ManageFieldset>
        <Field>
          <FieldLabel htmlFor={`${uid}-payload`}>{t("Keyword sent on tap")}</FieldLabel>
          <Input
            id={`${uid}-payload`}
            value={payload}
            maxLength={MESSENGER_LIMITS.payload}
            placeholder={t("e.g. START")}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
        <SectionActions
          live={Boolean(profile.getStarted)}
          canSave={trimmed.length > 0 && trimmed !== profile.getStarted}
          pending={mutation.isPending}
          onSave={() => mutation.mutate({ payload: trimmed }, reset)}
          onRemove={remove}
        />
      </ManageFieldset>
    </ChannelSection>
  );
}

function GreetingCard({
  channelId,
  profile,
  value: text,
  onChange,
  preview,
}: Readonly<DraftProps>) {
  const { t } = useTranslation();
  const uid = useId();
  const reset = { onSuccess: () => onChange(undefined) };
  const mutation = useMessengerProfileMutation(channelId, "greeting", {
    saved: t("Greeting saved"),
    removed: t("Greeting removed"),
  });
  const trimmed = text.trim();

  return (
    <ChannelSection
      icon={IconMessageCircle}
      title={t("Greeting")}
      description={t("The welcome line shown above the Get Started button.")}
      actions={
        <>
          <ChannelPreviewButton platform="facebook">{preview}</ChannelPreviewButton>
          <LiveBadge live={Boolean(profile.greeting)} />
        </>
      }
    >
      <ManageFieldset>
        <Field>
          <FieldLabel htmlFor={`${uid}-greeting`}>{t("Greeting text")}</FieldLabel>
          <Textarea
            id={`${uid}-greeting`}
            value={text}
            rows={2}
            maxLength={MESSENGER_LIMITS.greeting}
            placeholder={t("e.g. Hi {name}! We usually reply within minutes.", {
              name: "{{user_first_name}}",
            })}
            onChange={(e) => onChange(e.target.value)}
          />
          <FieldDescription>
            {t("{used}/{max} characters. {name} is replaced with the person's first name.", {
              used: text.length,
              max: MESSENGER_LIMITS.greeting,
              name: "{{user_first_name}}",
            })}
          </FieldDescription>
        </Field>
        <SectionActions
          live={Boolean(profile.greeting)}
          canSave={trimmed.length > 0 && trimmed !== profile.greeting}
          pending={mutation.isPending}
          onSave={() => mutation.mutate({ text: trimmed }, reset)}
          onRemove={() => mutation.mutate(null, reset)}
        />
      </ManageFieldset>
    </ChannelSection>
  );
}

function IceBreakersCard({
  channelId,
  profile,
  pageName,
}: Readonly<CardProps & { pageName: string }>) {
  const { t } = useTranslation();
  const uid = useId();
  const [items, setItems] = useState<Array<MessengerIceBreaker & { id: string }>>(() =>
    (profile.iceBreakers.length ? profile.iceBreakers : [{ question: "", payload: "" }]).map(
      (item) => ({ ...item, id: crypto.randomUUID() }),
    ),
  );
  const mutation = useMessengerProfileMutation(channelId, "ice-breakers", {
    saved: t("Ice breakers saved"),
    removed: t("Ice breakers removed"),
  });
  const live = profile.iceBreakers.length > 0;
  const cleaned = items.map(({ question, payload }) => ({
    question: question.trim(),
    payload: payload.trim(),
  }));
  const changed = JSON.stringify(cleaned) !== JSON.stringify(profile.iceBreakers);

  const update = (index: number, patch: Partial<MessengerIceBreaker>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const preview = (
    <MessengerWelcomePhone
      name={pageName}
      greeting={profile.greeting}
      getStarted={Boolean(profile.getStarted)}
      iceBreakers={items.map((item) => item.question)}
    />
  );

  return (
    <WithChannelPreview platform="facebook" preview={preview}>
      <ChannelSection
        icon={IconMessageDots}
        title={t("Ice breakers")}
        description={t(
          "Up to 4 questions people can tap to start a chat. Messenger may show them in place of the Get Started button.",
        )}
        actions={
          <>
            <ChannelPreviewButton platform="facebook">{preview}</ChannelPreviewButton>
            <Badge variant="outline" className="tabular-nums">
              {items.length}/{MESSENGER_LIMITS.iceBreakers}
            </Badge>
          </>
        }
      >
        <ManageFieldset>
          {items.map((item, index) => (
            <div key={item.id} className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {t("Question {number}", { number: index + 1 })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("Remove question")}
                  className="size-8 text-muted-foreground hover:text-destructive"
                  disabled={items.length <= 1}
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                >
                  <IconTrash className="size-4" />
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${uid}-q-${index}`}>{t("Question text")}</FieldLabel>
                  <Input
                    id={`${uid}-q-${index}`}
                    value={item.question}
                    maxLength={MESSENGER_LIMITS.question}
                    placeholder={t("e.g. What are your business hours?")}
                    onChange={(e) => update(index, { question: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${uid}-p-${index}`}>{t("Keyword sent on tap")}</FieldLabel>
                  <Input
                    id={`${uid}-p-${index}`}
                    value={item.payload}
                    maxLength={MESSENGER_LIMITS.payload}
                    placeholder={t("e.g. HOURS")}
                    onChange={(e) => update(index, { payload: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          ))}
          <SectionActions
            live={live}
            canSave={changed && isValidIceBreakers(cleaned)}
            pending={mutation.isPending}
            onSave={() => mutation.mutate({ iceBreakers: cleaned })}
            onRemove={() => mutation.mutate(null)}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={items.length >= MESSENGER_LIMITS.iceBreakers}
              onClick={() =>
                setItems((current) => [
                  ...current,
                  { id: crypto.randomUUID(), question: "", payload: "" },
                ])
              }
            >
              <IconPlus className="mr-1.5 size-4" />
              {t("Add question")}
            </Button>
          </SectionActions>
        </ManageFieldset>
      </ChannelSection>
    </WithChannelPreview>
  );
}

function PersistentMenuCard({
  channelId,
  profile,
  pageName,
}: Readonly<CardProps & { pageName: string }>) {
  const { t } = useTranslation();
  const canManage = useCan("channels.manage");
  const uid = useId();
  const [items, setItems] = useState<DraftMenuItem[]>(() =>
    profile.persistentMenu.length ? profile.persistentMenu.map(draftMenuItem) : [draftMenuItem()],
  );
  const mutation = useMessengerProfileMutation(channelId, "persistent-menu", {
    saved: t("Menu saved"),
    removed: t("Menu removed"),
  });
  const hasGetStarted = Boolean(profile.getStarted);
  const live = profile.persistentMenu.length > 0;
  const cleaned: MessengerMenuItem[] = items.map((item) =>
    item.type === "postback"
      ? { type: "postback", title: item.title.trim(), payload: item.payload.trim() }
      : { type: "web_url", title: item.title.trim(), url: item.url.trim() },
  );
  const changed = JSON.stringify(cleaned) !== JSON.stringify(profile.persistentMenu);

  const update = (index: number, patch: Partial<DraftMenuItem>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const preview = <PersistentMenuPhone items={items} businessName={pageName} />;

  return (
    <WithChannelPreview platform="facebook" preview={preview}>
      <ChannelSection
        icon={IconMenu2}
        title={t("Persistent menu")}
        description={t(
          "The menu next to the message box, always available. Items send a keyword or open a website.",
        )}
        actions={
          <>
            <ChannelPreviewButton platform="facebook">{preview}</ChannelPreviewButton>
            <Badge variant="outline" className="tabular-nums">
              {items.length}/{MESSENGER_LIMITS.menuItems}
            </Badge>
          </>
        }
      >
        <ManageFieldset>
          {!hasGetStarted && (
            <Alert>
              <IconInfoCircle />
              <AlertDescription>
                {t("Messenger only shows a persistent menu once a Get Started button is set.")}
              </AlertDescription>
            </Alert>
          )}
          {items.map((item, index) => (
            <div key={item.id} className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {t("Item {number}", { number: index + 1 })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("Remove item")}
                  className="size-8 text-muted-foreground hover:text-destructive"
                  disabled={items.length <= 1}
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                >
                  <IconTrash className="size-4" />
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor={`${uid}-type-${index}`}>{t("Action")}</FieldLabel>
                  <Select
                    // A fieldset does not reach Base UI's Select, so it is disabled explicitly.
                    disabled={!canManage}
                    value={item.type}
                    onValueChange={(v) => update(index, { type: v ?? "postback" })}
                    items={[
                      { value: "postback", label: t("Send a keyword") },
                      { value: "web_url", label: t("Open a website") },
                    ]}
                  >
                    <SelectTrigger id={`${uid}-type-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="postback">{t("Send a keyword")}</SelectItem>
                      <SelectItem value="web_url">{t("Open a website")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${uid}-title-${index}`}>{t("Title")}</FieldLabel>
                  <Input
                    id={`${uid}-title-${index}`}
                    value={item.title}
                    maxLength={MESSENGER_LIMITS.menuTitle}
                    placeholder={t("e.g. Talk to an agent")}
                    onChange={(e) => update(index, { title: e.target.value })}
                  />
                </Field>
                {item.type === "postback" ? (
                  <Field>
                    <FieldLabel htmlFor={`${uid}-value-${index}`}>
                      {t("Keyword sent on tap")}
                    </FieldLabel>
                    <Input
                      id={`${uid}-value-${index}`}
                      value={item.payload}
                      maxLength={MESSENGER_LIMITS.payload}
                      placeholder={t("e.g. AGENT")}
                      onChange={(e) => update(index, { payload: e.target.value })}
                    />
                  </Field>
                ) : (
                  <Field>
                    <FieldLabel htmlFor={`${uid}-value-${index}`}>{t("URL")}</FieldLabel>
                    <Input
                      id={`${uid}-value-${index}`}
                      value={item.url}
                      type="url"
                      placeholder="https://example.com"
                      onChange={(e) => update(index, { url: e.target.value })}
                    />
                  </Field>
                )}
              </div>
            </div>
          ))}
          <SectionActions
            live={live}
            canSave={hasGetStarted && changed && isValidMenu(cleaned)}
            pending={mutation.isPending}
            onSave={() => mutation.mutate({ persistentMenu: cleaned })}
            onRemove={() => mutation.mutate(null)}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={items.length >= MESSENGER_LIMITS.menuItems}
              onClick={() => setItems((current) => [...current, draftMenuItem()])}
            >
              <IconPlus className="mr-1.5 size-4" />
              {t("Add item")}
            </Button>
          </SectionActions>
        </ManageFieldset>
      </ChannelSection>
    </WithChannelPreview>
  );
}
