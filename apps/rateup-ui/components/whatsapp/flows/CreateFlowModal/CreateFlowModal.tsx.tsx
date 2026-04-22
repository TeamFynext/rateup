"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { Box, Button, Modal, MultiSelect } from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { useExtracted } from "next-intl";

import { useTeamsByUser } from "@/backend/team/team.query";

import { useCreateFlowMutation } from "../../../../backend/whatsapp/flow/flow.query";
import { SAVE_HOTKEY } from "../../../../utils/constants";
import {
  ContainedMultiSelect,
  ContainedTextField,
} from "../../../input/ContainedInput/ContainedInput";
import { flowsCategories } from "../constants";
import styles from "./CreateFlowModal.module.css";

function CreateFlowModal({ opened, onClose }) {
  const form = useForm({
    initialValues: {
      name: "",
      categories: [],
      teamId: [],
    },
    validate: {
      name: (value) => (value.length === 0 ? "Please enter a name" : null),
      categories: (value) =>
        value.length === 0 ? "Please select a category" : null,
    },
  });
  const translations = useExtracted();
  const router = useRouter();
  const { data: teamRes } = useTeamsByUser();
  const teamOptions = teamRes?.data?.map((team) => ({
    value: team?.id,
    label: team?.name,
  }));
  const handleModalClose = useCallback(() => {
    form.reset();
    onClose();
  }, [form]);

  const createFlowMutation = useCreateFlowMutation();
  const handleSubmitBtnClick = () => {
    createFlowMutation.mutate(
      {
        name: form.values.name,
        categories: form.values.categories,
        teamIds: form.values.teamId,
      },
      {
        onSettled: (id) => {
          handleModalClose();
          if (!id && typeof id !== "string") return;
          router.push(`/dashboard/whatsapp/flows/v2/${id}`);
        },
        onError: (error) => {
          console.error(error);
        },
      },
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={handleModalClose}
      title={translations("Create Flow")}
      centered
      classNames={{
        title: styles["modal-title"],
        close: styles["modal-close-button"],
      }}
      onKeyDown={getHotkeyHandler([
        [
          SAVE_HOTKEY,
          (event: any) => form.onSubmit(handleSubmitBtnClick)(event),
        ],
      ])}
    >
      <Box className={styles["create-flow-modal-body"]}>
        <ContainedTextField
          label={translations("Name")}
          placeholder={translations("Enter Name")}
          {...form.getInputProps("name")}
        />
        <ContainedMultiSelect
          label={translations("Categories")}
          placeholder={translations("Select Categories")}
          data={flowsCategories}
          {...form.getInputProps("categories")}
        />
        {/* <TeamSelector // TODO: add multi select
          label={translations("Team")}
          value={form.values.teamId}
          onChange={(value) => form.setFieldValue("teamId", value)}
        /> */}
        <MultiSelect
          radius="md"
          label={translations("Select Teams")}
          placeholder={translations("Select teams")}
          data={teamOptions}
          {...form.getInputProps("teamId")}
          error={form.errors.teamId}
        />
      </Box>
      <Box className={styles["create-flow-modal-footer"]}>
        <Button variant="default" onClick={handleModalClose}>
          {translations("Cancel")}
        </Button>
        <Button
          loading={createFlowMutation.isPending}
          onClick={handleSubmitBtnClick}
        >
          {translations("Submit")}
        </Button>
      </Box>
    </Modal>
  );
}

export default CreateFlowModal;
