"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Box, Button, Loader, Textarea, TextInput } from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import styles from "./AutosaveInput.module.css";

interface AutosaveInputProps {
  value?: string;
  isTextArea?: boolean;
  onSave: (value: string, name?: string) => Promise<any>;
  style?: React.CSSProperties;
  className?: string;
  name?: string;
  showToasts?: boolean;
}

function AutosaveInput({
  className,
  value = "",
  isTextArea = false,
  onSave,
  style,
  name,
  showToasts = true,
}: AutosaveInputProps) {
  const [inputState, setInputState] = useState(value);
  const [isInputBeingEdited, setIsInputBeingEdited] = useState(false);
  const [isSavingText, setIsSavingText] = useState(false);
  const { t: translations } = useTranslation();
  const inputRef = useRef(null);

  const handleEditBtnClick = useCallback(() => {
    setIsInputBeingEdited(true);
  }, [inputRef.current]);

  const handleInputBlur = useCallback(
    async (e) => {
      setIsInputBeingEdited(false);
      if (inputState !== value) {
        setIsSavingText(true);
        try {
          await onSave(inputState, name);
          if (showToasts) toast.success(translations("Saved Changes"));
        } catch (err) {
          setInputState(value);
          if (showToasts) toast.error(translations("Failed to Save Changes"));
        }
        setIsSavingText(false);
      }
    },
    [inputState, value, name],
  );

  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setInputState(value);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.code === "Enter") {
      if (e.shiftKey && isTextArea) {
        inputRef.current?.blur();
      } else if (!isTextArea) {
        inputRef.current?.blur();
      }
    }
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [isInputBeingEdited]);

  useEffect(() => {
    setInputState(value);
  }, [value]);

  let componentToBeRendered = null;
  if (!isInputBeingEdited) {
    componentToBeRendered = (
      <Button
        className={`${styles["auto-save-input-edit-btn"]} auto-save-input-edit-btn`}
        rightSection={
          isSavingText ? <Loader size={"1rem"} /> : <IconPencil size={"1rem"} />
        }
        onClick={handleEditBtnClick}
        style={style}
      >
        {inputState}
      </Button>
    );
  } else {
    if (isTextArea) {
      componentToBeRendered = (
        <Textarea
          className={`${styles["text-input"]} text-input`}
          autosize
          value={inputState}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          ref={inputRef}
          onKeyDown={handleKeyDown}
          style={style}
          autoComplete="off"
        />
      );
    } else {
      componentToBeRendered = (
        <TextInput
          className={`${styles["text-input"]} text-input`}
          value={inputState}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          ref={inputRef}
          onKeyDown={handleKeyDown}
          style={style}
          autoComplete="off"
        />
      );
    }
  }

  return (
    <Box
      className={`${styles["auto-save-input-div"]} auto-save-input-div  ${className}`}
    >
      {componentToBeRendered}
    </Box>
  );
}

export default AutosaveInput;
