import {
  IconAlertCircle,
  IconBrandMeta,
  IconCircleCheckFilled,
  IconPlus,
  IconSparkles,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";

import type { LibraryTemplate } from "@/backend/whatsapp/whatsapp.api";
import { useTemplateLibrary } from "@/backend/whatsapp/whatsapp.query";
import { ListPageSearchInput } from "@/components/common/list-page-layout.tsx";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import useDebounce from "@/components/menu/hook/useDebounce.ts";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { cn } from "@/lib/utils.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { humanize } from "./library.ts";
import type { StarterTemplate } from "./starter-templates.ts";
import { STARTER_TEMPLATES } from "./starter-templates.ts";

/** What the reader picked on the first step. */
export type TemplateStart =
  | { kind: "scratch" }
  | { kind: "starter"; starter: StarterTemplate }
  | { kind: "library"; entry: LibraryTemplate };

export type StartSource = "library" | "starters";

const CARD =
  "bg-card ring-foreground/10 flex flex-col gap-2 rounded-xl p-4 text-left ring-1 transition-shadow hover:shadow-md focus-visible:ring-ring outline-none focus-visible:ring-2";

function Chips<T extends string>({
  options,
  value,
  onChange,
  label,
}: Readonly<{
  options: readonly { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}>) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((chip) => {
        const on = chip.value === value;
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(chip.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors outline-none",
              "focus-visible:ring-ring focus-visible:ring-2",
              on
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {chip.label}
            {chip.count !== undefined && (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  on ? "text-primary/70" : "text-muted-foreground/70",
                )}
              >
                {chip.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The body as the customer reads it, with `{{n}}` kept visible as placeholders. */
function BodyPreview({ text, lines = 4 }: Readonly<{ text: string; lines?: 3 | 4 }>) {
  return (
    <p
      className={cn(
        "text-muted-foreground bg-muted/60 border-border/50 rounded-lg border px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap",
        lines === 4 ? "line-clamp-4" : "line-clamp-3",
      )}
    >
      {text}
    </p>
  );
}

function ButtonChips({ buttons }: Readonly<{ buttons: readonly { text?: string }[] }>) {
  const labelled = buttons.filter((button) => button.text);
  if (!labelled.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {labelled.map((button, index) => (
        <span
          key={index}
          className="bg-primary/5 text-primary border-primary/15 rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
        >
          {button.text}
        </span>
      ))}
    </div>
  );
}

function ScratchCard({ onPick }: Readonly<{ onPick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "border-border flex flex-col gap-1.5 rounded-xl border border-dashed p-4 text-left transition-colors",
        "hover:bg-muted/50 focus-visible:ring-ring outline-none focus-visible:ring-2",
      )}
    >
      <span className="flex items-center gap-2">
        <IconPlus className="text-primary size-4" aria-hidden />
        <span className="font-display text-[14.5px] font-semibold">Start from scratch</span>
      </span>
      <span className="text-muted-foreground text-[13px] leading-normal text-pretty">
        Write your own header, message and buttons. Any category, including Marketing.
      </span>
    </button>
  );
}

const LIBRARY_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "UTILITY", label: "Utility" },
  { value: "AUTHENTICATION", label: "Authentication" },
] as const;
type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number]["value"];

function LibraryGallery({
  channelId,
  onChannelChange,
  language,
  selectedName,
  onPick,
  onScratch,
}: Readonly<{
  channelId: string;
  onChannelChange: (id: string) => void;
  language: string;
  selectedName?: string;
  onPick: (entry: LibraryTemplate) => void;
  onScratch: () => void;
}>) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search.trim(), 300);
  const [category, setCategory] = useState<LibraryCategory>("all");
  const [topic, setTopic] = useState("all");

  const library = useTemplateLibrary({
    whatsappSettingsPhoneId: channelId,
    search: debounced || undefined,
    language,
    category: category === "all" ? undefined : category,
  });
  const entries = useMemo(
    () => library.data?.pages.flatMap((page) => page.data) ?? [],
    [library.data],
  );

  // Topic chips come from what Meta returned, so they never offer an empty filter and
  // keep Meta's own spelling.
  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      if (entry.topic) counts.set(entry.topic, (counts.get(entry.topic) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: humanize(value), count }));
  }, [entries]);
  const shown = topic === "all" ? entries : entries.filter((entry) => entry.topic === topic);

  return (
    <div className="flex flex-col gap-4 @container">
      <div className="flex flex-wrap items-end gap-3">
        <ListPageSearchInput
          className="min-w-56 flex-1"
          placeholder="Search Meta's library: delivery, payment, appointment…"
          value={search}
          onChange={setSearch}
        />
        <div className="w-64">
          <AccountSelector
            value={channelId}
            onChange={(value) => onChannelChange(value ?? "")}
            hideLabel
            optional={false}
          />
        </div>
      </div>
      <Chips
        label="Category"
        options={LIBRARY_CATEGORIES}
        value={category}
        onChange={(value) => {
          setCategory(value);
          setTopic("all");
        }}
      />
      {topics.length > 1 && (
        <Chips
          label="Topic"
          options={[{ value: "all", label: "All topics", count: entries.length }, ...topics]}
          value={topic}
          onChange={setTopic}
        />
      )}

      {!channelId && (
        <Alert>
          <IconAlertCircle />
          <AlertDescription>
            Pick a WhatsApp number to browse the templates its account can use.
          </AlertDescription>
        </Alert>
      )}
      {library.isError && (
        <Alert variant="destructive">
          <IconAlertCircle />
          <AlertDescription>
            {getApiErrorMessage(library.error, "Couldn't load Meta's template library.")}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 @xl:grid-cols-2 @3xl:grid-cols-3">
        <ScratchCard onPick={onScratch} />
        {library.isPending && channelId
          ? Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-44 rounded-xl" />
            ))
          : shown.map((entry) => {
              const selected = entry.name === selectedName;
              return (
                <button
                  key={`${entry.name}:${entry.language}`}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onPick(entry)}
                  className={cn(CARD, selected && "ring-primary ring-[1.5px]")}
                >
                  <span className="flex items-start gap-2">
                    <span className="flex min-w-0 flex-col">
                      <span className="font-display truncate text-[14.5px] font-semibold">
                        {humanize(entry.name)}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">
                        {humanize(entry.usecase ?? entry.topic)}
                      </span>
                    </span>
                    {selected && (
                      <IconCircleCheckFilled
                        className="text-primary ml-auto size-4 shrink-0"
                        aria-hidden
                      />
                    )}
                  </span>
                  {entry.header_type === "TEXT" && entry.header && (
                    <span className="text-[13px] font-semibold">{entry.header}</span>
                  )}
                  <BodyPreview text={entry.body} />
                  <ButtonChips buttons={entry.buttons} />
                  <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                    <Badge variant="outline">{humanize(entry.category)}</Badge>
                    {entry.header_type && entry.header_type !== "TEXT" && (
                      <Badge variant="outline">{humanize(entry.header_type)} header</Badge>
                    )}
                    {entry.pre_approved && (
                      <Badge className="bg-green-600/10 text-green-700 dark:text-green-400">
                        Pre-approved
                      </Badge>
                    )}
                  </span>
                </button>
              );
            })}
      </div>

      {channelId && !library.isPending && !library.isError && shown.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nothing in the library matches</EmptyTitle>
            <EmptyDescription>
              Try another word, or start from scratch. The library has Utility and Authentication
              templates only — no Marketing ones.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {library.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          className="self-center"
          loading={library.isFetchingNextPage}
          onClick={() => void library.fetchNextPage()}
        >
          Load more
        </Button>
      )}
    </div>
  );
}

