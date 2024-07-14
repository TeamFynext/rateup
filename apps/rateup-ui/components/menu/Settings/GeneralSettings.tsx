import React, { useState } from "react";

import {
  ActionIcon,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { zodResolver } from "mantine-form-zod-resolver";
import { deleteUploadedFiles, uploadFile } from "utils/file-upload/upload";
import { showErrorToast } from "utils/notifications";

import { useUpdateMenuMutation } from "../../../backend/menu/menu.query";
import { useSurveysByTeam } from "../../../backend/surveys/surveys.query";
import { SAVE_HOTKEY } from "../../../utils/constants";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import {
  ContainedSelection,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../../input/TeamSelector";
import RateupLoader from "../../Loaders/RateupLoader";
import Heading from "../../styled/Heading/Heading";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { currencyLabel } from "../util/currencyData";
import { schema } from "./GeneralFormSchema";
import ImageUploadSettings from "./ImageUploadSettings";

const GeneralSettings = ({ editingItem }) => {
  let formatedItemValue = {
    ...editingItem?.menu,
    backkgroundImage: editingItem?.backgroundImage,
    mobileBackgroundImage: editingItem?.mobileBackgroundImage,
    logo: editingItem?.logo,
    unsplashImage: editingItem?.unsplashImage,
    surveyTeamMapId: editingItem?.surveyTeamMapId,
    hideUnavailableCategory:
      editingItem?.menu?.hideUnavailableCategory?.toString(),
    menuButtons: editingItem?.menuButtons ?? [],
  };
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [mobileBackgroundImage, setMobileBackgroundImage] =
    useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [imageToDelete, setImageToDelete] = useState([]);
  const [updatingLoading, setUpdatingLoading] = useState(false);

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
      logo: "",
      unsplashImage: "",
      menuButtons: [],
      locationUrl: "",
      locationText: "",
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

      logo && imageArray.push(logo);
      formatedItemValue?.logo &&
        logo &&
        deleteImageArray.push({ Key: formatedItemValue.logo });
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
        if (logo) values.logo = successes.pop();
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
      setLogo(null);
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
        <Container my="md" size={"xl"}>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
            <Stack>
              <ContainedTextField
                label="Menu Name"
                placeholder="Menu 1"
                withAsterisk
                {...form.getInputProps("name")}
              />
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
            </Stack>

            <Stack>
              <ContainedTextField
                label="Display Name"
                placeholder="Hotel Name"
                withAsterisk
                {...form.getInputProps("displayName")}
              />
              <ContainedSelection
                allowDeselect={false}
                data={currencyLabel}
                defaultValue={currencyLabel[0].value}
                {...form.getInputProps("currency")}
                label={"Currency"}
              />
            </Stack>
            <Stack>
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
              <ContainedTextField
                label="Location Label"
                placeholder="Kannur Rd, near CH Over bridge"
                {...form.getInputProps("locationText")}
              />
            </Stack>
            <Stack>
              <ContainedSelection
                allowDeselect={false}
                withAsterisk
                data={[
                  { value: "false", label: "Disable" },
                  { value: "true", label: "Hide" },
                ]}
                defaultValue={form?.values?.hideUnavailableCategory}
                {...form.getInputProps("hideUnavailableCategory")}
                label={"Disable category outside its scheduled time"}
              />
              <ContainedTextField
                label="Location URL"
                placeholder="https://goo.gl/maps/xyz1234"
                {...form.getInputProps("locationUrl")}
                type="url"
              />
            </Stack>
            <ImageUploadSettings
              form={form}
              backgroundImage={backgroundImage}
              setBackgroundImage={setBackgroundImage}
              mobileBackgroundImage={mobileBackgroundImage}
              setMobileBackgroundImage={setMobileBackgroundImage}
              logo={logo}
              setLogo={setLogo}
              setImageToDelete={setImageToDelete}
            />
          </SimpleGrid>
          <Group mt={"xs"}>
            {form.values?.menuButtons?.map((_, i) => (
              <SimpleGrid
                cols={{ base: 2, sm: 1 }}
                key={form.key(`menuButtons.${i}`)}
              >
                <ContainedTextField
                  label={`Menu Button Name ${i + 1}`}
                  placeholder="other"
                  {...form.getInputProps(`menuButtons.${i}.name`)}
                />
                <ContainedTextField
                  label={`Menu Button Value ${i + 1}`}
                  placeholder={i === 0 ? "+919876543210" : "link"}
                  {...form.getInputProps(`menuButtons.${i}.link`)}
                />
              </SimpleGrid>
            ))}
            <Stack gap={4}>
              <Text
                fz={"xs"}
                c={
                  "light-dark(var(--mantine-color-gray-7), var(--mantine-color-gray-4))"
                }
              >
                Menu Buttons
              </Text>
              <Group>
                {form.values?.menuButtons?.length < 3 && (
                  <ActionIcon
                    variant="filled"
                    size={"lg"}
                    onClick={() =>
                      form.insertListItem(
                        "menuButtons",
                        form.values?.menuButtons?.length === 0
                          ? { name: "contact" }
                          : {},
                      )
                    }
                  >
                    <IconPlus size={16} />
                  </ActionIcon>
                )}
                {form.values?.menuButtons?.length >= 1 && (
                  <ActionIcon
                    variant="filled"
                    size={"lg"}
                    onClick={() => {
                      const newVariants = form.values?.menuButtons?.slice(
                        0,
                        -1,
                      );
                      form.setFieldValue("menuButtons", newVariants);
                    }}
                  >
                    <IconMinus size={16} />
                  </ActionIcon>
                )}
              </Group>
            </Stack>
          </Group>
          <Stack align="center" mt={"xs"}>
            <RateupButtonPrimary
              type="submit"
              loading={isPending || updatingLoading}
              title="Save Changes"
            />
          </Stack>
        </Container>
      </form>
    </PaperLayout>
  );
};

export default GeneralSettings;
