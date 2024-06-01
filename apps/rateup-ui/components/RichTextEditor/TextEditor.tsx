import { useContext, useEffect } from "react";
import {
  Link,
  RichTextEditor,
  useRichTextEditorContext,
} from "@mantine/tiptap";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { isHtml } from "../../utils";
import { Group, Menu } from "@mantine/core";
import { VariableComponentExtension } from "./MantineComponentExtension";
import SurveyContext from "../../context/SurveyContext";
import { useQuestions } from "../../backend/surveys/questions/questions.query";
import SelectedLanguageContext from "../../context/SelectedLanguage";
import {
  getFilteredVariablesForQuestion,
  getFormattedTitleFromVariable,
} from "../../utils/survey/question/question.utils";
import { IconVariable } from "@tabler/icons-react";

export default function TextEditor({ form, selectedLanguage }) {
  const content = getContent(
    form.values?.title?.[selectedLanguage],
    form.values?.description?.[selectedLanguage],
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      VariableComponentExtension,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      form.setFieldValue(`title.${selectedLanguage}`, editor.getHTML());
      if (form.values?.description?.[selectedLanguage]) {
        form.setFieldValue(`description.${selectedLanguage}`, "");
      }
    },
  });

  useEffect(() => {
    if (editor) {
      const selection = editor.state.selection;
      editor.commands.setContent(content, null, {
        preserveWhitespace: "full",
      });
      editor.commands.setTextSelection(selection);
      form.setFieldValue(`title.${selectedLanguage}`, editor.getHTML());
    }
  }, [content, editor]);

  return (
    <RichTextEditor editor={editor}>
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
              popoverProps={{
                withinPortal: false,
              }}
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
          <InsertVariableControl question={form?.values} />
        </Group>
      </RichTextEditor.Toolbar>
      <RichTextEditor.Content mih={120} />
    </RichTextEditor>
  );
}

const getContent = (title: string, desc: string) => {
  const { variables } = useContext(SurveyContext);
  if (isHtml(title)) {
    return getFormattedTitleFromVariable(title, variables) || title;
  } else if (desc) {
    return `<h3>${title}</h3><p> ${desc}</p>`;
  } else {
    return `<h3>${title}</h3>`;
  }
};

const InsertVariableControl = ({ question }) => {
  const { editor } = useRichTextEditorContext();
  const { variables, surveyId } = useContext(SurveyContext);
  const { data: questions } = useQuestions(surveyId);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const fileteredVariables = variables?.length
    ? getFilteredVariablesForQuestion(
        variables,
        selectedLanguage,
        questions,
        question,
      )
    : [];
  const variablesData =
    fileteredVariables?.map((val: SurveyVariable) => val?.name) ?? [];

  return variablesData.length ? (
    <RichTextEditor.Control aria-label="variables" title="variables">
      <Menu
        position="bottom-start"
        transitionProps={{ transition: "rotate-right", duration: 150 }}
        shadow="md"
      >
        <Menu.Target>
          <IconVariable stroke={1.2} size={"1.2rem"} />
        </Menu.Target>
        <Menu.Dropdown>
          {variablesData?.map((value) => (
            <Menu.Item
              onClick={() => {
                if (!value) return;
                editor?.commands.insertContent(
                  `<variable-component label=${value}></variable-component>`,
                );
              }}
            >
              {value}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </RichTextEditor.Control>
  ) : null;
};
