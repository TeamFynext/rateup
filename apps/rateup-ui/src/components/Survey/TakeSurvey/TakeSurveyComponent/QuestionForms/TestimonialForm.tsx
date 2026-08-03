import { IconStar } from "@tabler/icons-react";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { QuestionFormFeatures } from "@/components/Survey/Question/QuestionExtraProps/questionForm.ts";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { cn } from "@/lib/utils.ts";
import { fallbackImage } from "@/utils/constants.ts";
import { dataURItoBlob, getFileUrlFromKey, uploadFile } from "@/utils/file-upload/upload.ts";
import { asAnswer } from "@/utils/response.ts";

import WebcamCapture from "../../../../input/WebCamCapture.tsx";
import { ImageCropModal } from "../../../../Modal/ImageCropModal.tsx";
import { handleInputScrollIntoView } from "../util.tsx";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";

interface TestimonialProps {
  /** Per-language question labels and toggles for the testimonial fields. */
  features?: Record<string, QuestionFormFeatures>;
  isPreview?: boolean;
}

const unstyledInputClassName =
  "border-none bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0";

export function TestimonialForm({ features, isPreview }: TestimonialProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [opened, setOpened] = useState(false);
  const [capturedImg, setCapturedImg] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [openedCropDialog, setOpenedCropDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const open = () => setOpened(true);
  const close = () => setOpened(false);
  const closeCropDialog = () => setOpenedCropDialog(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateResponse({ ...asAnswer(response), name: e.currentTarget.value });
  };
  const { t: translations } = useTranslation();
  const handleJobTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateResponse({ ...asAnswer(response), jobTitle: e.currentTarget.value });
  };

  const handleTestimonialChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateResponse({ ...asAnswer(response), testimonial: e.currentTarget.value });
  };

  useEffect(() => {
    if (capturedImg) {
      const blob = dataURItoBlob(capturedImg);
      const capturedImageFile = new File([blob], "captured-image.jpg", {
        type: blob.type,
        lastModified: new Date().getTime(),
      });
      setSelectedImage(capturedImageFile);
      setOpenedCropDialog(true);
    }
  }, [capturedImg]);

  useEffect(() => {
    if (!file) return;
    setIsUploading(true);
    uploadFile(file)
      .then((key) => {
        updateResponse({ ...asAnswer(response), photo: key });
        setIsUploading(false);
      })
      .catch((_err) => {
        toast.error(translations("Error uploading icon. Please try again."));
        setIsUploading(false);
      });
  }, [file]);
  const handleCropImageSave = async (cropedImage: string | File) => {
    if (!cropedImage) return;
    // Opened for local uploads only, so the crop always yields a File — the
    // string form is the Unsplash path, which this question does not offer.
    setFile(cropedImage as File);
  };

  const onChangePicture = (event: File) => {
    if (!event) return;
    setSelectedImage(event);
    setOpenedCropDialog(true);
  };

  return (
    <div className="flex flex-col gap-4" style={{ minWidth: "min(100%,411px)" }}>
      {selectedImage && (
        <ImageCropModal
          opened={openedCropDialog}
          onclose={closeCropDialog}
          imageName={selectedImage?.name}
          handleCropImageSave={handleCropImageSave}
          image={URL.createObjectURL(selectedImage)}
          aspect={4 / 3}
        />
      )}
      <div className="flex flex-col gap-2.5">
        <p className="text-sm text-primary">{features?.[selectedLanguage]?.nameQn}</p>
        <FormPaperLayout>
          <Input
            placeholder={translations("Enter name")}
            value={asAnswer(response).name}
            onChange={handleNameChange}
            style={{ maxWidth: "400px" }}
            className={cn(unstyledInputClassName, "text-base")}
            onClick={handleInputScrollIntoView}
          />
        </FormPaperLayout>
      </div>
      {features?.[selectedLanguage]?.jobTitle && (
        <div className="flex flex-col gap-2.5">
          <p className="text-sm text-primary">{features?.[selectedLanguage]?.jobTitleQn}</p>
          <FormPaperLayout>
            <Input
              placeholder={translations("Enter job title")}
              value={String(asAnswer(response).jobTitle ?? "")}
              onChange={handleJobTitleChange}
              style={{ maxWidth: "400px" }}
              className={cn(unstyledInputClassName, "text-base")}
              onClick={handleInputScrollIntoView}
            />
          </FormPaperLayout>
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        <p className="text-sm text-primary">{features?.[selectedLanguage]?.testimonialQn}</p>
        <FormPaperLayout>
          <Textarea
            placeholder={translations("Enter testimonial")}
            value={String(asAnswer(response).testimonial ?? "")}
            onChange={handleTestimonialChange}
            style={{ maxWidth: "400px" }}
            className={cn(unstyledInputClassName, "text-base min-h-0")}
            onClick={handleInputScrollIntoView}
          />
        </FormPaperLayout>
      </div>
      {features?.[selectedLanguage]?.rating && (
        <div className="flex flex-col gap-2.5">
          <p className="text-sm text-primary">
            {features?.[selectedLanguage]?.ratingQn || "Give rating"}
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => updateResponse({ ...asAnswer(response), rating: star })}
                className="p-0.5"
              >
                <IconStar
                  size={32}
                  className={
                    Number(asAnswer(response).rating ?? 0) >= star
                      ? "fill-primary text-primary"
                      : "text-gray-300"
                  }
                />
              </button>
            ))}
          </div>
        </div>
      )}
      {features?.[selectedLanguage]?.photo && (
        <div className="flex flex-col gap-2.5">
          <p className="text-sm text-primary">
            {features?.[selectedLanguage]?.photoQn || translations("Upload Photo")}
          </p>
          <div className="flex items-center gap-4">
            <div className="relative rounded-[10px] h-[150px] w-[200px] ">
              <Dialog
                open={opened}
                onOpenChange={(nextOpen) => {
                  if (!nextOpen) close();
                }}
              >
                <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-125">
                  <DialogHeader>
                    <DialogTitle className="text-center text-3xl font-semibold">
                      {translations("Camera")}
                    </DialogTitle>
                  </DialogHeader>
                  <WebcamCapture
                    height={"100%"}
                    width={"100%"}
                    setCapturedImg={setCapturedImg}
                    close={close}
                  />
                </DialogContent>
              </Dialog>
              {isUploading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[10px] bg-white/60 backdrop-blur-sm">
                  <Spinner />
                </div>
              )}
              <img
                src={getFileUrlFromKey(String(asAnswer(response).photo ?? ""))}
                alt="Your uploaded image"
                className="size-full rounded-[10px] object-cover"
                style={{ height: fallbackImage ? 148 : 200 }}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackImage;
                }}
              />
            </div>
            <div className="flex flex-col gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                disabled={isPreview}
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) onChangePicture(selected);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                disabled={isPreview}
                onClick={() => fileInputRef.current?.click()}
              >
                {translations("Browse from device")}
              </Button>
              <Button type="button" onClick={() => open()} disabled={isPreview}>
                {translations("Capture Photo")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
