import React, { useState } from "react";
import {
  ActionIcon,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import { useForm } from "@mantine/form";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import {
  ContainedSelection,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../../input/TeamSelector";
import Heading from "../../styled/Heading/Heading";
import { useUpdateMenuMutation } from "../../../backend/menu/menu.query";
import { useSurveysByTeam } from "../../../backend/surveys/surveys.query";
import RateupLoader from "../../Loaders/RateupLoader";
import { currencyLabel } from "../util/currencyData";
import { getHotkeyHandler } from "@mantine/hooks";
import { SAVE_HOTKEY } from "../../../utils/constants";
import ImageUploadSettings from "./ImageUploadSettings";
import { uploadFile, deleteUploadedFiles } from "utils/file-upload/upload";
import { showErrorToast } from "utils/notifications";
import { IconPlus, IconMinus } from "@tabler/icons-react";
import { z } from "zod";
import { zodResolver } from "mantine-form-zod-resolver";

const GeneralSettings = ({ editingItem }) => {
  let formatedItemValue = {
    ...editingItem?.menu,
    backkgroundImage: editingItem?.backgroundImage,
    mobileBackgroundImage: editingItem?.mobileBackgroundImage,
    unsplashImage: editingItem?.unsplashImage,
    surveyTeamMapId: editingItem?.surveyTeamMapId?.id,
    hideUnavailableCategory:
      editingItem?.menu?.hideUnavailableCategory?.toString(),
    dynamicVariables: editingItem?.dynamicVariables ?? [],
  };
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [mobileBackgroundImage, setMobileBackgroundImage] =
    useState<File | null>(null);
  const [imageToDelete, setImageToDelete] = useState([]);
  const [updatingLoading, setUpdatingLoading] = useState(false);
  const schema = z.object({
    name: z.string().trim().min(1),
    displayName: z.string().trim().min(1),
    teamId: z.string().min(1),
    surveyTeamMapId: z.string().optional(),
    currency: z.string(),
    unsplashImage: z
      .object({
        mobileBackgroundImage: z.boolean().optional(),
        backgroundImage: z.boolean().optional(),
      })
      .optional()
      .nullable(),
    dynamicVariables: z.array(
      z.object({
        name: z.string().trim().min(1),
        link: z.string().refine(
          (value) => {
            try {
              new URL(value);
              return true;
            } catch {
              return false;
            }
          },
          {
            message: "URL should be valid",
          },
        ),
      }),
    ),
  });
  const form = useForm({
    initialValues: formatedItemValue || {
      name: "",
      displayName: "",
      teamId: "",
      surveyTeamMapId: "",
      currency: "0",
      hideUnavailableCategory: "false",
      backgroundImage: "",
      mobileBackgroundImage: "",
      unsplashImage: "",
      dynamicVariables: [],
    },
    validate: zodResolver(schema),
  });

  const { isPending, mutate } = useUpdateMenuMutation(
    formatedItemValue?.id,
    () => {},
    () => {},
  );
  const { data: surveys = [], isPending: surveyIsPending } = useSurveysByTeam(
    form?.values?.teamId,
    !!form?.values?.teamId,
  );

  if (surveyIsPending) return <RateupLoader />;

  const surveyFormatedData = surveys
    ?.filter((survey) => survey?.type === "web")
    .map((survey) => ({
      value: survey.surveyTeamMapId,
      label: survey.title,
    }));

  const onSubmit = async (values: any) => {
    let changedValue = values;
    changedValue.hideUnavailableCategory =
      changedValue?.hideUnavailableCategory === "true";
    try {
      let imageArray = [];
      let deleteImageArray = [];
      setUpdatingLoading(true);
      backgroundImage && imageArray.push(backgroundImage);
      formatedItemValue?.backgroundImage &&
        backgroundImage &&
        deleteImageArray.push({ Key: formatedItemValue.backgroundImage });

      mobileBackgroundImage && imageArray.push(mobileBackgroundImage);
      formatedItemValue?.mobileBackgroundImage &&
        mobileBackgroundImage &&
        deleteImageArray.push({ Key: formatedItemValue.mobileBackgroundImage });

      let errors = [];
      if (imageArray?.length > 0) {
        const imageResponse = imageArray.map((data) => uploadFile(data));
        if (deleteImageArray?.length > 0) {
          imageResponse.push(
            deleteUploadedFiles({ fileKeyArray: deleteImageArray }),
          );
        }
        const response = await Promise.allSettled(imageResponse);
        errors = response.filter(
          (r) => r.status === "rejected",
        ) as PromiseRejectedResult[];
        const successes = response
          .filter(
            (r): r is PromiseFulfilledResult<string> =>
              r.status === "fulfilled",
          )
          .map((r) => r?.value);
        if (deleteImageArray?.length > 0) {
          successes?.pop();
        }
        if (mobileBackgroundImage)
          values.mobileBackgroundImage = successes.pop();
        if (backgroundImage) values.backgroundImage = successes.pop();
      }
      if (imageToDelete?.length > 0) {
        await deleteUploadedFiles({
          fileKeyArray: imageToDelete,
        });
      }
      mutate({
        menuId: formatedItemValue?.id,
        updatedData: values,
      });
      for (const imageUploadError of errors) {
        showErrorToast(imageUploadError.reason);
      }
    } catch (error) {
      setUpdatingLoading(false);
    } finally {
      setUpdatingLoading(false);
      setBackgroundImage(null);
      setMobileBackgroundImage(null);
      setImageToDelete([]);
    }
  };
  return (
    <PaperLayout>
      <form
        onSubmit={form.onSubmit(onSubmit)}
        style={{ gap: "20px" }}
        onKeyDown={getHotkeyHandler([
          [SAVE_HOTKEY, (event: any) => form.onSubmit(onSubmit)(event)],
        ])}
      >
        <Heading subtitle="General settings" />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <SimpleGrid cols={2} spacing="md">
            <TeamSelector
              placeholder="Select Team"
              label="Team"
              withAsterisk
              defaultValue={formatedItemValue?.teamId}
              allowDeselect={false}
              disabled={isPending}
              value={form?.getInputProps("teamId")?.value || ""}
              {...form.getInputProps("teamId")}
              onChange={(value) => {
                form.setFieldValue("surveyTeamMapId", "");
                form.setFieldValue("teamId", value);
              }}
              styles={{
                input: {
                  width: "100%",
                },
              }}
            />
            <ContainedTextField
              label="Menu Name"
              placeholder="Menu 1"
              withAsterisk
              {...form.getInputProps("name")}
            />
          </SimpleGrid>
          <ImageUploadSettings
            form={form}
            backgroundImage={backgroundImage}
            setBackgroundImage={setBackgroundImage}
            mobileBackgroundImage={mobileBackgroundImage}
            setMobileBackgroundImage={setMobileBackgroundImage}
            setImageToDelete={setImageToDelete}
          />
          <SimpleGrid cols={2} spacing="md">
            <ContainedTextField
              label="Display Name"
              placeholder="Hotel Name"
              withAsterisk
              {...form.getInputProps("displayName")}
            />
            <ContainedSelection
              allowDeselect={false}
              withAsterisk
              data={[
                { value: "false", label: "Disable" },
                { value: "true", label: "Hide" },
              ]}
              defaultValue={form?.values?.hideUnavailableCategory}
              {...form.getInputProps("hideUnavailableCategory")}
              label={" Hide or Disable category outside its scheduled time"}
            />
          </SimpleGrid>

          <SimpleGrid cols={2} spacing="md">
            <ContainedSelection
              label="Choose a survey to display in the menu page"
              placeholder={
                surveyFormatedData?.length === 0
                  ? "There is no published survay"
                  : "Select survey"
              }
              disabled={surveyFormatedData?.length === 0}
              required
              data={surveyFormatedData}
              {...form.getInputProps("surveyTeamMapId")}
            />
            <ContainedSelection
              allowDeselect={false}
              data={currencyLabel}
              defaultValue={currencyLabel[0].value}
              {...form.getInputProps("currency")}
              label={"Currency"}
            />
          </SimpleGrid>
        </SimpleGrid>
        <Group>
          {form.values?.dynamicVariables?.map((_, i) => (
            <Group key={form.key(`dynamicVariables.${i}`)}>
              <ContainedTextField
                label="dynamic variable name"
                placeholder="other"
                {...form.getInputProps(`dynamicVariables.${i}.name`)}
              />
              <ContainedTextField
                label="dynamic link"
                placeholder="url"
                type="url"
                {...form.getInputProps(`dynamicVariables.${i}.link`)}
              />
            </Group>
          ))}
          <Stack gap={4}>
            <Text fz={"xs"}>Dynamic variable</Text>
            <Group>
              {form.values?.dynamicVariables?.length < 3 && (
                <ActionIcon
                  variant="filled"
                  size={"lg"}
                  onClick={() =>
                    form.insertListItem(
                      "dynamicVariables",
                      form.values?.dynamicVariables?.length === 0
                        ? { name: "contact" }
                        : {},
                    )
                  }
                >
                  <IconPlus size={16} />
                </ActionIcon>
              )}
              {form.values?.dynamicVariables?.length >= 1 && (
                <ActionIcon
                  variant="filled"
                  size={"lg"}
                  onClick={() => {
                    const newVariants = form.values?.dynamicVariables?.slice(
                      0,
                      -1,
                    );
                    form.setFieldValue("dynamicVariables", newVariants);
                  }}
                >
                  <IconMinus size={16} />
                </ActionIcon>
              )}
            </Group>
          </Stack>
        </Group>
        <Grid justify="flex-end" mt={"md"}>
          <Grid.Col span={2}>
            <RateupButtonPrimary
              type="submit"
              loading={isPending || updatingLoading}
              title="Save Changes"
            />
          </Grid.Col>
          <Grid.Col span={5}></Grid.Col>
        </Grid>
      </form>
    </PaperLayout>
  );
};

export default GeneralSettings;
