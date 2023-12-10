import { Modal, Space, Stack, Title } from "@mantine/core";
interface FormModalLayoutProps {
  centered?: boolean;
  onClose: () => void;
  opened: boolean;
  title: string;
  children: React.ReactNode;
  noCustomHeader?: boolean;
  size?: string;
}
export default function SimpleModalLayout({
  centered,
  onClose,
  opened,
  title,
  children,
  noCustomHeader,
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
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {!noCustomHeader && (
        <Stack align={"center"}>
          <Title size={30}>{title}</Title>
        </Stack>
      )}
      <Space h="lg" />
      {children}
    </Modal>
  );
}
