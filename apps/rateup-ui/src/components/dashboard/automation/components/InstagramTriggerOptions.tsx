import { IconCheck, IconCopy, IconQrcode } from "@tabler/icons-react";
import { useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { useChannels } from "@/backend/channels/channels.query";
import { useInstagramStories } from "@/backend/whatsapp/instagram-profile/instagramProfile.query";
import { igMeLink } from "@/components/dashboard/instagram/igMeLink.ts";
import { downloadIgMeQr } from "@/components/dashboard/instagram/igMeQr.ts";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldError, FieldTitle } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { TagsInput } from "@/components/ui/tags-input.tsx";
import { cn } from "@/lib/utils.ts";

import type { CreateRuleInput } from "./schema.ts";
import { INSTAGRAM_COMMENT_SOURCES } from "./schema.ts";

/** Which comments the rule answers: posts and reels, live videos, or both. */
export function InstagramCommentSource() {
  const { control, setValue } = useFormContext<CreateRuleInput>();

  return (
    <Controller
      control={control}
      name="options.instagramCommentSource"
      render={({ field }) => (
        <div className="space-y-2">
          <span className="block text-sm font-medium">Comments on</span>
          <div className="grid grid-cols-3 gap-2">
            {INSTAGRAM_COMMENT_SOURCES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  field.onChange(option.value);
                  // A live video is never in the post list, so a post filter would block it.
                  if (option.value === "LIVE") {
                    setValue("options.instagramScope", "ALL");
                    setValue("options.instagramPostIds", []);
                  }
                }}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  (field.value ?? "ALL") === option.value
                    ? "border-foreground/20 bg-foreground/5 text-foreground"
                    : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    />
  );
}

/** The ?ref= an "ig.me link opened" rule answers, with the link it produces. */
export function InstagramLinkRef() {
  const { control } = useFormContext<CreateRuleInput>();
  const [ibaId] = useWatch({ control, name: "whatsappSettingsPhoneIds" }) ?? [];
  const ref = useWatch({ control, name: "options.instagramRef" }) ?? "";
  const { data: channels } = useChannels(true, "INSTAGRAM");
  // An Instagram rule's channel id is the account id, which the registry keeps as `accountId`.
  const username = channels?.find((channel) => channel.accountId === ibaId)?.username;
  const link = igMeLink(username, ref);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-3 bg-card ring-foreground/10 rounded-xl p-4 ring-1">
      <Controller
        control={control}
        name="options.instagramRef"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldTitle>Link name</FieldTitle>
            <Input
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="summer_sale"
              maxLength={2083}
            />
            <FieldDescription>
              Becomes the link's <code>?ref=</code>. Leave it empty to answer every ig.me link, and
              ads that open the chat with a ref.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-sm">
          {link || (
            <span className="text-muted-foreground">Pick an Instagram account to see the link</span>
          )}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={copy} disabled={!link}>
          {copied ? <IconCheck className="size-4" /> : <IconCopy className="size-4" />}
          <span className="sr-only">Copy link</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!link}
          onClick={() => void downloadIgMeQr(link, ref || username || "link")}
        >
          <IconQrcode className="size-4" />
          <span className="sr-only">Download QR code</span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Someone already chatting with you starts this rule the moment they open the link. Someone
        new starts it with their first message, or by tapping an ice breaker.
      </p>
    </div>
  );
}

const STORY_SCOPES = [
  { value: "ALL", label: "Any story" },
  { value: "SPECIFIC", label: "Specific stories" },
] as const;

/**
 * Which story replies the rule answers: any story or the picked ones, narrowed by keywords.
 * Stories disappear after 24 hours, so a rule on specific stories stops firing with them —
 * "Any story" plus a keyword is what lasts ("reply GUIDE to get the guide").
 */
export function InstagramStoryReplyOptions() {
  const { control, setValue } = useFormContext<CreateRuleInput>();
  const [ibaId] = useWatch({ control, name: "whatsappSettingsPhoneIds" }) ?? [];
  const scope = useWatch({ control, name: "options.instagramStoryScope" }) ?? "ALL";
  const { data: stories, isLoading } = useInstagramStories(
    scope === "SPECIFIC" ? ibaId : undefined,
  );
  const storyOptions = (stories ?? []).map((story) => ({
    value: story.id,
    label: `${story.media_type === "VIDEO" ? "Video" : "Photo"} story · ${new Date(
      story.timestamp,
    ).toLocaleString()}`,
  }));

  return (
    <div className="space-y-4 bg-card ring-foreground/10 rounded-xl p-4 ring-1">
      <Controller
        control={control}
        name="options.instagramStoryScope"
        render={({ field }) => (
          <div className="space-y-2">
            <span className="block text-sm font-medium">Replies to</span>
            <div className="grid grid-cols-2 gap-2">
              {STORY_SCOPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    field.onChange(option.value);
                    if (option.value === "ALL") setValue("options.instagramStoryIds", []);
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    (field.value ?? "ALL") === option.value
                      ? "border-foreground/20 bg-foreground/5 text-foreground"
                      : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      />

      {scope === "SPECIFIC" && (
        <Controller
          control={control}
          name="options.instagramStoryIds"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldTitle>Stories</FieldTitle>
              {ibaId ? (
                <MultiSelect
                  options={storyOptions}
                  value={field.value ?? []}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                  placeholder={isLoading ? "Loading…" : "Select stories…"}
                  emptyIndicator="No live stories. Stories disappear after 24 hours."
                />
              ) : (
                <FieldDescription>Pick an Instagram account to load its stories.</FieldDescription>
              )}
              <FieldDescription>
                The rule stops answering a story once it expires, 24 hours after you post it.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      )}

      <Controller
        control={control}
        name="options.instagramStoryKeywords"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldTitle>Keywords</FieldTitle>
            <TagsInput
              value={field.value ?? []}
              onValueChange={field.onChange}
              placeholder="GUIDE, price…"
              maxTags={50}
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription>
              Answers replies containing one of these words. Leave empty to answer every reply.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </div>
  );
}
