"use client";

import type { FormEventHandler } from "react";

import { getDefaultZIndex, Group, Modal, Space, Title } from "@mantine/core";
import { getHotkeyHandler } from "@mantine/hooks";
import { useTranslation } from "react-i18next";

import { SAVE_HOTKEY } from "@/utils/constants.ts";

import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons.tsx";

interface FormModalLayoutProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  centered?: boolean;
  children: React.ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement> | any;
  isLoading?: boolean;
  buttonTitle?: string;
  cancelButtonTitle?: string;
  noCustomHeader?: boolean;
  includeCancelButton?: boolean;
  cancelOnClick?: () => void;
  size?: string;
  customHeader?: React.ReactNode;
  submitButtonDisabled?: boolean;
  submitBtnColor?: string;
  submitButtonLeftIcon?: React.ReactNode;
  zIndex?: number | string;
}
export default function FormModalLayout({
  centered,
  onClose,
  opened,
  title,
  children,
  onSubmit,
  isLoading,
  buttonTitle,
  noCustomHeader,
  cancelOnClick,
  includeCancelButton = false,
  size = "md",
  customHeader,
  submitButtonDisabled,
  cancelButtonTitle,
  submitBtnColor,
  submitButtonLeftIcon,
  zIndex,
}: FormModalLayoutProps) {
  const { t: translations } = useTranslation();
  return (
    <Modal
      centered={centered}
      title={noCustomHeader && title}
      opened={opened}
      onClose={onClose}
      radius="lg"
      style={{ zIndex: 9999999 }}
      size={size}
      onClick={(e) => {
        e.stopPropagation();
      }}
      styles={{
        title: {
          fontSize: "1.2rem",
          fontWeight: 500,
        },
      }}
      zIndex={zIndex ?? getDefaultZIndex("modal")}
    >
      {!noCustomHeader && (
        <>
          {customHeader ? (
            customHeader
          ) : (
            <Title size={30} ta={"center"} mb={"md"}>
              {title}
            </Title>
          )}
        </>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSubmit();
        }}
        style={!noCustomHeader ? { padding: 20 } : {}}
        onKeyDown={getHotkeyHandler([
          [SAVE_HOTKEY, onSubmit ? onSubmit : () => {}],
        ])}
      >
        {children}
        <Space h={"md"} />
        <Group justify={includeCancelButton ? "flex-end" : "center"}>
          {includeCancelButton && (
            <RateupButtonSecondary
              type="reset"
              variant="subtle"
              onClick={cancelOnClick ? cancelOnClick : onClose}
              title={
                cancelButtonTitle ? cancelButtonTitle : translations("Cancel")
              }
            />
          )}
          {buttonTitle && (
            <RateupButtonBlue
              color={submitBtnColor || "var(--mantine-primary-color-filled)"}
              loading={isLoading}
              type="submit"
              title={buttonTitle}
              disabled={submitButtonDisabled}
              leftIcon={submitButtonLeftIcon}
            />
          )}
        </Group>
      </form>
    </Modal>
  );
}
