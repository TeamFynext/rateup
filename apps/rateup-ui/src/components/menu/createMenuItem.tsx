import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
} from "@/backend/menu/item/mItem.query";
import { MenuItemPriceType } from "@/types/enums.ts";
import { fallbackImage, MAX_FILE_SIZE_IN_BYTE, MAX_FILE_SIZE_IN_MB } from "@/utils/constants.ts";
import { deleteUploadedFiles, getImageValue, uploadFile } from "@/utils/file-upload/upload.ts";

import { CreditsCard } from "../Card/CreditsCard.tsx";
import { ImageCropModal } from "../Modal/ImageCropModal.tsx";
import { ImageUploadMethodModal } from "../Modal/ImageUploadMethodModal.tsx";
import { UnsplashModal } from "../Modal/UnsplashModal.tsx";
import { Button } from "../ui/button.tsx";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog.tsx";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "../ui/field.tsx";
import { Input } from "../ui/input.tsx";
import { Spinner } from "../ui/spinner.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { FoodLabelSelector } from "./combobox/foodLabelSelector.tsx";
import { PriceSection } from "./item/PriceSection.tsx";

interface CreateMenuItemModalProps {
  readonly opened: boolean;
  readonly close: () => void;
  readonly menuId: string;
  readonly categoryId: string;
  readonly editingItem?: MenuItem;
  readonly currency?: string;
}

type MenuItemFormValues = {
  name: string;
  categoryId: string;
  images: Array<string | File>;
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
  unsplashImage: string[];
};

const defaultValues = (categoryId: string): MenuItemFormValues => ({
  name: "",
  categoryId,
  images: [],
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
  unsplashImage: [],
});

const getValueByPath = (object: any, path: string) => {
  return path.split(".").reduce((acc: any, key: string) => (acc == null ? acc : acc[key]), object);
};

