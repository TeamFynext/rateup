import { X } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { ActionCard } from "@/components/common/action-card.tsx";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { StarRating } from "@/components/ui/star-rating.tsx";
import type { Testimonial } from "@/types/global";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

interface TestimonialCardInterface {
  readonly testimonial: Omit<Testimonial, "teamId" | "survey">;
  readonly currentStyle?;
}

function TestimonialCard({ testimonial, currentStyle = null }: Readonly<TestimonialCardInterface>) {
  const [opened, setOpened] = useState(false);
  const { t: translations } = useTranslation();

  const isProfileRemoved = currentStyle?.profileBlock.profilePic.isRemoved;
  const testimonialText = testimonial?.testimonial.testimonial;
  const shouldShowReadMore = !opened && testimonialText && testimonialText.length >= 80;

  const handleOpenModal = useCallback(() => {
    setOpened(true);
  }, []);

  const profileSection = (
    <div className="flex items-center gap-3">
      <Avatar size="lg">
        {!isProfileRemoved && testimonial?.testimonial.photo && (
          <AvatarImage src={getFileUrlFromKey(testimonial?.testimonial.photo)} />
        )}
        <AvatarFallback>{testimonial?.testimonial.name?.charAt(0) ?? "T"}</AvatarFallback>
      </Avatar>
      <div className="overflow-hidden">
        <div
          className="font-semibold text-sm truncate"
          style={currentStyle?.profileBlock.profileName}
        >
          {testimonial?.testimonial.name}
        </div>
        <div
          className="text-xs text-muted-foreground truncate"
          style={currentStyle?.profileBlock.profilePos}
        >
          {testimonial?.testimonial.jobTitle}
        </div>
      </div>
    </div>
  );

  const contentSection = (
    <div className="space-y-3">
      <div className="text-sm line-clamp-3 leading-relaxed" style={currentStyle?.descBlock.desc}>
        {testimonialText}
      </div>
      {shouldShowReadMore && (
        <button
          onClick={handleOpenModal}
          className="text-sm text-primary hover:underline cursor-pointer"
        >
          {translations("Read more")}
        </button>
      )}
    </div>
  );

  return (
    <>
      <ActionCard
        title={testimonial?.testimonial.name}
        content={contentSection}
        createdAt={!currentStyle?.date.isRemoved ? testimonial?.createdAt : undefined}
        onClick={handleOpenModal}
        footer={
          !currentStyle?.ratingBlock.isRemoved &&
          testimonial?.testimonial.rating != null && (
            <div className="flex items-center gap-2">
              <StarRating value={testimonial?.testimonial.rating} size="xs" />
            </div>
          )
        }
      />

      <Dialog open={opened} onOpenChange={setOpened}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="flex items-center justify-between">
            <DialogTitle>{testimonial?.testimonial.name}</DialogTitle>
            <button
              onClick={() => setOpened(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </DialogHeader>

          <div className="space-y-4">
            {profileSection}

            <div className="text-sm leading-relaxed" style={currentStyle?.descBlock.desc}>
              {testimonialText}
            </div>

            {!currentStyle?.ratingBlock.isRemoved && testimonial?.testimonial.rating != null && (
              <div className="flex items-center gap-2">
                <StarRating value={testimonial?.testimonial.rating} size="lg" />
              </div>
            )}

            {!currentStyle?.date.isRemoved && (
              <div className="text-xs text-muted-foreground" style={currentStyle?.date}>
                {new Date(testimonial?.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TestimonialCard;
