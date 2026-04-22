import {
  cloneElement,
  createContext,
  forwardRef,
  Fragment,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  version,
} from "react";

import {
  autoUpdate,
  flip,
  FloatingDelayGroup,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useMergeRefs,
  useRole,
  type Placement,
  type ReferenceType,
  type UseFloatingReturn,
} from "@floating-ui/react";
import { Editor, useCurrentEditor, useEditorState } from "@tiptap/react";

import { useImageAlign, UseImageAlignConfig } from "./use-image-align";

export const MAC_SYMBOLS: Record<string, string> = {
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
export interface ImageAlignButtonProps
  extends Omit<ButtonProps, "type">, UseImageAlignConfig {
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
export const ImageAlignButton = forwardRef<
  HTMLButtonElement,
  ImageAlignButtonProps
>((props, ref) => {
  const {
    editor: providedEditor,
    align,
    text,
    extensionName,
    attributeName = "data-align",
    hideWhenUnavailable = false,
    onAligned,
    showShortcut = false,
    onClick,
    children,
    ...buttonProps
  } = props;

  const { editor } = useTiptapEditor(providedEditor);

  const { isVisible, handleImageAlign, label, canAlign, isActive, Icon } =
    useImageAlign({
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
});

ImageAlignButton.displayName = "ImageAlignButton";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  variant?: "primary" | "ghost" | "secondary";
  size?: "small" | "medium" | "large";
  showTooltip?: boolean;
  tooltip?: React.ReactNode;
  shortcutKeys?: string;
}

const buttonVariants = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600",
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

export const ShortcutDisplay: React.FC<{ shortcuts: string[] }> = ({
  shortcuts,
}) => {
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

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
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
    const shortcuts = useMemo<string[]>(
      () => parseShortcutKeys({ shortcutKeys }),
      [shortcutKeys],
    );

    // Handle data-style and data-size props from legacy code if passed
    const finalVariant = (props as any)["data-style"] || variant;
    const finalSize = (props as any)["data-size"] || size;

    // Map legacy 'subdued' appearance or ghost style to ghost variant
    const isGhost =
      finalVariant === "ghost" ||
      (props as any)["data-appearence"] === "subdued";
    const computedVariantClass = isGhost
      ? buttonVariants.ghost
      : buttonVariants[finalVariant as keyof typeof buttonVariants] ||
        buttonVariants.secondary;

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
        <button
          className={buttonClass}
          ref={ref}
          aria-label={ariaLabel}
          {...props}
        >
          {children}
        </button>
      );
    }

    return (
      <Tooltip delay={200}>
        <TooltipTrigger
          className={buttonClass}
          ref={ref}
          aria-label={ariaLabel}
          {...props}
        >
          {children}
        </TooltipTrigger>
        <TooltipContent className="flex flex-col items-center gap-1">
          <span>{tooltip}</span>
          <ShortcutDisplay shortcuts={shortcuts} />
        </TooltipContent>
      </Tooltip>
    );
  },
);

Button.displayName = "Button";

export const ButtonGroup = forwardRef<
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

interface TooltipProviderProps {
  children: React.ReactNode;
  initialOpen?: boolean;
  placement?: Placement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  delay?: number;
  closeDelay?: number;
  timeout?: number;
  useDelayGroup?: boolean;
}

interface TooltipTriggerProps extends Omit<
  React.HTMLProps<HTMLElement>,
  "ref"
> {
  asChild?: boolean;
  children: React.ReactNode;
}

interface TooltipContentProps extends Omit<
  React.HTMLProps<HTMLDivElement>,
  "ref"
> {
  children?: React.ReactNode;
  portal?: boolean;
  portalProps?: Omit<React.ComponentProps<typeof FloatingPortal>, "children">;
}

interface TooltipContextValue extends UseFloatingReturn<ReferenceType> {
  open: boolean;
  setOpen: (open: boolean) => void;
  getReferenceProps: (
    userProps?: React.HTMLProps<HTMLElement>,
  ) => Record<string, unknown>;
  getFloatingProps: (
    userProps?: React.HTMLProps<HTMLDivElement>,
  ) => Record<string, unknown>;
}

