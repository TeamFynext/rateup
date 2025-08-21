import { useState } from "react";

import { Blockquote, Group, Modal, Stack, Text } from "@mantine/core";
import { IconAlertOctagon } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useUser } from "../../context/UserContext";
import { showErrorToast } from "../../utils/notifications";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";

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
  excludeCancelButton?: boolean;
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
  excludeCancelButton = false,
}: ConfirmationModalProps) {
  const [email, setEmail] = useState("");
  const { user } = useUser();
  const translations = useTranslations();
  function confirmation(e) {
    e.stopPropagation();
    if (includeEmailConfirmation) {
      if (email === user?.email) {
        onConfirm();
        onClose();
      } else {
        showErrorToast(translations("Email entered is invalid"));
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
      radius={"md"}
      onClick={(e) => e.stopPropagation()}
      styles={{
        title: {
          fontSize: 20,
          fontWeight: "500",
        },
      }}
      withCloseButton={!excludeCancelButton}
      closeOnClickOutside={!excludeCancelButton}
    >
      <Modal.Body>
        <Stack gap={0}>
          <Text dangerouslySetInnerHTML={{ __html: headerLabel }} />
          {forDeleteFunctionality && deleteQuotion && (
            <Blockquote
              color="red"
              icon={<IconAlertOctagon size={18} />}
              iconSize={30}
              p={"sm"}
              mt={"sm"}
            >
              <Text size="xs">{deleteQuotion}</Text>
            </Blockquote>
          )}
          {includeEmailConfirmation && (
            <Stack gap={0}>
              <Text c="dimmed" size="xs">
                {translations("Please enter your email to confirm")}
              </Text>
              <ContainedTextField
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={translations("Enter your email")}
              />
            </Stack>
          )}
          <Group justify="flex-end" mt="md">
            {!excludeCancelButton && (
              <RateupButtonSecondary
                title={closeLabel || translations("Cancel")}
                onClick={onClose}
              />
            )}
            <RateupButtonBlue
              title={confirmLabel ?? translations("Submit")}
              onClick={confirmation}
              color={forDeleteFunctionality ? "red" : ""}
            />
          </Group>
        </Stack>
      </Modal.Body>
    </Modal>
  );
}
