import {
  ActionIcon,
  FocusTrap,
  Input,
  MantineStyleProp,
  Tooltip,
} from "@mantine/core";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconCheck, IconPencil } from "@tabler/icons-react";
import { useState } from "react";
import { SAVE_HOTKEY } from "../../utils/constants";

interface EditableTextProps {
  text: string;
  setText: (text: string) => void;
  id: string;
  setEditingItem: (id: any) => void;
  style?: MantineStyleProp;
  placeholder?: string;
  editMode?: boolean;
  saveOnEnter?: boolean;
  handleOnFunction?: boolean;
  handleButtonTextUpdate?: () => void;
  size?: string;
}
export function EditableText({
  text,
  setText,
  id,
  setEditingItem,
  placeholder = "",
  style = {},
  editMode = false,
  saveOnEnter = true,
  handleOnFunction = true,
  handleButtonTextUpdate,
  size = "sm",
}: EditableTextProps) {
  const [tempText, setTempText] = useState(text ?? "");
  const [focusTrapToggle, setfocusTrapToggle] = useState(false);
  function handleSave() {
    setfocusTrapToggle(false);
    setEditingItem(null);
    if (handleOnFunction) setText(tempText);
    else handleButtonTextUpdate();
  }
  return (
    <FocusTrap active={focusTrapToggle}>
      <Tooltip
        label={
          editMode
            ? handleOnFunction
              ? "Enter the title"
              : "Enter the footer label"
            : "Double click to edit"
        }
        openDelay={500}
      >
        <Input
          value={handleOnFunction ? tempText : text}
          readOnly={!editMode}
          onChange={(e) =>
            handleOnFunction
              ? setTempText(e.target.value)
              : setText(e.target.value)
          }
          size={size}
          style={style}
          onDoubleClick={() => setEditingItem(id)}
          rightSectionPointerEvents="all"
          placeholder={placeholder}
          onKeyUp={(event) => {
            if (event.key === "Enter" && saveOnEnter) {
              handleSave();
            }
          }}
          onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, handleSave]])}
          rightSection={
            editMode ? (
              <ActionIcon onClick={handleSave}>
                <IconCheck />
              </ActionIcon>
            ) : (
              <ActionIcon
                onClick={() => {
                  setEditingItem(id);
                  setfocusTrapToggle(true);
                }}
                variant="subtle"
              >
                <IconPencil size={20} />
              </ActionIcon>
            )
          }
        />
      </Tooltip>
    </FocusTrap>
  );
}
