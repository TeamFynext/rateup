"use client";

import { useCallback, useEffect, useState } from "react";

import { NodeSelection } from "@tiptap/pm/state";
import { type Editor } from "@tiptap/react";
import {
  AlignCenterVerticalIcon,
  AlignEndVerticalIcon,
  AlignStartVerticalIcon,
} from "lucide-react";

import { useTiptapEditor } from "./image-align-button";

// --- Icons ---

export type ImageAlign = "left" | "center" | "right";

/**
 * Configuration for the image align functionality
 */
export interface UseImageAlignConfig {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null;
  /**
   * The image alignment to apply.
   */
  align: ImageAlign;
  /**
   * The name of the image extension to target.
   * @default "image"
   */
  extensionName?: string;
  /**
   * The attribute name used for alignment.
   * @default "data-align"
   */
  attributeName?: string;
  /**
   * Whether the button should hide when alignment is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean;
  /**
   * Callback function called after a successful alignment change.
   */
  onAligned?: () => void;
}

export const IMAGE_ALIGN_SHORTCUT_KEYS: Record<ImageAlign, string> = {
  left: "alt+shift+l",
  center: "alt+shift+e",
  right: "alt+shift+r",
};

export const imageAlignIcons = {
  left: AlignStartVerticalIcon,
  center: AlignCenterVerticalIcon,
  right: AlignEndVerticalIcon,
};

export const imageAlignLabels: Record<ImageAlign, string> = {
  left: "Image align left",
  center: "Image align center",
  right: "Image align right",
};

/**
 * Checks if image alignment can be performed in the current editor state
 */
export function canSetImageAlign(
  editor: Editor | null,
  align: ImageAlign,
  extensionName: string = "image",
  attributeName: string = "data-align",
): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!isExtensionAvailable(editor, [extensionName])) return false;

  return editor
    .can()
    .updateAttributes(extensionName, { [attributeName]: align });
}

/**
 * Checks if the image alignment is currently active
 */
export function isImageAlignActive(
  editor: Editor | null,
  align: ImageAlign,
  extensionName: string = "image",
  attributeName: string = "data-align",
): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!isExtensionAvailable(editor, [extensionName])) return false;

  const attributes = editor.getAttributes(extensionName);
  const currentAlign = attributes[attributeName] || "left";
  return currentAlign === align;
}

/**
 * Sets image alignment in the editor
 */
export function setImageAlign(
  editor: Editor | null,
  align: ImageAlign,
  extensionName: string = "image",
  attributeName: string = "data-align",
): boolean {
  if (!editor?.isEditable) {
    return false;
  }

  if (!isExtensionAvailable(editor, [extensionName])) {
    return false;
  }

  if (!canSetImageAlign(editor, align, extensionName, attributeName)) {
    return false;
  }

  try {
    const { selection } = editor.state;
    const isNodeSelection = selection instanceof NodeSelection;
    const selectionPosition = isNodeSelection
      ? selection.from
      : selection.$anchor.pos;

    const currentAttrs = editor.getAttributes(extensionName);

    // 🔥 remove old margin styles
    let cleanStyle = (currentAttrs.style || "")
      .replace(/margin-left:\s*auto;?/g, "")
      .replace(/margin-right:\s*auto;?/g, "")
      .replace(/display:\s*block;?/g, "");

    const alignmentUpdated = editor
      .chain()
      .focus()
      .updateAttributes(extensionName, {
        [attributeName]: align,
        style: cleanStyle, // ✅ NO alignment styles here
      })
      .run();

    // Restore node selection if it was originally selected
    // This is the temporary solution as image-node-extension.ts contain content: "inline*"
    if (alignmentUpdated && isNodeSelection) {
      editor.commands.setNodeSelection(selectionPosition);
    }

    return alignmentUpdated;
  } catch {
    return false;
  }
}

/**
 * Determines if the image align button should be shown
 */
export function shouldShowButton(props: {
  editor: Editor | null;
  hideWhenUnavailable: boolean;
  align: ImageAlign;
  extensionName?: string;
  attributeName?: string;
}): boolean {
  const {
    editor,
    hideWhenUnavailable,
    align,
    extensionName = "image",
    attributeName = "data-align",
  } = props;

  if (!editor || !editor.isEditable) return false;
  if (!isExtensionAvailable(editor, [extensionName])) return false;

  if (hideWhenUnavailable) {
    return canSetImageAlign(editor, align, extensionName, attributeName);
  }

  return true;
}

