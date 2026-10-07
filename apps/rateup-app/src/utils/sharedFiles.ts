import { create } from "zustand";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { ShareIntentFile } from "expo-share-intent";
import {
  galleryAssetName,
  resolveMimeType,
  sharedFileKind,
  toFileUri,
  type PickedFile,
} from "@/utils/attachments";

/** The long side a shared photo is scaled down to, which keeps it well inside WhatsApp's 5 MB. */
const MAX_IMAGE_SIDE = 2048;

/** How long shared files wait for their chat's composer, e.g. while someone joins the chat. */
const PENDING_TTL_MS = 10 * 60 * 1000;

/**
 * Files shared into RateUp from another app, held between the "Send to" screen and the
 * chat it opens. The chat's composer takes them when it mounts, so they attach exactly
 * once; ones left unclaimed expire rather than turning up in that chat days later.
 */
export const useSharedFilesStore = create<{
  pending: { contactId: string; files: ShareIntentFile[]; at: number } | null;
  setPending: (contactId: string, files: ShareIntentFile[]) => void;
  take: (contactId: string) => ShareIntentFile[];
}>((set, get) => ({
  pending: null,
  setPending: (contactId, files) => set({ pending: { contactId, files, at: Date.now() } }),
  take: (contactId) => {
    const pending = get().pending;
    if (pending?.contactId !== contactId) return [];
    set({ pending: null });
    return Date.now() - pending.at < PENDING_TTL_MS ? pending.files : [];
  },
}));

/**
 * A shared file as an attachment. Shared photos skip the photo picker, so they arrive as
 * the original: often a HEIC that WhatsApp refuses, and often over its 5 MB limit. They
 * are re-encoded here as a JPEG no larger than 2048px, as the picker would have done.
 */
export async function prepareSharedFile(file: ShareIntentFile): Promise<PickedFile> {
  const uri = toFileUri(file.path);
  const name = file.fileName || uri.split("/").pop() || "file";
  const mimeType = resolveMimeType(name, file.mimeType);
  const kind = sharedFileKind(mimeType);
  if (kind !== "image" || mimeType === "image/gif") {
    return { uri, name, mimeType, size: file.size, kind };
  }

  // Measured from the decoded image: the share sheet does not always report dimensions.
  let image = await ImageManipulator.manipulate(uri).renderAsync();
  if (Math.max(image.width, image.height) > MAX_IMAGE_SIDE) {
    image = await ImageManipulator.manipulate(image)
      .resize(image.width >= image.height ? { width: MAX_IMAGE_SIDE } : { height: MAX_IMAGE_SIDE })
      .renderAsync();
  }
  const result = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return {
    uri: result.uri,
    name: galleryAssetName({ fileName: name, uri: result.uri }, "image"),
    mimeType: "image/jpeg",
    // Unknown until uploaded; at this size and quality it is far under every limit.
    size: null,
    kind,
  };
}
