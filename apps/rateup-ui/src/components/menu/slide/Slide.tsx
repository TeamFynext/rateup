"use client";

import { useEffect, useRef, useState } from "react";

import { IconMenu2, IconTrash, IconUpload } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { MenuItemPriceType } from "@/types/enums.ts";
import ConfirmationModal from "@/components/Modal/ConfirmationModal.tsx";
import { ImageCropModal } from "@/components/Modal/ImageCropModal.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { MAX_FILE_SIZE_IN_BYTE, MAX_FILE_SIZE_IN_MB } from "@/utils/constants.ts";
import {
  deleteUploadedFiles,
  getFileUrlFromKey,
  uploadFile,
} from "@/utils/file-upload/upload.ts";

import { FoodLabelSelector } from "../combobox/foodLabelSelector.tsx";
import { PriceSection } from "../item/PriceSection.tsx";
import { SkeletonMenuCard } from "../skeleton/SkeletonMenuCard.tsx";

type SlideFormValues = {
  id: string;
  name: string;
  menuId: string;
  image?: string;
  videoUrl: string;
  description: string;
  price: {
    price?: string;
    variants?: Array<{
      name: string;
      price: string;
    }>;
    type: MenuItemPriceType;
  };
  foodLabels: string[];
};

const getByPath = (object: any, path: string) => {
  return path
    .split(".")
    .reduce((acc: any, key: string) => (acc == null ? acc : acc[key]), object);
};

const toFormValues = (menuId: string, formValues?: any): SlideFormValues => {
  if (!formValues) {
    return {
      id: "",
      name: "",
      menuId,
      image: "",
      videoUrl: "",
      description: "",
      price: {
        price: "",
        variants: [
          {
            name: "",
            price: "",
          },
        ],
        type: MenuItemPriceType.FIXED,
      },
      foodLabels: [],
    };
  }

  return {
    id: formValues.id ?? "",
    name: formValues.name ?? "",
    menuId,
    image: formValues.image ?? "",
    videoUrl: formValues.videoUrl ?? "",
    description: formValues.description ?? "",
    price: {
      type: formValues.price?.type ?? MenuItemPriceType.FIXED,
      price: String(formValues.price?.price ?? ""),
      variants: formValues.price?.variants?.map((variant: any) => ({
        name: String(variant?.name ?? ""),
        price: String(variant?.price ?? ""),
      })) ?? [
        {
          name: "",
          price: "",
        },
      ],
    },
    foodLabels: formValues.foodLabels ?? [],
  };
};

