import { Group, Modal, Stack, Text } from "@mantine/core";
import { RateupButtonBlue } from "../Button/RateupButtons";

interface ConfirmationModalProps {
  forDeleteFunctionality?: boolean;
  opened: boolean;
  onClose: () => void;
  headerTitle: string;
  headerLabel: string;
  confirmLabel: string;
  onConfirm: (e?: any) => void;
}
export default function ConfirmationModal({
  opened,
  onClose,
  confirmLabel,
  headerLabel,
  onConfirm,
  headerTitle,
  forDeleteFunctionality,
}: ConfirmationModalProps) {
  return (
    <Modal
      centered
      title={headerTitle}
      opened={opened}
      onClose={onClose}
      radius={"lg"}
      styles={{
        title: {
          fontSize: 20,
          fontWeight: "bolder",
        },
      }}
    >
      <Modal.Body>
        <Stack>
          <Text fw={500}>{headerLabel}</Text>
          <Group justify="flex-end">
            <RateupButtonBlue title={"Cancel"} onClick={onClose} />
            <RateupButtonBlue
              title={confirmLabel ?? "Submit"}
              onClick={onConfirm}
              color={forDeleteFunctionality ? "red" : ""}
            />
          </Group>
        </Stack>
      </Modal.Body>
    </Modal>
  );
}
