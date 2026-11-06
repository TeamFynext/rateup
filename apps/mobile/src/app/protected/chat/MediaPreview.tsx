import { useEffect, useState } from "react";
import { BackHandler } from "react-native";
import { Stack, router } from "expo-router";
import MediaPreview from "@/components/chatDisplay/chatFooter/MediaPreview";
import { useMediaStore } from "@/utils/store";
import { mediaPreviewActions, useMediaPreviewStore } from "@/utils/mediaPreview";

/**
 * The attachment preview, opened by the chat's composer after photos or videos are
 * picked, taken or shared in. The composer stays mounted underneath and owns the draft;
 * this screen reaches it through `mediaPreviewActions`.
 */
export default function MediaPreviewScreen() {
  const media = useMediaStore((s) => s.media);
  const index = useMediaPreviewStore((s) => s.index);
  const localUris = useMediaPreviewStore((s) => s.localUris);
  const setIndex = useMediaPreviewStore((s) => s.setIndex);
  const setOpen = useMediaPreviewStore((s) => s.setOpen);
  const [caption, setCaption] = useState(() => mediaPreviewActions.current?.getCaption() ?? "");

  useEffect(() => {
    setOpen(true);
    return () => setOpen(false);
  }, [setOpen]);

  // Sent, discarded, or every attachment removed: nothing left to preview.
  useEffect(() => {
    if (media.length === 0 && router.canGoBack()) router.back();
  }, [media.length]);

  // Android's back button discards, as WhatsApp's does.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      mediaPreviewActions.current?.discard();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      {/* No swipe-back on iOS: leaving goes through ✕ (discard) or Send, never half-way. */}
      <Stack.Screen
        options={{
          animation: "slide_from_bottom",
          gestureEnabled: false,
          contentStyle: { backgroundColor: "#000" },
        }}
      />
      <MediaPreview
        items={media}
        index={index}
        onIndexChange={setIndex}
        localUriFor={(key) => localUris[key]}
        caption={caption}
        onChangeCaption={(text) => {
          setCaption(text);
          mediaPreviewActions.current?.setCaption(text);
        }}
        onRemove={(key) => mediaPreviewActions.current?.remove(key)}
        onAddMore={() => mediaPreviewActions.current?.addMore()}
        onSend={() => mediaPreviewActions.current?.send()}
        onDiscard={() => mediaPreviewActions.current?.discard()}
      />
    </>
  );
}
