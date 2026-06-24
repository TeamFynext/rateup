import { useDebouncedCallback } from "@mantine/hooks";
import { Link } from "@mantine/tiptap";
import { useParams } from "@tanstack/react-router";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Youtube from "@tiptap/extension-youtube";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { createContext, useContext, useEffect } from "react";

import { useUpdateLandingPageMutation } from "@/backend/landingPage/landingPage.query";
import CustomImageExtension from "@/components/RichTextEditor/InsertImage/CustomImageExtenstion.tsx";
import { Video } from "@/components/RichTextEditor/InsertVideo/CustomVideo.tsx";
import { VariableComponentExtension } from "@/components/RichTextEditor/MantineComponentExtension.tsx";

import tiptapDivStyles from "../Editor/RichTextEditor/RichTextEditor.module.css";

const LandingPageContext = createContext(null);
const LandingPageEditorTabContext = createContext(null);
const LandingPageEditorSetTabContext = createContext(null);
const TiptapEditorInstanceContext = createContext(null);

function LandingPageContextProvider({ landingPageData, children, activeTab, setActiveTab }) {
  const { tiptapEditorContent } = landingPageData;

  const params = useParams({
    strict: false,
  });
  const shortUrlId = params?.shortUrlId as string;
  const { mutateAsync: landingPageUpdateMutateAsync } = useUpdateLandingPageMutation(shortUrlId);
  const handleEditorContentSave = useDebouncedCallback(async (editor) => {
    try {
      await landingPageUpdateMutateAsync({
        shortUrlId,
        tiptapEditorContent: editor.getHTML(),
      });
    } catch {}
  }, 2000);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
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
      CustomImageExtension.configure({
        inline: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    content: tiptapEditorContent,
    onUpdate: ({ editor }) => {
      handleEditorContentSave(editor);
    },
    editorProps: {
      attributes: {
        class: tiptapDivStyles["tiptap-div"],
      },
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
  useTiptapEditorInstance,
};
