import { Modal, Space, Stack, Title } from "@mantine/core";
import { FormEventHandler } from "react";
import { RateupButtonSecondary } from "../Button/RateupButtons";
interface FormModalLayoutProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  centered?: boolean;
  children: React.ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  isLoading?: boolean;
  buttonTitle?: string;
  noCustomHeader?: boolean;
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
}: FormModalLayoutProps) {
  return (
    <Modal
      centered={centered}
      title={noCustomHeader && title}
      opened={opened}
      onClose={onClose}
      radius="lg"
      bg={"red"}
    >
      {!noCustomHeader && (
        <Stack align={"center"}>
          <Title size={30}>{title}</Title>
        </Stack>
      )}
      <form onSubmit={onSubmit} style={{ padding: 20 }}>
        {children}
        <Space h={"md"} />
        <RateupButtonSecondary
          color="var(--tertiary-color)"
          loading={isLoading}
          type="submit"
          title={buttonTitle}
        />
      </form>
    </Modal>
  );
}
