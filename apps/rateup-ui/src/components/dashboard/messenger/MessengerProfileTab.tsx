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
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
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

import {
  draftMenuItem,
  isValidIceBreakers,
  isValidMenu,
  MESSENGER_LIMITS,
  type DraftMenuItem,
} from "./messengerProfile.ts";

/**
 * What people see before they type: Get Started, the greeting, ice breakers and the
 * persistent menu. Each card saves straight to Meta, so what loads is what is live.
 */
export function MessengerProfileTab({ channelId }: Readonly<{ channelId: string }>) {
  const { t } = useTranslation();
  const { data: profile, isPending, isError, error, refetch } = useMessengerProfile(channelId);

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
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
      <Alert>
        <IconInfoCircle />
        <AlertDescription>
          {t(
            "These are shown when someone opens a chat with your Page, and change in Messenger as soon as you save. A tap sends its keyword as a message, so use a keyword one of your Messenger chatbots or rules answers.",
          )}
        </AlertDescription>
      </Alert>
      {/* Keyed by what is live, so a save or a reload starts each card from Meta's copy. */}
      <GetStartedCard key={`gs-${profile.getStarted}`} channelId={channelId} profile={profile} />
      <GreetingCard key={`gr-${profile.greeting}`} channelId={channelId} profile={profile} />
      <IceBreakersCard
        key={`ib-${JSON.stringify(profile.iceBreakers)}`}
        channelId={channelId}
        profile={profile}
      />
      <PersistentMenuCard
        key={`pm-${profile.getStarted}-${JSON.stringify(profile.persistentMenu)}`}
        channelId={channelId}
        profile={profile}
      />
    </div>
  );
}

interface CardProps {
  channelId: string;
  profile: MessengerProfile;
}

function SectionCard({
  icon,
  title,
  description,
  badge,
  children,
}: Readonly<{
  icon: ReactNode;
  title: string;
  description: string;
  badge?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ru-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            {icon}
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {badge}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
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

function GetStartedCard({ channelId, profile }: Readonly<CardProps>) {
  const { t } = useTranslation();
  const uid = useId();
  const confirm = useConfirm();
  const [payload, setPayload] = useState(profile.getStarted ?? "");
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
    mutation.mutate(null);
  };

  const trimmed = payload.trim();

  return (
    <SectionCard
      icon={<IconHandFinger className="size-4.5" />}
      title={t("Get Started button")}
      description={t(
        "People chatting with your Page for the first time tap this before they can type. It also passes on the ref of the m.me link they came from.",
      )}
      badge={<LiveBadge live={Boolean(profile.getStarted)} />}
    >
      <Field>
        <FieldLabel htmlFor={`${uid}-payload`}>{t("Keyword sent on tap")}</FieldLabel>
        <Input
          id={`${uid}-payload`}
          value={payload}
          maxLength={MESSENGER_LIMITS.payload}
          placeholder={t("e.g. START")}
          onChange={(e) => setPayload(e.target.value)}
        />
      </Field>
      <SectionActions
        live={Boolean(profile.getStarted)}
        canSave={trimmed.length > 0 && trimmed !== profile.getStarted}
        pending={mutation.isPending}
        onSave={() => mutation.mutate({ payload: trimmed })}
        onRemove={remove}
      />
    </SectionCard>
  );
}

function GreetingCard({ channelId, profile }: Readonly<CardProps>) {
  const { t } = useTranslation();
  const uid = useId();
  const [text, setText] = useState(profile.greeting ?? "");
  const mutation = useMessengerProfileMutation(channelId, "greeting", {
    saved: t("Greeting saved"),
    removed: t("Greeting removed"),
  });
  const trimmed = text.trim();

  return (
    <SectionCard
      icon={<IconMessageCircle className="size-4.5" />}
      title={t("Greeting")}
      description={t("The welcome line shown above the Get Started button.")}
      badge={<LiveBadge live={Boolean(profile.greeting)} />}
    >
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
          onChange={(e) => setText(e.target.value)}
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
        onSave={() => mutation.mutate({ text: trimmed })}
        onRemove={() => mutation.mutate(null)}
      />
    </SectionCard>
  );
}

function IceBreakersCard({ channelId, profile }: Readonly<CardProps>) {
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

  return (
    <SectionCard
      icon={<IconMessageDots className="size-4.5" />}
      title={t("Ice breakers")}
      description={t(
        "Up to 4 questions people can tap to start a chat. Messenger may show them in place of the Get Started button.",
      )}
      badge={
        <Badge variant="outline" className="tabular-nums">
          {items.length}/{MESSENGER_LIMITS.iceBreakers}
        </Badge>
      }
    >
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
    </SectionCard>
  );
}

function PersistentMenuCard({ channelId, profile }: Readonly<CardProps>) {
  const { t } = useTranslation();
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

  return (
    <SectionCard
      icon={<IconMenu2 className="size-4.5" />}
      title={t("Persistent menu")}
      description={t(
        "The menu next to the message box, always available. Items send a keyword or open a website.",
      )}
      badge={
        <Badge variant="outline" className="tabular-nums">
          {items.length}/{MESSENGER_LIMITS.menuItems}
        </Badge>
      }
    >
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
    </SectionCard>
  );
}
