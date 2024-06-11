import { useContext, useEffect, useRef, useState } from "react";
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
import {
  ActionIcon,
  Group,
  Menu,
  NumberInput,
  Popover,
  Stack,
  Switch,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { VariableComponentExtension } from "./MantineComponentExtension";
import SurveyContext from "../../context/SurveyContext";
import { useQuestions } from "../../backend/surveys/questions/questions.query";
import SelectedLanguageContext from "../../context/SelectedLanguage";
import {
  getFilteredVariablesForQuestion,
  getFormattedTitleFromVariable,
} from "../../utils/survey/question/question.utils";
import { IconPhoto, IconVariable, IconVideo } from "@tabler/icons-react";
import Image from "@tiptap/extension-image";
import { PopoverEmojiPicker } from "../whatsapp/templates/Details/TextFormateToolBar";
import { RateupButtonPrimary } from "../Button/RateupButtons";
import { Youtube } from "@tiptap/extension-youtube";
import { Video } from "./CustomVideo";
import { useForm } from "@mantine/form";

export default function TextEditor({ form, selectedLanguage }) {
  const { variables } = useContext(SurveyContext);
  const content = getContent(
    form.values?.title?.[selectedLanguage],
    form.values?.description?.[selectedLanguage],
    variables,
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      TextStyle,
      Color,
      Youtube,
      Video,
      VariableComponentExtension,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({
        HTMLAttributes: {
          style: `max-width: 100%;max-height: 100%;`,
        },
      }),
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
          <RichTextEditor.ControlsGroup>
            <InsertVariableControl question={form?.values} />
            <InsertEmoji />
            <InsertImage />
            <InsertVideo />
          </RichTextEditor.ControlsGroup>
        </Group>
      </RichTextEditor.Toolbar>
      <RichTextEditor.Content mih={120} />
    </RichTextEditor>
  );
}

const getContent = (title: string, desc: string, variables) => {
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

  return (
    <RichTextEditor.Control aria-label="variables" title="variables">
      <Menu
        position="bottom-start"
        transitionProps={{ transition: "rotate-right", duration: 150 }}
        shadow="md"
      >
        <Menu.Target>
          <ActionIcon
            variant="subtle"
            color="black"
            size={"sm"}
            disabled={!variablesData.length}
          >
            <IconVariable stroke={1.2} size={"1.2rem"} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {variablesData?.map((value) => (
            <Menu.Item
              key={value}
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
  );
};

function InsertEmoji() {
  const { editor } = useRichTextEditorContext();
  return (
    <RichTextEditor.Control aria-label="Insert emoji" title="Insert emoji">
      <PopoverEmojiPicker
        onEmojiClick={(emoji) => editor?.commands?.insertContent(emoji)}
      />
    </RichTextEditor.Control>
  );
}

function InsertImage() {
  const { editor } = useRichTextEditorContext();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const ref = useRef(null);
  const handleImageSave = () => {
    try {
      new URL(url);
      editor.chain().focus().setImage({ src: url }).run();
      setUrl("");
      ref?.current?.click();
    } catch (error) {
      setError("Enter a valid url");
    }
  };
  return (
    <Popover position="bottom" withArrow shadow="md">
      <Popover.Target>
        <RichTextEditor.Control
          aria-label="Insert image"
          title="Insert image"
          ref={ref}
        >
          <IconPhoto size={16} />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack justify="center">
          <TextInput
            type="url"
            value={url}
            placeholder="Enter the url of image"
            onChange={(event) => {
              setUrl(event.currentTarget.value);
              setError("");
            }}
            error={error}
          />
          <RateupButtonPrimary title="submit" onClick={handleImageSave} />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function isYouTubeLink(url) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
  return youtubeRegex.test(url);
}

function InsertVideo() {
  const { editor } = useRichTextEditorContext();
  const form = useForm({
    initialValues: {
      src: "",
      height: 0,
      width: 0,
      customSize: false,
    },
  });
  const ref = useRef(null);
  const handleImageVideo = () => {
    try {
      const url = form.getValues().src;
      new URL(url);
      let videoOption = form.getValues().customSize
        ? {
            src: url,
            width: form.getValues().width,
            height: form.getValues().height,
          }
        : { src: form.getValues().src };
      if (isYouTubeLink(url)) {
        editor.commands.setYoutubeVideo(videoOption);
      } else {
        editor.commands.setVideo(videoOption);
      }
      ref?.current?.click();
      form.reset();
    } catch (error) {
      form.setErrors({ src: "Enter a valid url" });
    }
  };
  return (
    <Popover position="bottom" withArrow shadow="md">
      <Popover.Target>
        <RichTextEditor.Control
          aria-label="Insert video"
          title="Insert video"
          ref={ref}
        >
          <IconVideo size={16} />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack justify="center">
          <Group>
            <Tooltip label="Enable Custom size" refProp="rootRef">
              <Switch {...form.getInputProps("customSize")} mt={"lg"} />
            </Tooltip>
            <NumberInput
              label={"height"}
              w={100}
              disabled={!form.getValues().customSize}
              min={0}
              {...form.getInputProps("height")}
            />
            <NumberInput
              label={"width"}
              w={100}
              min={0}
              disabled={!form.getValues().customSize}
              {...form.getInputProps("width")}
            />
          </Group>

          <TextInput
            type="url"
            placeholder="Enter the url of video"
            {...form.getInputProps("src")}
          />
          <RateupButtonPrimary title="submit" onClick={handleImageVideo} />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