function StarterGallery({
  selectedName,
  onPick,
  onScratch,
}: Readonly<{
  selectedName?: string;
  onPick: (starter: StarterTemplate) => void;
  onScratch: () => void;
}>) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const starters = STARTER_TEMPLATES.filter(
    (starter) =>
      !query ||
      starter.type.toLowerCase().includes(query) ||
      starter.description.toLowerCase().includes(query) ||
      starter.body?.toLowerCase().includes(query),
  );
  return (
    <div className="flex flex-col gap-4 @container">
      <ListPageSearchInput placeholder="Search starters…" value={search} onChange={setSearch} />
      <div className="grid gap-3 @xl:grid-cols-2 @3xl:grid-cols-3">
        <ScratchCard onPick={onScratch} />
        {starters.map((starter) => {
          const selected = starter.name === selectedName;
          return (
            <button
              key={starter.name}
              type="button"
              aria-pressed={selected}
              onClick={() => onPick(starter)}
              className={cn(CARD, selected && "ring-primary ring-[1.5px]")}
            >
              <span className="flex items-start gap-2">
                <span className="flex min-w-0 flex-col">
                  <span className="font-display text-[14.5px] font-semibold">{starter.type}</span>
                  <span className="text-muted-foreground text-xs text-pretty">
                    {starter.description}
                  </span>
                </span>
                {selected && (
                  <IconCircleCheckFilled
                    className="text-primary ml-auto size-4 shrink-0"
                    aria-hidden
                  />
                )}
              </span>
              <BodyPreview text={starter.body ?? ""} />
              <ButtonChips buttons={starter.buttons ?? []} />
              <span className="mt-auto pt-1">
                <Badge variant="outline">{humanize(starter.category)}</Badge>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Step one of a new template: Meta's library, RateUp's own starters, or a blank page.
 * Nothing is created here; a pick only decides what the next steps start from.
 */
export function StartStep({
  source,
  onSourceChange,
  showStarters,
  channelId,
  onChannelChange,
  language,
  picked,
  onPick,
}: Readonly<{
  source: StartSource;
  onSourceChange: (source: StartSource) => void;
  /** RateUp's starters are general notifications; a loyalty template hides them. */
  showStarters: boolean;
  channelId: string;
  onChannelChange: (id: string) => void;
  language: string;
  picked: TemplateStart | null;
  onPick: (start: TemplateStart) => void;
}>) {
  const scratch = () => onPick({ kind: "scratch" });
  const library = (
    <LibraryGallery
      channelId={channelId}
      onChannelChange={onChannelChange}
      language={language}
      selectedName={picked?.kind === "library" ? picked.entry.name : undefined}
      onPick={(entry) => onPick({ kind: "library", entry })}
      onScratch={scratch}
    />
  );
  if (!showStarters) return library;

  return (
    <Tabs
      value={source}
      onValueChange={(value) => onSourceChange(value === "starters" ? "starters" : "library")}
      className="gap-5"
    >
      <TabsList>
        <TabsTrigger value="library">
          <IconBrandMeta className="size-4" aria-hidden />
          Meta's library
        </TabsTrigger>
        <TabsTrigger value="starters">
          <IconSparkles className="size-4" aria-hidden />
          RateUp starters
        </TabsTrigger>
      </TabsList>
      <TabsContent value="library">{library}</TabsContent>
      <TabsContent value="starters">
        <StarterGallery
          selectedName={picked?.kind === "starter" ? picked.starter.name : undefined}
          onPick={(starter) => onPick({ kind: "starter", starter })}
          onScratch={scratch}
        />
      </TabsContent>
    </Tabs>
  );
}
