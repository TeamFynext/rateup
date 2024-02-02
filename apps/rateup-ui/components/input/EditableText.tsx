import { ContainedTextField } from "./ContainedInput/ContainedInput";
import {
  ActionIcon,
  FocusTrap,
  Group,
  MantineStyleProp,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import inputStyles from "./InputStyles.module.css";

interface EditableTextProps {
  text: string;
  setText: (text: string) => void;
  id: string;
  setEditingItem: (id: any) => void;
  placeholder?: string;
  label?: string;
  editMode?: boolean;
  style?: MantineStyleProp;
  textStyle?: MantineStyleProp;
  inputStyle?: MantineStyleProp;
  saveOnEnter?: boolean;
}
export function EditableText({
  text,
  setText,
  id,
  setEditingItem,
  placeholder = "",
  label = "",
  editMode = false,
  style = {},
  textStyle = {},
  inputStyle = {},
  saveOnEnter = true,
}: EditableTextProps) {
  if (editMode) {
    return (
      <FocusTrap active={true}>
        <Group
          style={{
            ...style,
          }}
        >
          <ContainedTextField
            label={label}
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              flexGrow: 1,
              ...inputStyle,
            }}
            placeholder={placeholder}
            onKeyUp={(event) => {
              if (event.key === "Enter" && saveOnEnter) {
                setEditingItem(null);
              }
            }}
          />
          <ActionIcon onClick={() => setEditingItem(null)}>
            <IconCheck />
          </ActionIcon>
        </Group>
      </FocusTrap>
    );
  } else {
    const combinedStyles = { ...style, ...textStyle };
    return (
      <Tooltip label="Double click to edit" openDelay={500}>
        <Text
          className={inputStyles.editableTextDisplay}
          style={{
            height: "50px",
            lineHeight: "40px",
            ...combinedStyles,
          }}
          onDoubleClick={() => setEditingItem(id)}
          c={text ? "black" : "gray"}
          truncate
        >
          {text || placeholder}
        </Text>
      </Tooltip>
    );
  }
}
