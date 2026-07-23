import { IconChevronLeft, IconCopy, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";

import NothingFound from "../NothingFound/NothingFound.tsx";
import TestimonialCard from "./TestimonialCard.tsx";

const TestimonialShare = ({ selectedTestimonials, currentStyle }) => {
  const filteredTestimonials = selectedTestimonials;
  const { t: translations } = useTranslation();
  if (filteredTestimonials?.length <= 0)
    return (
      <div className="flex items-center justify-center mt-37.5">
        <NothingFound text={translations("No testimonials found")} />
      </div>
    );

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 p-3">
          {filteredTestimonials?.map((testimonial, _index) => (
            <TestimonialCard
              testimonial={testimonial}
              currentStyle={currentStyle}
              key={testimonial?.id}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

export const TestimonialShareModal = ({ opened, onClose, collectionId }) => {
  const shareUrl = `${import.meta.env.VITE_FRONTEND_URL}/public/testimonial/${collectionId}`;
  const iframe = `<iframe src="${shareUrl}" width="100%"></iframe>`;

  const [isPreview, setIsPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t: translations } = useTranslation();

  const handleCopy = () => {
    navigator.clipboard.writeText(iframe);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      open={opened}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-250 p-0" showCloseButton={false}>
        <DialogTitle className="sr-only">{translations("Share Your Testimonials")}</DialogTitle>
        {!isPreview ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-0 rounded-[10px] p-8 text-white bg-primary">
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" className="text-white" onClick={onClose}>
                  <IconX size={"1.5rem"} />
                </Button>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="flex flex-col gap-0">
                  <h2 className="text-3xl font-normal">
                    {translations("Share Your Testimonials")}
                  </h2>
                  <h5 className="text-base font-normal">
                    {translations(
                      "Follow the instruction to share your testimonials on your website",
                    )}
                  </h5>
                </div>
                <img src={`../../images/Party Svg Icon.svg`} className="size-15" alt="" />
              </div>
            </div>
            <div className="flex flex-col gap-4 px-25 py-8">
              <div className="flex flex-col gap-4">
                <h5 className="text-base font-medium">Add this widget to your website</h5>
                <ScrollArea className="w-full">
                  <div className="bg-black py-8 text-white">
                    <p className="pl-4 text-sm">{iframe}</p>
                  </div>
                </ScrollArea>
                <Button variant="outline" className="w-fit" onClick={handleCopy}>
                  <span>{copied ? translations("Copied code") : translations("Copy code")}</span>
                  <IconCopy data-icon="inline-end" />
                </Button>
              </div>
              <p className="font-normal" style={{ color: "#494949" }}>
                {translations(
                  "Place this code in the desired section of your website to display the embed.",
                )}
              </p>
              <Button className="w-fit" onClick={() => setIsPreview(true)}>
                {translations("Preview")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Button
              variant="ghost"
              className="w-fit text-primary"
              onClick={() => setIsPreview(false)}
            >
              <IconChevronLeft data-icon="inline-start" />
              <span>{translations("Back")}</span>
            </Button>
            <div className="flex flex-col gap-3 px-3">
              <div>
                <iframe
                  src={shareUrl}
                  width={"100%"}
                  height={400}
                  style={{ border: "none" }}
                ></iframe>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default TestimonialShare;
