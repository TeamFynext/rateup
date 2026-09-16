import {
  IconArrowBackUp,
  IconBold,
  IconCode,
  IconItalic,
  IconStrikethrough,
} from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { PopoverEmojiPicker } from "@/components/whatsapp/templates/Details/TextFormateToolBar.tsx";

import type { LoyaltyMessageVariable } from "./loyaltyMessageCatalog.ts";

/**
 * A WhatsApp message body, edited with the same affordances as the template editor:
 * emoji, WhatsApp's own `*bold*` / `_italic_` / `~strike~` / ```` ```mono``` ```` markers,
 * and the variables the message is allowed to carry.
 *
 * It keeps its own textarea ref rather than forwarding one, and reads the selection off
 * `selectionStart`/`selectionEnd` rather than `window.getSelection()` — the latter reports
 * nothing for a textarea in Firefox, which is what makes formatting silently no-op.
 */
interface MessageBodyEditorProps {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  rows?: number;
  placeholder?: string;
  invalid?: boolean;
  /** Insertable tokens for this message. Omitted where the message takes none. */
  variables?: readonly LoyaltyMessageVariable[];
}

/** WhatsApp's markers. Monospace is the odd one out: three backticks, not one character. */
const FORMAT_MARKERS = [
  { key: "bold", marker: "*", label: "Bold", icon: IconBold },
  { key: "italic", marker: "_", label: "Italic", icon: IconItalic },
  { key: "strike", marker: "~", label: "Strikethrough", icon: IconStrikethrough },
  { key: "mono", marker: "```", label: "Monospace", icon: IconCode },
] as const;

export function MessageBodyEditor({
  id,
  name,
  value,
  onChange,
  onBlur,
  rows = 3,
  placeholder,
  invalid,
  variables,
}: Readonly<MessageBodyEditorProps>) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Only the toolbar's own edits are undoable here; the browser still owns typing history.
  const [history, setHistory] = useState<string[]>([]);

  /** Replaces the current selection, then puts the caret where the typing continues. */
  const replaceSelection = (next: string, caretFromStart: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end } = textarea;

    setHistory((entries) => [...entries, value]);
    onChange(value.slice(0, start) + next + value.slice(end));

    const caret = start + caretFromStart;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  };

  const insert = (text: string) => replaceSelection(text, text.length);

  const applyMarker = (marker: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const selected = value.slice(textarea.selectionStart, textarea.selectionEnd);
    // With nothing selected, wrap the empty string and leave the caret between the markers
    // so the merchant can just carry on typing inside them.
    replaceSelection(
      `${marker}${selected}${marker}`,
      selected ? marker.length * 2 + selected.length : marker.length,
    );
  };

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((entries) => entries.slice(0, -1));
    onChange(previous);
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-b-0 border-input p-1.5">
        <PopoverEmojiPicker onEmojiClick={insert} />
        <Separator orientation="vertical" className="h-5" />
        {FORMAT_MARKERS.map(({ key, marker, label, icon: Icon }) => (
          <CustomTooltip
            key={key}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                aria-label={t(label)}
                onClick={() => applyMarker(marker)}
              >
                <Icon size={14} />
              </Button>
            }
            content={<span>{t(label)}</span>}
          />
        ))}
        <CustomTooltip
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              aria-label={t("Undo the last formatting change")}
              disabled={history.length === 0}
              onClick={undo}
            >
              <IconArrowBackUp size={14} />
            </Button>
          }
          content={<span>{t("Undo the last formatting change")}</span>}
        />

        {variables && variables.length > 0 && (
          <>
            <Separator orientation="vertical" className="h-5" />
            {variables.map((variable) => (
              <CustomTooltip
                key={variable.token}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="font-mono text-xs text-muted-foreground"
                    onClick={() => insert(variable.token)}
                  >
                    {variable.token}
                  </Button>
                }
                content={<span>{variable.label}</span>}
              />
            ))}
          </>
        )}
      </div>

      <Textarea
        id={id}
        name={name}
        ref={textareaRef}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={invalid}
        className="rounded-t-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}
