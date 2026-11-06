import { IconSearch, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

/**
 * A search box whose value lives in the URL: it types freely and commits after a pause, so
 * every keystroke is not a navigation and a request.
 */
export function SearchField({
  value,
  onCommit,
  placeholder,
  className,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const debounced = useDebouncedValue(draft, 300);

  // Read through a ref: only a settled draft should commit, not a new `value` or callback
  // (clearing the search from elsewhere would otherwise re-commit the stale draft).
  const latest = useRef({ value, onCommit });
  useEffect(() => {
    latest.current = { value, onCommit };
  });

  // Back/forward or a chip that clears the search puts the URL's value back in the box.
  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    const { value: committed, onCommit: commit } = latest.current;
    if (debounced.trim() !== committed.trim()) commit(debounced.trim());
  }, [debounced]);

  return (
    <label
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-lg border bg-background px-3.5 text-sm transition-colors focus-within:border-foreground/40",
        className,
      )}
    >
      <IconSearch className="size-4 shrink-0 text-muted-foreground" />
      <input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/80 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            onCommit("");
          }}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Clear search"
        >
          <IconX className="size-3.5" />
        </button>
      )}
    </label>
  );
}