function useTooltip({
  initialOpen = false,
  placement = "top",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  delay = 600,
  closeDelay = 0,
}: Omit<TooltipProviderProps, "children"> = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] =
    useState<boolean>(initialOpen);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = setControlledOpen ?? setUncontrolledOpen;

  const data = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({
        crossAxis: placement.includes("-"),
        fallbackAxisSideDirection: "start",
        padding: 4,
      }),
      shift({ padding: 4 }),
    ],
  });

  const context = data.context;

  const hover = useHover(context, {
    mouseOnly: true,
    move: false,
    restMs: delay,
    enabled: controlledOpen == null,
    delay: {
      close: closeDelay,
    },
  });
  const focus = useFocus(context, {
    enabled: controlledOpen == null,
  });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const interactions = useInteractions([hover, focus, dismiss, role]);

  return useMemo(
    () => ({
      open,
      setOpen,
      ...interactions,
      ...data,
    }),
    [open, setOpen, interactions, data],
  );
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltipContext() {
  const context = useContext(TooltipContext);

  if (context == null) {
    throw new Error(
      "Tooltip components must be wrapped in <TooltipProvider />",
    );
  }

  return context;
}

export function Tooltip({ children, ...props }: TooltipProviderProps) {
  const tooltip = useTooltip(props);

  if (!props.useDelayGroup) {
    return (
      <TooltipContext.Provider value={tooltip}>
        {children}
      </TooltipContext.Provider>
    );
  }

  return (
    <FloatingDelayGroup
      delay={{ open: props.delay ?? 0, close: props.closeDelay ?? 0 }}
      timeoutMs={props.timeout}
    >
      <TooltipContext.Provider value={tooltip}>
        {children}
      </TooltipContext.Provider>
    </FloatingDelayGroup>
  );
}

export const TooltipTrigger = forwardRef<HTMLElement, TooltipTriggerProps>(
  function TooltipTrigger({ children, asChild = false, ...props }, propRef) {
    const context = useTooltipContext();
    const childrenRef = isValidElement(children)
      ? parseInt(version, 10) >= 19
        ? (children as { props: { ref?: React.Ref<any> } }).props.ref
        : (children as any).ref
      : undefined;
    const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

    if (asChild && isValidElement(children)) {
      const dataAttributes = {
        "data-tooltip-state": context.open ? "open" : "closed",
      };

      return cloneElement(
        children,
        context.getReferenceProps({
          ref,
          ...props,
          ...(typeof children.props === "object" ? children.props : {}),
          ...dataAttributes,
        }),
      );
    }

    return (
      <button
        ref={ref}
        data-tooltip-state={context.open ? "open" : "closed"}
        {...context.getReferenceProps(props)}
      >
        {children}
      </button>
    );
  },
);

export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  function TooltipContent(
    { style, children, portal = true, portalProps = {}, className, ...props },
    propRef,
  ) {
    const context = useTooltipContext();
    const ref = useMergeRefs([context.refs.setFloating, propRef]);

    if (!context.open) return null;

    const content = (
      <div
        ref={ref}
        style={{
          ...context.floatingStyles,
          ...style,
        }}
        {...context.getFloatingProps(props)}
        className={cn(
          "z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95 dark:bg-gray-100 dark:text-gray-900",
          className,
        )}
      >
        <div className="flex items-center gap-1">{children}</div>
      </div>
    );

    if (portal) {
      return <FloatingPortal {...portalProps}>{content}</FloatingPortal>;
    }

    return content;
  },
);

Tooltip.displayName = "Tooltip";
TooltipTrigger.displayName = "TooltipTrigger";
TooltipContent.displayName = "TooltipContent";

export function cn(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ");
}
export const parseShortcutKeys = (props: {
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
export const formatShortcutKey = (
  key: string,
  isMac: boolean,
  capitalize: boolean = true,
) => {
  if (isMac) {
    const lowerKey = key.toLowerCase();
    return MAC_SYMBOLS[lowerKey] || (capitalize ? key.toUpperCase() : key);
  }

  return capitalize ? key.charAt(0).toUpperCase() + key.slice(1) : key;
};
export function isMac(): boolean {
  return (
    typeof navigator !== "undefined" &&
    navigator.platform.toLowerCase().includes("mac")
  );
}

export function useTiptapEditor(providedEditor?: Editor | null): {
  editor: Editor | null;
  editorState?: Editor["state"];
  canCommand?: Editor["can"];
} {
  const { editor: coreEditor } = useCurrentEditor();
  const mainEditor = useMemo(
    () => providedEditor || coreEditor,
    [providedEditor, coreEditor],
  );

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
