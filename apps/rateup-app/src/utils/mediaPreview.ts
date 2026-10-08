import { create } from "zustand";

/** What the preview screen asks of the chat's composer, which owns the draft. */
export type MediaPreviewActions = {
  send: () => void;
  discard: () => void;
  addMore: () => void;
  remove: (key: string) => void;
  getCaption: () => string;
  setCaption: (text: string) => void;
};

/**
 * State shared by the composer and the attachment preview screen. The preview is a route,
 * not a Modal: on Android a Modal is its own window, where keyboard tracking missed the
 * keyboard closing and left the caption bar floating mid-screen.
 */
export const useMediaPreviewStore = create<{
  index: number;
  isOpen: boolean;
  /** Where each attachment is on the device, so it shows while it uploads. */
  localUris: Record<string, string>;
  setIndex: (index: number) => void;
  setOpen: (isOpen: boolean) => void;
  addLocalUris: (uris: Record<string, string>) => void;
}>((set) => ({
  index: 0,
  isOpen: false,
  localUris: {},
  setIndex: (index) => set({ index }),
  setOpen: (isOpen) => set({ isOpen }),
  addLocalUris: (uris) => set((s) => ({ localUris: { ...s.localUris, ...uris } })),
}));

/** Set by the composer while its chat is on screen; the preview screen calls into it. */
export const mediaPreviewActions: { current: MediaPreviewActions | null } = { current: null };
