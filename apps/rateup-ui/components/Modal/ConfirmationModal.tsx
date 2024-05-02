import { Group, Modal, Stack, Text, Blockquote } from "@mantine/core";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import { useState } from "react";
import { useUser } from "../../context/UserContext";
import { showErrorToast } from "../../utils/notifications";
import { IconAlertOctagon } from "@tabler/icons-react";

interface ConfirmationModalProps {
  forDeleteFunctionality?: boolean;
  opened: boolean;
  onClose: () => void;
  headerTitle: string;
  headerLabel: string;
  confirmLabel: string;
  closeLabel?: string;
  onConfirm: (e?: any) => void;
  includeEmailConfirmation?: boolean;
  deleteQuotion?: string;
}
export default function ConfirmationModal({
  opened,
  onClose,
  confirmLabel,
  closeLabel,
  headerLabel,
  onConfirm,
  headerTitle,
  forDeleteFunctionality,
  includeEmailConfirmation = false,
  deleteQuotion,
}: ConfirmationModalProps) {
  const [email, setEmail] = useState("");
  const { user } = useUser();
  function confirmation(e) {
    e.stopPropagation();
    if (includeEmailConfirmation) {
      if (email === user?.email) {
        onConfirm();
        onClose();
      } else {
        showErrorToast("Entered email invalid");
      }
    } else {
      onConfirm();
      onClose();
    }
  }
  return (
    <Modal
      centered
      title={headerTitle}
      opened={opened}
      onClose={onClose}
      radius={"lg"}
      onClick={(e) => e.stopPropagation()}
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
          {forDeleteFunctionality && deleteQuotion && (
            <Blockquote
              color="red"
              icon={<IconAlertOctagon size={18} />}
              iconSize={30}
              p={"sm"}
            >
              <Text size="xs">{deleteQuotion}</Text>
            </Blockquote>
          )}
          {includeEmailConfirmation && (
            <Stack gap={0}>
              <Text c="dimmed" size="xs">
                Please enter your email to confirm
              </Text>
              <ContainedTextField
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </Stack>
          )}
          <Group justify="flex-end" mt="md">
            <RateupButtonSecondary
              title={closeLabel || "Cancel"}
              onClick={onClose}
            />
            <RateupButtonBlue
              title={confirmLabel ?? "Submit"}
              onClick={confirmation}
              color={forDeleteFunctionality ? "red" : ""}
            />
          </Group>
        </Stack>
      </Modal.Body>
    </Modal>
  );
}
