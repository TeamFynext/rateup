import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import { cn } from "@/lib/utils";

export interface MentionUser {
  id: string;
  name: string;
}

export interface MentionListRef {
  /** Returns true when the key was handled (arrow nav / enter). */
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

/**
 * The @-mention suggestion popup. Rendered by the tiptap Suggestion utility (see
 * `suggestion.ts`) and driven entirely by its `props`; selecting an item calls
 * `props.command({ id, label })`, which inserts a mention node.
 */
export const MentionList = forwardRef<MentionListRef, SuggestionProps<MentionUser>>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [props.items]);

    const selectItem = (index: number) => {
      const item = props.items[index];
      if (item) props.command({ id: item.id, label: item.name });
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (!props.items.length) return false;
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i + props.items.length - 1) % props.items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % props.items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (!props.items.length) {
      return (
        <div className="min-w-48 rounded-lg border border-border bg-popover p-2 text-xs text-muted-foreground shadow-md">
          No teammates found
        </div>
      );
    }

    return (
      <div className="max-h-64 min-w-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
        {props.items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectItem(index)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted text-popover-foreground",
            )}
          >
            <CreativeAvatar name={item.name} size="sm" />
            <span className="truncate">{item.name}</span>
          </button>
        ))}
      </div>
    );
  },
);

MentionList.displayName = "MentionList";
