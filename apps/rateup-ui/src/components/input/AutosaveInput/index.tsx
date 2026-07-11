import { IconLoader2, IconPencil } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { cn } from "@/lib/utils.ts";

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
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const handleEditBtnClick = useCallback(() => {
    setIsInputBeingEdited(true);
  }, []);

  const handleInputBlur = useCallback(
    async (_e) => {
      setIsInputBeingEdited(false);
      if (inputState !== value) {
        setIsSavingText(true);
        try {
          await onSave(inputState, name);
          if (showToasts) toast.success(translations("Saved Changes"));
        } catch {
          setInputState(value);
          if (showToasts) toast.error(translations("Failed to Save Changes"));
        }
        setIsSavingText(false);
      }
    },
    [inputState, value, name],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInputState(e.target.value);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.code === "Enter") {
        if (e.shiftKey && isTextArea) {
          inputRef.current?.blur();
        } else if (!isTextArea) {
          inputRef.current?.blur();
        }
      }
    },
    [isTextArea],
  );

  useEffect(() => {
    if (isInputBeingEdited) inputRef.current?.focus();
  }, [isInputBeingEdited]);

  useEffect(() => {
    setInputState(value);
  }, [value]);

  return (
    <div className={cn("auto-save-input-div flex w-full justify-center", className)}>
      {!isInputBeingEdited ? (
        <button
          className="auto-save-input-edit-btn relative flex items-center gap-1 bg-transparent text-lg font-normal leading-normal text-black"
          style={{ ...style, left: "1.125rem", whiteSpace: "pre" }}
          onClick={handleEditBtnClick}
        >
          {inputState}
          <span className="rounded-full bg-white p-1.5 text-black">
            {isSavingText ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconPencil size={"1rem"} />
            )}
          </span>
        </button>
      ) : isTextArea ? (
        <Textarea
          className="w-full cursor-pointer resize-none border-none bg-transparent px-0 text-center text-lg shadow-none focus-visible:ring-0"
          style={style}
          value={inputState}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          ref={inputRef}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      ) : (
        <Input
          className="w-full border-none bg-transparent px-0 text-center text-lg shadow-none focus-visible:ring-0"
          style={style}
          value={inputState}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          ref={inputRef}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      )}
    </div>
  );
}

export default AutosaveInput;
