"use client";

import { Modal } from "@mantine/core";

import { CustomFieldForm } from "@/components/Contacts/label-form";

export function EditModal({ opened, onClose, data }) {
  return (
    <Modal opened={opened} onClose={onClose} title="Edit Label" centered>
      <CustomFieldForm close={onClose} data={data} />
    </Modal>
  );
}
