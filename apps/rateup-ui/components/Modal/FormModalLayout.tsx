import { Group, Modal, Space, Stack, Title } from "@mantine/core";
import { FormEventHandler } from "react";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
interface FormModalLayoutProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  centered?: boolean;
  children: React.ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement> | any;
  isLoading?: boolean;
  buttonTitle?: string;
  noCustomHeader?: boolean;
  includeCancelButton?: boolean;
  cancelOnClick?: () => void;
  size?: string;
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
    >
      {!noCustomHeader && (
        <Stack align={"center"}>
          <Title size={30}>{title}</Title>
        </Stack>
      )}
      <form onSubmit={onSubmit} style={{ padding: 20 }}>
        {children}
        <Space h={"md"} />
        <Group justify={includeCancelButton ? "flex-end" : "center"}>
          {includeCancelButton && (
            <RateupButtonSecondary
              color="var(--tertiary-color)"
              loading={isLoading}
              type="reset"
              variant="subtle"
              onClick={cancelOnClick ? cancelOnClick : onClose}
              title={"Cancel"}
            />
          )}
          {buttonTitle && (
            <RateupButtonBlue
              color="var(--tertiary-color)"
              loading={isLoading}
              type="submit"
              title={buttonTitle}
            />
          )}
        </Group>
      </form>
    </Modal>
  );
}