/**
 * Custom hook that provides image align functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage with default "image" extension
 * function MySimpleImageAlignButton() {
 *   const { isVisible, handleImageAlign } = useImageAlign({ align: "center" })
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleImageAlign}>Align Center</button>
 * }
 *
 * // Advanced usage with custom extension name
 * function MyAdvancedImageAlignButton() {
 *   const { isVisible, handleImageAlign, label, isActive } = useImageAlign({
 *     editor: myEditor,
 *     align: "right",
 *     extensionName: "myCustomImage", // Use your custom extension name
 *     hideWhenUnavailable: true,
 *     onAligned: () => console.log('Image aligned!')
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <MyButton
 *       onClick={handleImageAlign}
 *       aria-pressed={isActive}
 *       aria-label={label}
 *     >
 *       Align Right
 *     </MyButton>
 *   )
 * }
 * ```
 */
export function useImageAlign(config: UseImageAlignConfig) {
  const {
    editor: providedEditor,
    align,
    extensionName = "image",
    attributeName = "data-align",
    hideWhenUnavailable = false,
    onAligned,
  } = config;

  const { editor } = useTiptapEditor(providedEditor);
  const isMobile = useIsBreakpoint();
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const canAlign = canSetImageAlign(
    editor,
    align,
    extensionName,
    attributeName,
  );
  const isActive = isImageAlignActive(
    editor,
    align,
    extensionName,
    attributeName,
  );

  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      setIsVisible(
        shouldShowButton({
          editor,
          align,
          hideWhenUnavailable,
          extensionName,
          attributeName,
        }),
      );
    };

    handleSelectionUpdate();

    editor.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, hideWhenUnavailable, align, extensionName, attributeName]);

  const handleImageAlign = useCallback(() => {
    if (!editor) return false;

    const success = setImageAlign(editor, align, extensionName, attributeName);
    if (success) {
      onAligned?.();
    }
    return success;
  }, [editor, align, extensionName, attributeName, onAligned]);

  useCustomHotkeys({
    keys: IMAGE_ALIGN_SHORTCUT_KEYS[align],
    callback: (event) => {
      event.preventDefault();
      handleImageAlign();
    },
    enabled: isVisible && canAlign,
    enableOnContentEditable: !isMobile,
    enableOnFormTags: true,
  });

  return {
    isVisible,
    isActive,
    handleImageAlign,
    canAlign,
    label: imageAlignLabels[align],
    shortcutKeys: IMAGE_ALIGN_SHORTCUT_KEYS[align],
    Icon: imageAlignIcons[align],
  };
}
export function isExtensionAvailable(
  editor: Editor | null,
  extensionNames: string | string[],
): boolean {
  if (!editor) return false;

  const names = Array.isArray(extensionNames)
    ? extensionNames
    : [extensionNames];

  const found = names.some((name) =>
    editor.extensionManager.extensions.some((ext) => ext.name === name),
  );

  if (!found) {
    console.warn(
      `None of the extensions [${names.join(", ")}] were found in the editor schema. Ensure they are included in the editor configuration.`,
    );
  }

  return found;
}
type BreakpointMode = "min" | "max";

export function useIsBreakpoint(
  mode: BreakpointMode = "max",
  breakpoint = 768,
) {
  const [matches, setMatches] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const query =
      mode === "min"
        ? `(min-width: ${breakpoint}px)`
        : `(max-width: ${breakpoint - 1}px)`;

    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Set initial value
    setMatches(mql.matches);

    // Add listener
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [mode, breakpoint]);

  return !!matches;
}

export function useCustomHotkeys({
  keys,
  callback,
  enabled = true,
  enableOnContentEditable = true,
  enableOnFormTags = false,
}: {
  keys: string;
  callback: (e: KeyboardEvent) => void;
  enabled?: boolean;
  enableOnContentEditable?: boolean;
  enableOnFormTags?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // 🚫 Ignore inputs / textarea
      if (!enableOnFormTags) {
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT"
        ) {
          return;
        }
      }

      // 🚫 Ignore contenteditable (like Tiptap)
      if (!enableOnContentEditable) {
        if (target.isContentEditable) return;
      }

      // ✅ Match keys (simple version: ctrl+x style)
      const key = keys.toLowerCase();

      const isMatch =
        (key.includes("ctrl") ? e.ctrlKey : true) &&
        (key.includes("shift") ? e.shiftKey : true) &&
        (key.includes("alt") ? e.altKey : true) &&
        key.includes(e.key.toLowerCase());

      if (isMatch) {
        e.preventDefault();
        callback(e);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [keys, callback, enabled, enableOnContentEditable, enableOnFormTags]);
}
