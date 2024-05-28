import { Group, Modal, Space, Stack, Title } from "@mantine/core";
import { FormEventHandler } from "react";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import { getHotkeyHandler } from "@mantine/hooks";
import { SAVE_HOTKEY } from "../../utils/constants";
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
}: FormModalLayoutProps) {
  return (
    <Modal
      centered={centered}
      title={noCustomHeader && title}
      opened={opened}
      onClose={onClose}
      radius="lg"
      bg={"red"}
      style={{ zIndex: 9999999 }}
      size={size}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {!noCustomHeader && (
        <>
          {customHeader ? (
            customHeader
          ) : (
            <Stack align={"center"}>
              <Title size={30}>{title}</Title>
            </Stack>
          )}
        </>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSubmit();
        }}
        style={{ padding: 20 }}
        onKeyDown={getHotkeyHandler([
          [SAVE_HOTKEY, onSubmit ? onSubmit : () => {}],
        ])}
      >
        {children}
        <Space h={"md"} />
        <Group justify={includeCancelButton ? "flex-end" : "center"}>
          {includeCancelButton && (
            <RateupButtonSecondary
              color="var(--tertiary-color)"
              type="reset"
              variant="subtle"
              onClick={cancelOnClick ? cancelOnClick : onClose}
              title={cancelButtonTitle ? cancelButtonTitle : "Cancel"}
            />
          )}
          {buttonTitle && (
            <RateupButtonBlue
              color="var(--mantine-primary-color-filled)"
              loading={isLoading}
              type="submit"
              title={buttonTitle}
              disabled={submitButtonDisabled}
            />
          )}
        </Group>
      </form>
    </Modal>
  );
}
