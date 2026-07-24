import { XIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface TagsInputProps {
  /** Current tags (controlled). */
  value?: string[];
  /** Called with the new list of tags. */
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Maximum number of tags allowed. */
  maxTags?: number;
  /** Prevent duplicate tags (default true). */
  unique?: boolean;
  id?: string;
  className?: string;
  "aria-invalid"?: boolean;
}

/**
 * shadcn-style tags input. Add a tag with Enter or comma; remove the last tag
 * with Backspace on an empty field, or click a chip's ✕.
 */
export function TagsInput({
  value = [],
  onValueChange,
  placeholder,
  disabled,
  maxTags,
  unique = true,
  id,
  className,
  "aria-invalid": ariaInvalid,
}: Readonly<TagsInputProps>) {
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (unique && value.includes(tag)) {
      setDraft("");
      return;
    }
    if (maxTags && value.length >= maxTags) return;
    onValueChange?.([...value, tag]);
    setDraft("");
  };

  const removeAt = (index: number) => {
    onValueChange?.(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      removeAt(value.length - 1);
    }
  };

  return (
    <div
      data-slot="tags-input"
      aria-invalid={ariaInvalid}
      onClick={() => inputRef.current?.focus()}
      className={cn(
        "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {value.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="inline-flex items-center gap-1 rounded-sm bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          {tag}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              removeAt(index);
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Remove ${tag}`}
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        disabled={disabled}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
        placeholder={value.length ? undefined : placeholder}
        className="flex-1 bg-transparent px-0.5 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
