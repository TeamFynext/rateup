"use client";

import { Stack } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useTeamsByUser } from "@/backend/team/team.query";
import { useCreateTestimonialCollection } from "@/backend/testimonials/testimonial.query";

import { defaultTestimonialStyle } from "@/utils/testimonial.ts";
import {
  ContainedSelection,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput.tsx";
import FormModalLayout from "../Modal/FormModalLayout.tsx";

const SaveTestimonialCollection = ({ opened, close }) => {
  const {
    data: teamRes,
    isLoading: teamsLoading,
    isError,
    error,
  } = useTeamsByUser();
  const teamOptions = teamRes?.data?.map((team) => ({
    value: team?.id,
    label: team?.name,
  }));
  const { t: translations } = useTranslation();
  const form = useForm({
    initialValues: {
      name: "",
      teamId: "",
      theme: defaultTestimonialStyle,
    },
    validate: {
      name: isNotEmpty(translations("Name cannot be blank")),
      teamId: isNotEmpty(translations("Please select a team")),
    },
  });

  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const saveCollection = useCreateTestimonialCollection();
  const onSubmit = async () => {
    const validationRes = await form.validate();
    if (validationRes.hasErrors) return;
    toast.loading(
      translations("Hold on, your collection is getting created..."),
      {
        id: "create-collection",
      },
    );
    saveCollection.mutate(form.values, {
      onSuccess: (data) => {
        close();
        navigate({
          to: `${pathname}/${data?.id}`,
        });
      },
    });
  };

  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={translations("Create Collection")}
      centered
      onSubmit={onSubmit}
      buttonTitle={translations("Save")}
      includeCancelButton
      cancelOnClick={() => {
        form.reset();
        close();
      }}
    >
      <Stack>
        <ContainedTextField
          label={translations("Name your collection")}
          {...form.getInputProps("name")}
          placeholder={translations("Enter collection name ")}
          styles={{
            label: {
              fontWeight: "bold",
              fontSize: "16px",
            },
          }}
        />
        <ContainedSelection
          allowDeselect={false}
          data={teamOptions}
          label={translations("Select Team")}
          {...form.getInputProps("teamId")}
          placeholder={translations("Select Team")}
        />
      </Stack>
    </FormModalLayout>
  );
};

export default SaveTestimonialCollection;
