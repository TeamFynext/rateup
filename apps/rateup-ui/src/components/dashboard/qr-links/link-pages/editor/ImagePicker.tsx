import { IconPhoto, IconTrash } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { SelectedImage } from "@/components/LocalOrUnsplashImagePicker/index.tsx";
import ImageCropModal from "@/components/Modal/ModalManagerModals/ImageCropModal/index.tsx";
import ImageSourceSelectorModal from "@/components/Modal/ModalManagerModals/ImageSourceSelectorModal/index.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { cn } from "@/lib/utils.ts";

import type { PickedImage } from "../theme.ts";

interface ImagePickerProps {
  label: string;
  value: string | null;
  onChange: (image: PickedImage) => void;
  /** Backgrounds offer Unsplash too, cropped to the screen; a logo is an upload cropped 4:3. */
  shape: "desktop" | "mobile" | "logo";
}

export function ImagePicker({ label, value, onChange, shape }: Readonly<ImagePickerProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [cropping, setCropping] = useState<{ url: string; name: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const pick = (image: SelectedImage) => {
    setOpen(false);
    onChange(image ? { url: image.url, file: image.file } : null);
  };

  const choose = () => {
    if (shape !== "logo") {
      setOpen(true);
      return;
    }
    fileInput.current?.click();
  };

  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted bg-cover bg-center ring-1 ring-foreground/10",
          shape === "desktop" ? "h-10 w-16" : shape === "mobile" ? "h-14 w-8" : "size-10",
        )}
        style={value ? { backgroundImage: `url(${value})` } : undefined}
        aria-hidden="true"
      >
        {!value && <IconPhoto className="size-4 text-muted-foreground" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{value ? t("Set") : t("None")}</span>
      </div>
      <Button variant="outline" size="sm" onClick={choose}>
        {value ? t("Change") : t("Choose")}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={!value}
        aria-label={t("Remove {label}", { label })}
        onClick={() => onChange(null)}
      >
        <IconTrash />
      </Button>

      {shape === "logo" ? (
        <>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) setCropping({ url: URL.createObjectURL(file), name: file.name });
            }}
          />
          <Dialog open={!!cropping} onOpenChange={(next) => !next && setCropping(null)}>
            <DialogContent className="flex max-h-[90vh] flex-col gap-5 overflow-auto">
              <DialogHeader>
                <DialogTitle>{t("Crop your logo")}</DialogTitle>
              </DialogHeader>
              {cropping && (
                <ImageCropModal
                  context={{ closeModal: () => setCropping(null) }}
                  id="linkPageLogoCrop"
                  innerProps={{
                    imageUrl: cropping.url,
                    imageName: cropping.name,
                    aspectRatio: 4 / 3,
                    onSaveClick: pick,
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-auto sm:max-w-fit">
            <DialogHeader>
              <DialogTitle>{label}</DialogTitle>
            </DialogHeader>
            <ImageSourceSelectorModal
              context={{ closeModal: () => setOpen(false) }}
              id="linkPageImageSource"
              innerProps={{ onImageSelected: pick, forDevice: shape }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
