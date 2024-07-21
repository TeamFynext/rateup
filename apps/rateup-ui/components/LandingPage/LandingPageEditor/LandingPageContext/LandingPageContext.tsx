import { createContext, useContext, useEffect } from "react";
import { useRouter } from "next/router";

import { useUpdateLandingPageMutation } from "@/backend/landingPage/landingPage.query";
import { useDebouncedCallback } from "@mantine/hooks";
import { Link } from "@mantine/tiptap";
import Color from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Youtube from "@tiptap/extension-youtube";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { Video } from "@/components/RichTextEditor/CustomVideo";
import { VariableComponentExtension } from "@/components/RichTextEditor/MantineComponentExtension";

const LandingPageContext = createContext(null);
const LandingPageEditorTabContext = createContext(null);
const LandingPageEditorSetTabContext = createContext(null);
const TiptapEditorInstanceContext = createContext(null);

function LandingPageContextProvider({
  landingPageData,
  children,
  activeTab,
  setActiveTab,
}) {
  const { tiptapEditorContent } = landingPageData;

  const {
    query: { shortUrlId },
  } = useRouter();
  const { mutateAsync: landingPageUpdateMutateAsync } =
    useUpdateLandingPageMutation(shortUrlId);
  const handleEditorContentSave = useDebouncedCallback(async (editor) => {
    try {
      await landingPageUpdateMutateAsync({
        shortUrlId,
        tiptapEditorContent: editor.getHTML(),
      });
    } catch (err) {}
  }, 500);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      TextStyle,
      Color,
      Youtube,
      Video,
      VariableComponentExtension,
      Placeholder.configure({
        placeholder: "Enter your content here",
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({
        HTMLAttributes: {
          style: `max-width: 100%;max-height: 100%;`,
        },
      }),
    ],
    content: tiptapEditorContent,
    onUpdate: ({ editor }) => {
      //  console.log(editor);
      handleEditorContentSave(editor);
    },
  });

  useEffect(() => {
    if (editor) editor.commands.setContent(tiptapEditorContent);
  }, [tiptapEditorContent]);

  return (
    <LandingPageContext.Provider value={landingPageData}>
      <LandingPageEditorTabContext.Provider value={activeTab}>
        <LandingPageEditorSetTabContext.Provider value={setActiveTab}>
          <TiptapEditorInstanceContext.Provider value={editor}>
            {children}
          </TiptapEditorInstanceContext.Provider>
        </LandingPageEditorSetTabContext.Provider>
      </LandingPageEditorTabContext.Provider>
    </LandingPageContext.Provider>
  );
}

function useLandingPageObj() {
  return useContext(LandingPageContext);
}

function useSetLandingPageEditorTab() {
  return useContext(LandingPageEditorSetTabContext);
}

function useLandingPageEditorTab() {
  return useContext(LandingPageEditorTabContext);
}

function useTiptapEditorInstance() {
  return useContext(TiptapEditorInstanceContext);
}

export {
  LandingPageContextProvider,
  useLandingPageObj,
  useSetLandingPageEditorTab,
  useLandingPageEditorTab,
  useTiptapEditorInstance,
};
