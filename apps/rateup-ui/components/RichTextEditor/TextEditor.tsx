"use client";

import { useContext, useEffect } from "react";

import { Group } from "@mantine/core";
import { Link, RichTextEditor } from "@mantine/tiptap";
import { Color } from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Youtube } from "@tiptap/extension-youtube";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import SurveyContext from "../../context/SurveyContext";
import { ImageAlignButton } from "./image-align-button/image-align-button";
import InsertEmoji from "./InsertEmoji";
import InsertImage from "./InsertImage";
import CustomImageExtension from "./InsertImage/CustomImageExtenstion";
import InsertVariableControl from "./InsertVariableControl";
import InsertVideo from "./InsertVideo";
import { Video } from "./InsertVideo/CustomVideo";
import { VariableComponentExtension } from "./MantineComponentExtension";
import { getContent } from "./utils";

function TextEditor({ form, selectedLanguage, className = "" }) {
  const { variables } = useContext(SurveyContext);
  const content = getContent(
    form.values?.title?.[selectedLanguage],
    form.values?.description?.[selectedLanguage],
    variables,
  );

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
        placeholder: "Enter your question",
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      CustomImageExtension,
    ],
    content: content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      form.setFieldValue(`title.${selectedLanguage}`, editor.getHTML());
      if (form.values?.description?.[selectedLanguage]) {
        form.setFieldValue(`description.${selectedLanguage}`, "");
      }
      const content = editor.getHTML();
      if (content?.length === 8 && content.startsWith("<p>")) {
        editor.commands.setHeading({ level: 3 });
      }
    },
  });

  useEffect(() => {
    if (editor) {
      const selection = editor.state.selection;
      editor.commands.setContent(content, {
        parseOptions: { preserveWhitespace: "full" },
      });
      editor.commands.setTextSelection(selection);
      form.setFieldValue(`title.${selectedLanguage}`, editor.getHTML());
    }
  }, [content, editor]);

  return (
    <RichTextEditor editor={editor} className={className}>
      <RichTextEditor.Toolbar sticky tabIndex={-1}>
        <Group gap={"xs"}>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.ColorPicker
              colors={[
                "#25262b",
                "#868e96",
                "#fa5252",
                "#e64980",
                "#be4bdb",
                "#7950f2",
                "#4c6ef5",
                "#228be6",
                "#15aabf",
                "#12b886",
                "#40c057",
                "#82c91e",
                "#fab005",
                "#fd7e14",
              ]}
            />
            <RichTextEditor.UnsetColor />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Strikethrough />
            <RichTextEditor.ClearFormatting />
            <RichTextEditor.Code />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H1 />
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
            <RichTextEditor.H4 />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Blockquote />
            <RichTextEditor.Hr />
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Link popoverProps={{ withinPortal: false }} />
            <RichTextEditor.Unlink />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.AlignLeft />
            <RichTextEditor.AlignCenter />
            <RichTextEditor.AlignJustify />
            <RichTextEditor.AlignRight />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Undo />
            <RichTextEditor.Redo />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <InsertVariableControl question={form?.values} />
            <InsertEmoji />
            <InsertImage />
            <InsertVideo />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <div>
              <ImageAlignButton
                editor={editor}
                align="left"
                hideWhenUnavailable={true}
                showShortcut={true}
                onAligned={() => console.log("Image aligned!")}
              />
              <ImageAlignButton
                editor={editor}
                align="center"
                hideWhenUnavailable={true}
                showShortcut={true}
              />
              <ImageAlignButton
                editor={editor}
                align="right"
                hideWhenUnavailable={true}
                showShortcut={true}
              />
            </div>
          </RichTextEditor.ControlsGroup>
        </Group>
      </RichTextEditor.Toolbar>
      <RichTextEditor.Content mih={120} />
    </RichTextEditor>
  );
}

export default TextEditor;
