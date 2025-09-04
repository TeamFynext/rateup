"use client";

import React from "react";

import { Modal } from "@mantine/core";
import { useTranslations } from "next-intl";

import { LabelForm } from "@/components/Contacts/label-form";

import { useEditLabelsCtx } from "./edit-label-context";

const EditLabelModal = () => {
  const { opened, close, label } = useEditLabelsCtx();
  const t = useTranslations();

  return (
    <Modal opened={opened} onClose={close} title={t("Edit Label")} centered>
      <LabelForm data={label} close={close} />
    </Modal>
  );
};

export default EditLabelModal;
