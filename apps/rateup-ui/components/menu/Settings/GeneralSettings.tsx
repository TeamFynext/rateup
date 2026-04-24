"use client";

import { useEffect, useMemo, useState } from "react";

import { IconMinus, IconPlus } from "@tabler/icons-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useExtracted } from "next-intl";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

import { MenuButtons } from "@/types/enums";
import { useUpdateMenuMutation } from "@/backend/menu/menu.query";
import { useSurveysByTeam } from "@/backend/surveys/surveys.query";
import { TeamSelector } from "@/components/input/TeamSelector";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteUploadedFiles, uploadFile } from "@/utils/file-upload/upload";

import { currencyLabel } from "../util/currencyData";
import { schema } from "./GeneralFormSchema";
import ImageUploadSettings from "./ImageUploadSettings";

type GeneralSettingsFormValues = z.infer<typeof schema>;

type GeneralSettingsProps = {
  readonly editingItem: any;
};

const isPhoneButtonType = (value?: string) =>
  value === MenuButtons.CONTACT || value === MenuButtons.WHATSAPP;

const defaultFormValues: GeneralSettingsFormValues = {
  name: "",
  displayName: "",
  teamId: "",
  surveyTeamMapId: "",
  currency: "0",
  hideUnavailableCategory: "false",
  backgroundImage: "",
  mobileBackgroundImage: "",
  logo: "",
  unsplashImage: {},
  menuButtons: [],
  locationUrl: "",
  locationText: "",
};