export const Slide = ({
  menuId,
  formValues,
  onCloseAction,
  createMenuBannerMutation,
  updateMenuBannerMutation,
  deleteMenuBannerMutation,
  popFromDataAction,
  currency,
}: {
  readonly menuId: string;
  readonly formValues?: any;
  readonly onCloseAction: () => void;
  readonly createMenuBannerMutation: any;
  readonly updateMenuBannerMutation: any;
  readonly deleteMenuBannerMutation: any;
  readonly popFromDataAction: () => void;
  readonly currency?: string;
}) => {
  const [imageToUpload, setImageToUpload] = useState<File | null>(null);
  const [selectedTab, setSelectedTab] = useState("Web");
  const [creating, setCreating] = useState(false);
  const [imageUploadError, setImageUploadError] = useState(false);
  const [dialogOpened, setDialogOpened] = useState(false);
  const [selectedImage, setSelectedImage] = useState({
    url: "",
    name: "",
  });
  const [openedCropDialog, setOpenedCropDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t: translations } = useTranslation();
  const isMobile = selectedTab === "Mobile";

  const form = useForm<SlideFormValues>({
    defaultValues: toFormValues(menuId, formValues),
  });

  const values = form.watch();

  useEffect(() => {
    form.reset(toFormValues(menuId, formValues));
  }, [formValues, form, menuId]);

  const setFieldValue = (path: string, value: any) => {
    form.setValue(path as any, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const formAdapter = {
    values,
    getInputProps: (path: string) => ({
      value: getByPath(values, path),
    }),
    setFieldValue,
    insertListItem: (path: string, value: any) => {
      const current = (getByPath(values, path) ?? []) as any[];
      setFieldValue(path, [...current, value]);
    },
  };

  const uploadBannerImage = async () => {
    if (!imageToUpload) return "";
    const fileKey = await uploadFile(imageToUpload);
    return typeof fileKey === "string" ? fileKey : "";
  };

  const normalizePayload = (data: SlideFormValues) => {
    const payload: any = {
      ...data,
      price: {
        ...data.price,
      },
    };

    if (payload?.price?.type === MenuItemPriceType.FIXED) {
      delete payload?.price?.variants;
    } else {
      delete payload?.price?.price;
    }

    return payload;
  };

  const applyUploadedImage = async (payload: any, uploadedKey: string) => {
    if (!imageToUpload) return;

    const isReplacingExisting =
      formValues?.image && formValues?.image !== payload?.image;
    if (isReplacingExisting) {
      await deleteUploadedFiles({
        fileKeyArray: [{ Key: formValues?.image }],
      });
    }
    payload.image = uploadedKey;
  };

  const submitCreate = (payload: any, uploadedKey: string) => {
    if (imageToUpload) {
      payload.image = uploadedKey;
    }
    createMenuBannerMutation.mutate(payload);
  };

  const submitUpdate = async (payload: any, uploadedKey: string) => {
    await applyUploadedImage(payload, uploadedKey);
    updateMenuBannerMutation.mutate({ id: payload.id, data: payload });
  };

  const handleSubmit = async (data: SlideFormValues) => {
    if (!imageToUpload && !data?.image) {
      setImageUploadError(true);
      return;
    }

    try {
      setCreating(true);
      const uploadedKey = await uploadBannerImage();
      const payload = normalizePayload(data);

      if (payload?.id) {
        await submitUpdate(payload, uploadedKey);
      } else {
        submitCreate(payload, uploadedKey);
      }

      setImageToUpload(null);
    } catch {
      toast.error(translations("Something went wrong"));
    } finally {
      setCreating(false);
      setImageToUpload(null);
    }
  };

  const onChangePicture = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_IN_BYTE) {
      toast.error(
        `${translations("Max file size is")} ${MAX_FILE_SIZE_IN_MB} MB`,
      );
      return;
    }
    setSelectedImage({
      url: URL.createObjectURL(file),
      name: file.name,
    });
    setOpenedCropDialog(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteMutation = () => {
    if (formValues?.id) {
      toast.loading(
        translations("Hold on, Your Menu Banner Is Getting Deleted."),
        {
          id: "menu-banner-delete",
        },
      );
      deleteMenuBannerMutation.mutate(formValues?.id);
      return;
    }

    setDialogOpened(false);
    popFromDataAction();
  };

  const handleCropImageSave = (cropedImage: File | string) => {
    if (typeof cropedImage === "string") {
      setFieldValue("image", cropedImage);
      setImageToUpload(null);
      setImageUploadError(false);
      return;
    }

    setFieldValue("image", URL.createObjectURL(cropedImage));
    setImageToUpload(cropedImage);
    setImageUploadError(false);
  };

  const isPending =
    createMenuBannerMutation.isPending ||
    updateMenuBannerMutation.isPending ||
    creating;

  const navSkeletonKeys = ["nav-1", "nav-2", "nav-3"];
  const cardSkeletonKeys = isMobile
    ? ["m-1", "m-2", "m-3"]
    : ["w-1", "w-2", "w-3", "w-4", "w-5", "w-6"];

  let imageUrl = "";
  if (values?.image) {
    if (values.image.startsWith("blob")) {
      imageUrl = values.image;
    } else {
      imageUrl = getFileUrlFromKey(values.image);
    }
  }

  return (
    <>
      <ImageCropModal
        opened={openedCropDialog}
        onclose={() => setOpenedCropDialog(false)}
        imageName={selectedImage.name}
        handleCropImageSave={handleCropImageSave}
        image={selectedImage.url}
        aspect={16 / 9}
      />

      <form onSubmit={form.handleSubmit(handleSubmit)} className="relative">
        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80">
            <Spinner />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Field data-invalid={!!form.formState.errors.name}>
                  <FieldLabel htmlFor="banner-name">
                    {translations("Name")}
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="banner-name"
                      placeholder={translations("Name")}
                      aria-invalid={!!form.formState.errors.name}
                      {...form.register("name")}
                    />
                    <FieldError errors={[form.formState.errors.name]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="banner-video-url">
                    {translations("Video Url")}
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="banner-video-url"
                      placeholder={translations("Video Url")}
                      {...form.register("videoUrl")}
                    />
                  </FieldContent>
                </Field>
              </div>

              <Field data-invalid={!!form.formState.errors.description}>
                <FieldLabel htmlFor="banner-description">
                  {translations("Description")}
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    id="banner-description"
                    placeholder={translations("Description")}
                    rows={5}
                    aria-invalid={!!form.formState.errors.description}
                    {...form.register("description")}
                  />
                  <FieldError errors={[form.formState.errors.description]} />
                </FieldContent>
              </Field>

              <PriceSection form={formAdapter} currency={currency ?? "0"} />
              <FoodLabelSelector form={formAdapter} />
            </FieldGroup>
          </div>

          <div className="flex flex-col items-center">
            <div className="mb-2 flex w-full items-center justify-between">
              <div />
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList>
                  <TabsTrigger value="Web">Web</TabsTrigger>
                  <TabsTrigger value="Mobile">Mobile</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setDialogOpened(true)}
                aria-label={translations("Delete")}
              >
                <IconTrash />
              </Button>
            </div>

            <div
              className={`rounded-lg border bg-card ${isMobile ? "w-46.25" : "w-full"}`}
            >
              {imageUploadError && (
                <p className="px-4 pt-2 text-sm text-destructive">
                  *Image is Required
                </p>
              )}

              <div
                className="flex h-27.5 w-full items-center justify-center rounded-t-md bg-muted"
                style={{
                  backgroundImage: imageUrl ? `url(${imageUrl})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <Button
                    type="button"
                    variant={values?.image ? "secondary" : "outline"}
                    className="gap-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <IconUpload data-icon="inline-start" />
                    {values?.image
                      ? translations("Change Banner Image")
                      : translations("Upload Banner Image")}
                  </Button>

                  {!values?.image && (
                    <p className="text-xs text-muted-foreground">
                      {translations("Width : 1980 X Height: 312")}
                    </p>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={(event) =>
                    onChangePicture(event.target.files?.[0] ?? null)
                  }
                />
              </div>

              <div className="p-4">
                <div className="mb-3 flex items-center gap-1">
                  <IconMenu2 stroke={1} height={12} width={14} />
                  {navSkeletonKeys.map((key) => (
                    <Skeleton
                      key={key}
                      className="h-3.25 rounded-sm bg-muted"
                      style={{
                        flex: isMobile ? 1 : undefined,
                        width: isMobile ? undefined : 50,
                      }}
                    />
                  ))}
                </div>

                <Skeleton className="mb-3 h-2.25 w-14.25 rounded-sm bg-muted" />

                <div
                  className={`grid ${isMobile ? "grid-cols-1 gap-1.25" : "grid-cols-3 gap-4"}`}
                >
                  {cardSkeletonKeys.map((key) => (
                    <div key={key}>
                      <SkeletonMenuCard isMobile={isMobile} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCloseAction}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {translations("save")}
          </Button>
        </div>

        <ConfirmationModal
          forDeleteFunctionality
          opened={dialogOpened}
          onClose={() => setDialogOpened(false)}
          headerLabel={translations("Are you sure to delete this Menu Banner?")}
          headerTitle={translations("Delete Menu Banner?")}
          confirmLabel={translations("Delete")}
          onConfirm={() => {
            handleDeleteMutation();
            setDialogOpened(false);
          }}
        />
      </form>
    </>
  );
};
