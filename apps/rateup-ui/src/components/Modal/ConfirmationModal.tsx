"use client";

import { useState } from "react";

import { Blockquote, Group, Modal, Stack, Text } from "@mantine/core";
import { IconAlertOctagon } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useUser } from "@/context/UserContext.tsx";

import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons.tsx";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput.tsx";

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
  loading?: boolean;
  closeAfterOnConfirm?: boolean;
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
  loading = false,
  closeAfterOnConfirm = true,
}: ConfirmationModalProps) {
  const [email, setEmail] = useState("");
  const { user } = useUser();
  const { t: translations } = useTranslation();
  function confirmation(e) {
    e.stopPropagation();
    if (includeEmailConfirmation) {
      if (email === user?.email) {
        onConfirm();
        if (closeAfterOnConfirm) onClose();
      } else {
        toast.error(translations("Email entered is invalid"));
      }
    } else {
      onConfirm();
      if (closeAfterOnConfirm) onClose();
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
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.25)",
        },
      }}
      withCloseButton={!excludeCancelButton}
      closeOnClickOutside={!excludeCancelButton}
    >
      <Modal.Body>
        <Stack gap={0}>
          <Text size="sm" dangerouslySetInnerHTML={{ __html: headerLabel }} />
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
              loading={loading}
            />
          </Group>
        </Stack>
      </Modal.Body>
    </Modal>
  );
}