const GeneralSettings = ({ editingItem }: Readonly<GeneralSettingsProps>) => {
  const translations = useExtracted();

  const formatedItemValue = useMemo<GeneralSettingsFormValues>(() => {
    if (!editingItem) {
      return defaultFormValues;
    }

    return {
      ...defaultFormValues,
      ...editingItem?.menu,
      backgroundImage: editingItem?.backgroundImage ?? "",
      mobileBackgroundImage: editingItem?.mobileBackgroundImage ?? "",
      logo: editingItem?.logo ?? "",
      unsplashImage: editingItem?.unsplashImage ?? {},
      surveyTeamMapId: editingItem?.surveyTeamMapId ?? "",
      hideUnavailableCategory:
        editingItem?.menu?.hideUnavailableCategory?.toString() ?? "false",
      menuButtons: editingItem?.menuButtons ?? [],
    };
  }, [editingItem]);

  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [mobileBackgroundImage, setMobileBackgroundImage] =
    useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [imageToDelete, setImageToDelete] = useState<Array<{ Key: string }>>(
    [],
  );
  const [updatingLoading, setUpdatingLoading] = useState(false);

  const form = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: formatedItemValue,
  });

  useEffect(() => {
    form.reset(formatedItemValue);
  }, [form, formatedItemValue]);

  const { fields, append, replace } = useFieldArray({
    control: form.control,
    name: "menuButtons",
  });
  const teamId = useWatch({
    control: form.control,
    name: "teamId",
  });
  const watchedMenuButtons = useWatch({
    control: form.control,
    name: "menuButtons",
  });
  const formValues = useWatch({
    control: form.control,
  });
  const menuId = editingItem?.id ?? editingItem?.menu?.id;

  const { isPending, mutate } = useUpdateMenuMutation(
    menuId,
    () => {},
    () => {},
  );

  const { data: surveys = [], isPending: surveyIsPending } = useSurveysByTeam(
    teamId,
    !!teamId,
  );

  if (surveyIsPending) return <RateupLoader />;

  const surveyFormatedData = surveys
    ?.filter((survey) => survey?.type === "web")
    .map((survey) => ({
      value: survey.surveyTeamMapId,
      label: survey.title,
    }));

  const uploadChangedImages = async (values: GeneralSettingsFormValues) => {
    const imageMappings = [
      {
        file: backgroundImage,
        existingKey: formatedItemValue?.backgroundImage,
        field: "backgroundImage",
      },
      {
        file: mobileBackgroundImage,
        existingKey: formatedItemValue?.mobileBackgroundImage,
        field: "mobileBackgroundImage",
      },
      {
        file: logo,
        existingKey: formatedItemValue?.logo,
        field: "logo",
      },
    ] as const;

    const imageArray = imageMappings.flatMap((mapping) =>
      mapping.file ? [mapping.file] : [],
    );

    if (imageArray.length === 0) {
      return [] as PromiseRejectedResult[];
    }

    const deleteImageArray: Array<{ Key: string }> = [];
    for (const mapping of imageMappings) {
      if (mapping.file && mapping.existingKey) {
        deleteImageArray.push({ Key: mapping.existingKey });
      }
    }

    const imageResponse = imageArray.map((data) => uploadFile(data));
    if (deleteImageArray.length > 0) {
      imageResponse.push(
        deleteUploadedFiles({ fileKeyArray: deleteImageArray }),
      );
    }

    const response = await Promise.allSettled(imageResponse);
    const uploadErrors = response.filter(
      (r) => r.status === "rejected",
    ) as PromiseRejectedResult[];

    const successes = response
      .filter(
        (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled",
      )
      .map((r) => r.value);

    if (deleteImageArray.length > 0) {
      successes.pop();
    }

    imageMappings
      .filter((mapping) => Boolean(mapping.file))
      .reverse()
      .forEach((mapping) => {
        values[mapping.field as keyof GeneralSettingsFormValues] =
          successes.pop() as never;
      });

    return uploadErrors;
  };

  const onSubmit = async (values: GeneralSettingsFormValues) => {
    values.hideUnavailableCategory =
      values.hideUnavailableCategory === "true" ? "true" : "false";

    try {
      setUpdatingLoading(true);

      const uploadErrors = await uploadChangedImages(values);

      if (imageToDelete.length > 0) {
        await deleteUploadedFiles({
          fileKeyArray: imageToDelete,
        });
      }

      mutate({
        menuId,
        updatedData: {
          ...values,
          hideUnavailableCategory: values.hideUnavailableCategory === "true",
        },
      });

      for (const imageUploadError of uploadErrors) {
        toast.error(imageUploadError.reason);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : translations("Failed to update menu settings");
      toast.error(errorMessage);
    } finally {
      setUpdatingLoading(false);
      setBackgroundImage(null);
      setMobileBackgroundImage(null);
      setLogo(null);
      setImageToDelete([]);
    }
  };

  const imageSettingsFormAdapter = {
    values: formValues,
    setFieldValue: (field: string, value: unknown) => {
      form.setValue(field as keyof GeneralSettingsFormValues, value as never, {
        shouldDirty: true,
      });
    },
    errors: form.formState.errors,
  };

  return (
    <Card>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          <h2 className="text-lg font-semibold">
            {translations("General settings")}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="menu-name">
                    {translations("Menu Name")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="menu-name"
                    aria-invalid={fieldState.invalid}
                    placeholder={translations("Menu 1")}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="teamId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="menu-team">
                    {translations("Team")}
                  </FieldLabel>
                  <TeamSelector
                    value={field.value || ""}
                    onChange={(value) => {
                      form.setValue("surveyTeamMapId", "");
                      field.onChange(value);
                    }}
                    allowDeselect={false}
                    disabled={isPending}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="displayName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="display-name">
                    {translations("Display Name")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="display-name"
                    aria-invalid={fieldState.invalid}
                    placeholder={translations("Hotel Name")}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="currency"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="currency-select">
                    {translations("Currency")}
                  </FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="currency-select"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue
                        placeholder={translations("Select currency")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyLabel.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="surveyTeamMapId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="survey-select">
                    {translations(
                      "Choose a survey to display in the menu page",
                    )}
                  </FieldLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    disabled={surveyFormatedData.length === 0}
                  >
                    <SelectTrigger
                      id="survey-select"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue
                        placeholder={
                          surveyFormatedData.length === 0
                            ? translations("There is no published survay")
                            : translations("Select survey")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {surveyFormatedData.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="locationText"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="location-label">
                    {translations("Location Label")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="location-label"
                    aria-invalid={fieldState.invalid}
                    placeholder={translations("Kannur Rd, near CH Over bridge")}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="hideUnavailableCategory"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="hide-unavailable-category">
                    {translations(
                      "Disable category outside its scheduled time",
                    )}
                  </FieldLabel>
                  <Select
                    value={field.value ?? "false"}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="hide-unavailable-category"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Disable</SelectItem>
                      <SelectItem value="true">Hide</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="locationUrl"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="location-url">
                    {translations("Location URL")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="location-url"
                    type="url"
                    aria-invalid={fieldState.invalid}
                    placeholder="https://goo.gl/maps/xyz1234"
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
          </div>
          <ImageUploadSettings
            form={imageSettingsFormAdapter}
            backgroundImage={backgroundImage}
            setBackgroundImage={setBackgroundImage}
            mobileBackgroundImage={mobileBackgroundImage}
            setMobileBackgroundImage={setMobileBackgroundImage}
            logo={logo}
            setLogo={setLogo}
            setImageToDelete={setImageToDelete}
          />

          <div className="mt-2 flex flex-col gap-4">
            {fields.map((fieldItem, i) => {
              const buttonType = watchedMenuButtons?.[i]?.name;

              return (
                <div
                  className="grid grid-cols-1 gap-3 md:grid-cols-2"
                  key={fieldItem.id}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <Controller
                      name={`menuButtons.${i}.name`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field
                          data-invalid={fieldState.invalid}
                          className="flex-1"
                        >
                          <FieldLabel htmlFor={`menu-button-type-${i}`}>
                            {translations("Menu Button Type")} {i + 1}
                          </FieldLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              id={`menu-button-type-${i}`}
                              className="w-full capitalize"
                              aria-invalid={fieldState.invalid}
                            >
                              <SelectValue
                                placeholder={translations("select button type")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.values(MenuButtons).map((option) => (
                                <SelectItem
                                  key={option}
                                  value={option}
                                  className="capitalize"
                                >
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid ? (
                            <FieldError errors={[fieldState.error]} />
                          ) : null}
                        </Field>
                      )}
                    />

                    {isPhoneButtonType(buttonType) ? null : (
                      <Controller
                        name={`menuButtons.${i}.name`}
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field
                            data-invalid={fieldState.invalid}
                            className="flex-1"
                          >
                            <FieldLabel htmlFor={`menu-button-name-${i}`}>
                              {translations("Menu Button Name")} {i + 1}
                            </FieldLabel>
                            <Input
                              {...field}
                              id={`menu-button-name-${i}`}
                              aria-invalid={fieldState.invalid}
                              placeholder={translations("other")}
                            />
                            {fieldState.invalid ? (
                              <FieldError errors={[fieldState.error]} />
                            ) : null}
                          </Field>
                        )}
                      />
                    )}
                  </div>

                  {isPhoneButtonType(buttonType) ? (
                    <Controller
                      name={`menuButtons.${i}.link`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={`menu-button-value-${i}`}>
                            {translations("Menu Button Value")} {i + 1}
                          </FieldLabel>
                          <PhoneInput
                            id={`menu-button-value-${i}`}
                            defaultCountry="IN"
                            international
                            countryCallingCodeEditable={false}
                            placeholder={translations("Enter phone number")}
                            className="w-full"
                            aria-invalid={fieldState.invalid}
                            value={field.value}
                            onChange={(value) => field.onChange(value ?? "")}
                          />
                          {fieldState.invalid ? (
                            <FieldError errors={[fieldState.error]} />
                          ) : null}
                        </Field>
                      )}
                    />
                  ) : (
                    <Controller
                      name={`menuButtons.${i}.link`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={`menu-button-link-${i}`}>
                            {translations("Menu Button Value")} {i + 1}
                          </FieldLabel>
                          <Input
                            {...field}
                            id={`menu-button-link-${i}`}
                            aria-invalid={fieldState.invalid}
                            placeholder={i === 0 ? "+919876543210" : "link"}
                          />
                          {fieldState.invalid ? (
                            <FieldError errors={[fieldState.error]} />
                          ) : null}
                        </Field>
                      )}
                    />
                  )}
                </div>
              );
            })}

            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">
                {translations("Menu Buttons")}
              </p>
              <div className="flex items-center gap-2">
                {fields.length < 3 ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    onClick={() =>
                      append(
                        fields.length === 0
                          ? { name: MenuButtons.CONTACT, link: "" }
                          : { name: MenuButtons.OTHER, link: "" },
                      )
                    }
                  >
                    <IconPlus size={16} />
                  </Button>
                ) : null}
                {fields.length >= 1 ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    onClick={() => {
                      replace(fields.slice(0, -1));
                    }}
                  >
                    <IconMinus size={16} />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-2 flex justify-center">
            <Button
              type="submit"
              disabled={isPending || updatingLoading}
              className="min-w-36"
            >
              {isPending || updatingLoading ? (
                <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : null}
              {translations("Save Changes")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default GeneralSettings;