export function CreateMenuItemModal({
  opened,
  close,
  menuId,
  categoryId,
  editingItem,
  currency,
}: CreateMenuItemModalProps) {
  const [imageLoading, setImageLoading] = useState(false);
  const [openedUnsplashDialog, setOpenedUnsplashDialog] = useState(false);
  const [openedCropDialog, setOpenedCropDialog] = useState(false);
  const [openedMethodSelectionDialog, setOpenedMethodSelectionDialog] = useState(false);

  const [deleteImageArray, setDeleteImageArray] = useState<{ Key: string | File | undefined }[]>(
    [],
  );
  const [selectedInputImage, setSelectedInputImage] = useState({
    url: "",
    name: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t: translations } = useTranslation();

  const form = useForm<MenuItemFormValues>({
    defaultValues: editingItem
      ? {
          ...editingItem,
          categoryId,
          videoUrl: editingItem.videoUrl ?? "",
          foodLabels: editingItem.foodLabels ?? [],
          unsplashImage: editingItem.unsplashImage ?? [],
          price: {
            ...editingItem.price,
            price: String(editingItem.price?.price ?? ""),
            variants: editingItem.price?.variants?.map((variant) => ({
              name: String(variant.name ?? ""),
              price: String(variant.price ?? ""),
            })) ?? [
              {
                name: "",
                price: "",
              },
            ],
          },
        }
      : defaultValues(categoryId),
  });

  const values = form.watch();
  const [selectedImage, setSelectedImage] = useState<string | File>(values.images?.[0] ?? "");

  useEffect(() => {
    if (editingItem) {
      form.reset({
        ...editingItem,
        categoryId,
        videoUrl: editingItem.videoUrl ?? "",
        foodLabels: editingItem.foodLabels ?? [],
        unsplashImage: editingItem.unsplashImage ?? [],
        price: {
          ...editingItem.price,
          price: String(editingItem.price?.price ?? ""),
          variants: editingItem.price?.variants?.map((variant) => ({
            name: String(variant.name ?? ""),
            price: String(variant.price ?? ""),
          })) ?? [
            {
              name: "",
              price: "",
            },
          ],
        },
      });
      return;
    }

    form.reset(defaultValues(categoryId));
  }, [editingItem, form, categoryId]);

  useEffect(() => {
    setSelectedImage(values.images?.[0] ?? "");
  }, [values.images]);

  const setFieldValue = (path: string, value: any) => {
    form.setValue(path as any, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const createMenuItemMutation = useCreateMenuItemMutation(categoryId, menuId, () => {
    close();
    form.reset(defaultValues(categoryId));
  });

  const updateMenuItemMutation = useUpdateMenuItemMutation(categoryId, menuId, () => {
    close();
    form.reset(defaultValues(categoryId));
  });

  const buildPayload = (submitValues: MenuItemFormValues) => {
    const payload: any = {
      ...submitValues,
      price: {
        ...submitValues.price,
      },
    };

    if (payload?.price?.type === MenuItemPriceType.FIXED) {
      delete payload?.price?.variants;
    } else {
      delete payload?.price?.price;
    }

    return payload;
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) {
      return {
        errors: [] as PromiseRejectedResult[],
        successes: [] as string[],
      };
    }

    const response = await Promise.allSettled(files.map((file) => uploadFile(file)));
    const errors = response.filter((result) => result.status === "rejected");
    const successes = response
      .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
      .map((result) => result.value);

    return { errors, successes };
  };

  const handleEditSubmit = async (
    editingId: string,
    payload: any,
    imageArray: Array<string | File>,
  ) => {
    const newImages = imageArray.filter((image): image is File => typeof image !== "string");

    let errors: PromiseRejectedResult[] = [];

    if (deleteImageArray?.length > 0) {
      await deleteUploadedFiles({ fileKeyArray: deleteImageArray });
      setDeleteImageArray([]);
    }

    if (newImages.length > 0) {
      const uploadResult = await uploadFiles(newImages);
      errors = uploadResult.errors;
      let index = 0;
      for (let i = 0; i < imageArray.length; i++) {
        if (typeof imageArray[i] !== "string") {
          imageArray[i] = uploadResult.successes[index] ?? "";
          index += 1;
        }
      }
      payload.images = imageArray;
    }

    updateMenuItemMutation.mutate({
      menuItemId: editingId,
      menuItem: payload,
    });

    return errors;
  };

  const handleCreateSubmit = async (payload: any, imageArray: Array<string | File>) => {
    const newImages = imageArray.filter((image): image is File => typeof image !== "string");

    let errors: PromiseRejectedResult[] = [];
    if (newImages.length > 0) {
      const uploadResult = await uploadFiles(newImages);
      errors = uploadResult.errors;
      payload.images = uploadResult.successes;
    }

    createMenuItemMutation.mutate(payload);
    return errors;
  };

  const onSubmit = async (submitValues: MenuItemFormValues) => {
    if (!submitValues.name.trim()) {
      form.setError("name", { message: translations("Cannot be empty") });
      return;
    }

    if (!submitValues.description.trim()) {
      form.setError("description", {
        message: translations("Cannot be empty"),
      });
      return;
    }

    try {
      setImageLoading(true);
      const payload = buildPayload(submitValues);
      const imageArray = [...(payload?.images ?? [])];

      const errors = editingItem
        ? await handleEditSubmit(editingItem.id, payload, imageArray)
        : await handleCreateSubmit(payload, imageArray);

      for (const imageUploadError of errors) {
        toast.error(imageUploadError.reason);
      }
    } catch {
      setImageLoading(false);
    } finally {
      setImageLoading(false);
      form.reset(defaultValues(categoryId));
      close();
    }
  };

  if (!menuId) {
    return null;
  }

  const onChangePicture = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_IN_BYTE) {
      toast.error(`${translations("Max file size is")} ${MAX_FILE_SIZE_IN_MB} MB`);
      return;
    }

    setSelectedInputImage({
      url: URL.createObjectURL(file),
      name: file.name,
    });
    setOpenedCropDialog(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropImageSave = (cropedImage: File | string) => {
    const currentImages = values.images ?? [];
    if (typeof cropedImage === "string") {
      setFieldValue("unsplashImage", [...(values.unsplashImage ?? []), cropedImage]);
    }
    setFieldValue("images", [...currentImages, cropedImage]);
  };

  const handleUnsplashImageSave = (unsplashImage: string, imageName: string) => {
    setSelectedInputImage({
      url: unsplashImage,
      name: imageName,
    });
    setOpenedCropDialog(true);
  };

  const handleUploadMethod = (type: string) => {
    if (type === "unsplash") {
      setOpenedUnsplashDialog(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleDeleteImage = () => {
    if (typeof selectedImage !== "object") {
      setDeleteImageArray((prev) => [
        ...prev,
        {
          Key: values.images?.find((image) => image === selectedImage),
        },
      ]);
    }

    const indexToRemove = (values.images ?? []).indexOf(selectedImage);

    if (indexToRemove == null || indexToRemove < 0) return;

    const nextImages = [...(values.images ?? [])];
    nextImages.splice(indexToRemove, 1);
    setFieldValue("images", nextImages);
  };

  const isPending =
    createMenuItemMutation.isPending || updateMenuItemMutation.isPending || imageLoading;

  const formAdapter = {
    values,
    getInputProps: (path: string) => ({
      value: getValueByPath(values, path),
    }),
    setFieldValue,
    insertListItem: (path: string, value: any) => {
      const current = (getValueByPath(values, path) ?? []) as any[];
      setFieldValue(path, [...current, value]);
    },
  };

  return (
    <Dialog open={opened} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <DialogContent className="sm:max-w-200">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? translations("Edit Item") : translations("Create Item")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="relative">
          <UnsplashModal
            handleUnsplashImageSave={handleUnsplashImageSave}
            opened={openedUnsplashDialog}
            onclose={() => setOpenedUnsplashDialog(false)}
          />
          <ImageUploadMethodModal
            onClose={() => setOpenedMethodSelectionDialog(false)}
            opened={openedMethodSelectionDialog}
            handleUploadMethod={handleUploadMethod}
          />
          <ImageCropModal
            opened={openedCropDialog}
            onclose={() => setOpenedCropDialog(false)}
            imageName={selectedInputImage.name}
            handleCropImageSave={handleCropImageSave}
            image={selectedInputImage.url}
            aspect={3 / 2}
          />

          {isPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80">
              <Spinner />
            </div>
          )}

          <div className="flex flex-col gap-6 lg:flex-row -mx-4 max-h-[50vh] overflow-y-auto px-4">
            <div className="flex-1">
              <div className="mb-3 text-sm font-medium">{translations("Add Images (max 3)")}</div>

              {(values.images?.length ?? 0) > 0 ? (
                <div>
                  <CreditsCard
                    enableCredits={
                      values.unsplashImage?.find((data) => data === selectedImage)?.length > 0
                    }
                    url={selectedImage}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageValue(
                        selectedImage,
                        false,
                        values.unsplashImage?.find((data) => data === selectedImage)?.length > 0,
                      )}
                      alt={translations("menu image")}
                      className="w-full rounded-md object-cover"
                      style={{ aspectRatio: 3 / 2, maxHeight: 200 }}
                    />
                  </CreditsCard>

                  <div className="mt-2 flex justify-center">
                    <Button type="button" variant="destructive" onClick={handleDeleteImage}>
                      <IconTrash data-icon="inline-start" />
                      {translations("Delete")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fallbackImage}
                    alt={translations("menu placeholder")}
                    className="w-full rounded-md object-cover"
                    style={{ aspectRatio: 3 / 2, maxHeight: 200 }}
                  />
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                {(values.images ?? []).map((image: File | string) => (
                  <button
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    key={typeof image === "string" ? image : `${image.name}-${image.lastModified}`}
                    className="rounded-lg"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="h-12.5 w-17.5 cursor-pointer rounded-lg object-cover"
                      src={getImageValue(
                        image,
                        false,
                        values.unsplashImage?.find((data) => data === image)?.length > 0,
                      )}
                      alt={translations("menu thumbnail")}
                    />
                  </button>
                ))}

                {(values.images?.length ?? 0) < 3 && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={(event) => onChangePicture(event.target.files?.[0] ?? null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12.5 w-20"
                      onClick={() => setOpenedMethodSelectionDialog(true)}
                    >
                      <IconPlus />
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-[1.5]">
              <FieldGroup>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Field data-invalid={!!form.formState.errors.name}>
                    <FieldLabel htmlFor="menu-item-name">{translations("Name")}</FieldLabel>
                    <FieldContent>
                      <Input
                        id="menu-item-name"
                        placeholder={translations("Name")}
                        aria-invalid={!!form.formState.errors.name}
                        {...form.register("name")}
                      />
                      <FieldError errors={[form.formState.errors.name]} />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="menu-item-video-url">
                      {translations("Video Url")}
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="menu-item-video-url"
                        placeholder={translations("Video Url")}
                        {...form.register("videoUrl")}
                      />
                    </FieldContent>
                  </Field>
                </div>

                <Field data-invalid={!!form.formState.errors.description}>
                  <FieldLabel htmlFor="menu-item-description">
                    {translations("Description")}
                  </FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="menu-item-description"
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
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={close}>
              {translations("Cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {editingItem ? translations("Save Item") : translations("Create Item")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
