import type { KeyboardEvent as ReactKeyboardEvent } from "react";

/**
 * Receives the native `KeyboardEvent`. `getHotkeyHandler` has already called
 * `preventDefault` by the time this runs, so handlers that ignore the event —
 * which is all of them — are fine.
 */
type HotkeyHandler = (event: KeyboardEvent) => void;
type HotkeyItem = [string, HotkeyHandler, { preventDefault?: boolean }?];

interface ParsedHotkey {
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
  /** `mod` = ⌘ on macOS, Ctrl elsewhere. */
  mod: boolean;
  shift: boolean;
  key?: string;
}

const MODIFIERS = ["alt", "ctrl", "meta", "shift", "mod"];

/** Parses a hotkey string such as `"mod+S"` or `"shift+Enter"`. */
export function parseHotkey(hotkey: string): ParsedHotkey {
  const keys = hotkey
    .toLowerCase()
    .split("+")
    .map((part) => part.trim());

  return {
    alt: keys.includes("alt"),
    ctrl: keys.includes("ctrl"),
    meta: keys.includes("meta"),
    mod: keys.includes("mod"),
    shift: keys.includes("shift"),
    key: keys.find((key) => !MODIFIERS.includes(key)),
  };
}

function isExactHotkey(hotkey: ParsedHotkey, event: KeyboardEvent): boolean {
  const { alt, ctrl, meta, mod, shift, key } = hotkey;

  if (alt !== event.altKey) return false;
  if (shift !== event.shiftKey) return false;

  if (mod) {
    if (!event.ctrlKey && !event.metaKey) return false;
  } else {
    if (ctrl !== event.ctrlKey) return false;
    if (meta !== event.metaKey) return false;
  }

  if (!key) return false;

  return (
    event.key.toLowerCase() === key ||
    // Fall back to the physical key so layouts that remap characters still match.
    event.code.replace("Key", "").toLowerCase() === key
  );
}

/**
 * Drop-in replacement for the former `getHotkeyHandler` from `@mantine/hooks`.
 * Returns an `onKeyDown` handler that fires each matching hotkey's callback.
 */
export function getHotkeyHandler(hotkeys: HotkeyItem[]) {
  return (event: ReactKeyboardEvent<HTMLElement> | KeyboardEvent) => {
    const nativeEvent = ("nativeEvent" in event ? event.nativeEvent : event) as KeyboardEvent;

    hotkeys.forEach(([hotkey, handler, options = { preventDefault: true }]) => {
      if (!isExactHotkey(parseHotkey(hotkey), nativeEvent)) return;
      if (options.preventDefault !== false) event.preventDefault();
      handler(nativeEvent);
    });
  };
}
