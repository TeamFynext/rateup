import { useCallback, useState } from "react";

export interface UseDisclosureOptions {
  onOpen?: () => void;
  onClose?: () => void;
}

export interface UseDisclosureHandlers {
  set: (value: boolean) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export type UseDisclosureReturnValue = [boolean, UseDisclosureHandlers];

export function useDisclosure(
  initialState: boolean = false,
  options: UseDisclosureOptions = {},
): UseDisclosureReturnValue {
  const { onOpen, onClose } = options;

  const [opened, setOpened] = useState(initialState);

  const open = useCallback(() => {
    setOpened((prev) => {
      if (!prev) {
        onOpen?.();
      }
      return true;
    });
  }, [onOpen]);

  const close = useCallback(() => {
    setOpened((prev) => {
      if (prev) {
        onClose?.();
      }
      return false;
    });
  }, [onClose]);

  const toggle = useCallback(() => {
    setOpened((prev) => {
      const next = !prev;

      if (next) {
        onOpen?.();
      } else {
        onClose?.();
      }

      return next;
    });
  }, [onOpen, onClose]);

  const set = useCallback(
    (value: boolean) => {
      setOpened((prev) => {
        if (prev === value) {
          return prev;
        }

        if (value) {
          onOpen?.();
        } else {
          onClose?.();
        }

        return value;
      });
    },
    [onOpen, onClose],
  );

  return [
    opened,
    {
      set,
      open,
      close,
      toggle,
    },
  ];
}

export namespace useDisclosure {
  export type Options = UseDisclosureOptions;
  export type Handlers = UseDisclosureHandlers;
  export type ReturnValue = UseDisclosureReturnValue;
}
