import type { Editor } from "@tiptap/react";

import { cn } from "@/lib/utils";

/** Ring + "n / max characters" readout shown under a WhatsApp-style editor. */
export const WaTextCharacterCount = ({ editor, max }: { editor: Editor | null; max: number }) => {
  const percentage = editor
    ? Math.round((100 / max) * editor.storage.characterCount.characters())
    : 0;
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2.5 text-xs text-muted-foreground [&>svg]:text-green-600",
        editor?.storage?.characterCount?.characters() === max &&
          "text-red-600 [&>svg]:text-red-600",
      )}
    >
      <svg height="20" width="20" viewBox="0 0 20 20">
        <circle r="10" cx="10" cy="10" fill="#e9ecef" />
        <circle
          r="5"
          cx="10"
          cy="10"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={`calc(${percentage} * 31.4 / 100) 31.4`}
          transform="rotate(-90) translate(-20)"
        />
        <circle r="6" cx="10" cy="10" fill="white" />
      </svg>
      {editor?.storage?.characterCount?.characters()} / {max} characters
    </div>
  );
};
