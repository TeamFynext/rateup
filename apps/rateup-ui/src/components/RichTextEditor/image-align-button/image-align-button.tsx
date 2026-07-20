import type { Editor } from "@tiptap/react";
import { useCurrentEditor, useEditorState } from "@tiptap/react";
import { forwardRef, Fragment, useCallback, useMemo } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

import type { UseImageAlignConfig } from "./use-image-align.ts";
import { useImageAlign } from "./use-image-align.ts";

const MAC_SYMBOLS: Record<string, string> = {
  mod: "⌘",
  command: "⌘",
  meta: "⌘",
  ctrl: "⌃",
  control: "⌃",
  alt: "⌥",
  option: "⌥",
  shift: "⇧",
  backspace: "Del",
  delete: "⌦",
  enter: "⏎",
  escape: "⎋",
  capslock: "⇪",
} as const;
export interface ImageAlignButtonProps extends Omit<ButtonProps, "type">, UseImageAlignConfig {
  /**
   * Optional text to display alongside the icon.
   */
  text?: string;
  /**
   * Optional show shortcut keys in the button.
   * @default false
   */
  showShortcut?: boolean;
}
/**
 * Button component for setting image alignment in a Tiptap editor.
 *
 * For custom button implementations, use the `useImageAlign` hook instead.
 */
export const ImageAlignButton = forwardRef<HTMLButtonElement, ImageAlignButtonProps>(
  (props, ref) => {
    const {
      editor: providedEditor,
      align,
      extensionName,
      attributeName = "data-align",
      hideWhenUnavailable = false,
      onAligned,
      onClick,
      children,
      showShortcut: _showShortcut,
      ...buttonProps
    } = props;

    const { editor } = useTiptapEditor(providedEditor);

    const { isVisible, handleImageAlign, label, canAlign, isActive, Icon } = useImageAlign({
      editor,
      align,
      extensionName,
      attributeName,
      hideWhenUnavailable,
      onAligned,
    });

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        handleImageAlign();
      },
      [handleImageAlign, onClick],
    );

    if (!isVisible) return null;

    return (
      <Button
        ref={ref}
        type="button"
        disabled={!canAlign}
        data-style="ghost"
        data-active-state={isActive ? "on" : "off"}
        aria-label={label}
        aria-pressed={isActive}
        tooltip={label}
        onClick={handleClick}
        {...buttonProps}
      >
        {children ?? <Icon className="tiptap-button-icon" />}
      </Button>
    );
  },
);

ImageAlignButton.displayName = "ImageAlignButton";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  variant?: "primary" | "ghost" | "secondary";
  size?: "small" | "medium" | "large";
  showTooltip?: boolean;
  tooltip?: React.ReactNode;
  shortcutKeys?: string;
}

const buttonVariants = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600",
  ghost:
    "bg-transparent hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white",
  secondary:
    "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700",
};

const buttonSizes = {
  small: "h-6 px-1 text-xs rounded-md [&_svg]:h-3.5 [&_svg]:w-3.5",
  medium: "h-8 px-2 text-sm rounded-lg [&_svg]:h-4 [&_svg]:w-4",
  large: "h-10 px-2.5 text-base rounded-lg [&_svg]:h-5 [&_svg]:w-5",
};

const ShortcutDisplay: React.FC<{ shortcuts: string[] }> = ({ shortcuts }) => {
  if (shortcuts.length === 0) return null;

  return (
    <div className="flex gap-1 items-center">
      {shortcuts.map((key, index) => (
        <Fragment key={index}>
          {index > 0 && <span className="text-gray-400">+</span>}
          <kbd className="min-w-[1.5em] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-center">
            {key}
          </kbd>
        </Fragment>
      ))}
    </div>
  );
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      tooltip,
      showTooltip = true,
      shortcutKeys,
      variant = "secondary", // Default to secondary based on scss
      size = "medium",
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const shortcuts = useMemo<string[]>(() => parseShortcutKeys({ shortcutKeys }), [shortcutKeys]);

    // Handle data-style and data-size props from legacy code if passed
    const finalVariant = (props as any)["data-style"] || variant;
    const finalSize = (props as any)["data-size"] || size;

    // Map legacy 'subdued' appearance or ghost style to ghost variant
    const isGhost = finalVariant === "ghost" || (props as any)["data-appearence"] === "subdued";
    const computedVariantClass = isGhost
      ? buttonVariants.ghost
      : buttonVariants[finalVariant as keyof typeof buttonVariants] || buttonVariants.secondary;

    const computedSizeClass =
      buttonSizes[finalSize as keyof typeof buttonSizes] || buttonSizes.medium;

    const buttonClass = cn(
      "inline-flex items-center justify-center gap-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50",
      computedVariantClass,
      computedSizeClass,
      className,
    );

    if (!tooltip || !showTooltip) {
      return (
        <button className={buttonClass} ref={ref} aria-label={ariaLabel} {...props}>
          {children}
        </button>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            delay={200}
            render={<button className={buttonClass} ref={ref} aria-label={ariaLabel} {...props} />}
          >
            {children}
          </TooltipTrigger>
          <TooltipContent className="flex flex-col items-center gap-1">
            <span>{tooltip}</span>
            <ShortcutDisplay shortcuts={shortcuts} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);

Button.displayName = "Button";

const ButtonGroup = forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    orientation?: "horizontal" | "vertical";
  }
>(({ className, children, orientation = "vertical", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex",
        orientation === "vertical"
          ? "flex-col items-start min-w-max [&>button]:w-full"
          : "flex-row items-center gap-0.5",
        className,
      )}
      data-orientation={orientation}
      role="group"
      {...props}
    >
      {children}
    </div>
  );
});
ButtonGroup.displayName = "ButtonGroup";

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
const parseShortcutKeys = (props: {
  shortcutKeys: string | undefined;
  delimiter?: string;
  capitalize?: boolean;
}) => {
  const { shortcutKeys, delimiter = "+", capitalize = true } = props;

  if (!shortcutKeys) return [];

  return shortcutKeys
    .split(delimiter)
    .map((key) => key.trim())
    .map((key) => formatShortcutKey(key, isMac(), capitalize));
};
const formatShortcutKey = (key: string, isMac: boolean, capitalize: boolean = true) => {
  if (isMac) {
    const lowerKey = key.toLowerCase();
    return MAC_SYMBOLS[lowerKey] || (capitalize ? key.toUpperCase() : key);
  }

  return capitalize ? key.charAt(0).toUpperCase() + key.slice(1) : key;
};
function isMac(): boolean {
  return typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac");
}

export function useTiptapEditor(providedEditor?: Editor | null): {
  editor: Editor | null;
  editorState?: Editor["state"];
  canCommand?: Editor["can"];
} {
  const { editor: coreEditor } = useCurrentEditor();
  const mainEditor = useMemo(() => providedEditor || coreEditor, [providedEditor, coreEditor]);

  const editorState = useEditorState({
    editor: mainEditor,
    selector(context) {
      if (!context.editor) {
        return {
          editor: null,
          editorState: undefined,
          canCommand: undefined,
        };
      }

      return {
        editor: context.editor,
        editorState: context.editor.state,
        canCommand: context.editor.can,
      };
    },
  });

  return editorState || { editor: null };
}
