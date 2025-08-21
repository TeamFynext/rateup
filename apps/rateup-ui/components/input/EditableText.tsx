import { ReactNode, useState } from "react";

import {
  ActionIcon,
  FocusTrap,
  Input,
  MantineStyleProp,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconCheck, IconPencil } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

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
  radius?: string | number;
  label?: string | ReactNode;
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
  radius = "md",
  label = "",
}: EditableTextProps) {
  const [tempText, setTempText] = useState(text ?? "");
  const [focusTrapToggle, setfocusTrapToggle] = useState(false);
  const translations = useTranslations();

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
              ? translations("Enter the title")
              : translations("Enter the footer label")
            : translations("Double click to edit")
        }
        openDelay={500}
      >
        <TextInput
          value={handleOnFunction ? tempText : text}
          readOnly={!editMode}
          onChange={(e) =>
            handleOnFunction
              ? setTempText(e.target.value)
              : setText(e.target.value)
          }
          size={size}
          style={style}
          label={label}
          styles={{
            input: {
              textAlign: "center",
            },
            label: {
              width: "100%",
            },
          }}
          onDoubleClick={() => setEditingItem(id)}
          rightSectionPointerEvents="all"
          radius={radius}
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
