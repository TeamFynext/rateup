"use client";

import { useEffect, useRef, useState } from "react";

import {
  IconBookmark,
  IconChevronLeft,
  IconChevronRight,
  IconInfoCircle,
  IconPlus,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { MenuItemPriceType } from "@/types/enums.ts";
import {
  useCreateMenuBannerMutation,
  useDeleteMenuBannerMutation,
  useMenuBannerQuery,
  useUpdateMenuBannerMutation,
} from "@/backend/menu/Banner/banner.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import RateupLoader from "../Loaders/RateupLoader.tsx";
import { Slide } from "../menu/slide/Slide.tsx";

type BannerAddAndViewModalProps = {
  opened: boolean;
  onCloseAction: () => void;
  menuId: string;
  currency: string;
};

const BannerAddAndViewModal = ({
  opened,
  onCloseAction,
  menuId,
  currency,
}: BannerAddAndViewModalProps) => {
  const carouselApiRef = useRef<any>(null);
  const [renderTick, setRenderTick] = useState(0);
  const createMenuBannerMutation = useCreateMenuBannerMutation(menuId);
  const updateMenuBannerMutation = useUpdateMenuBannerMutation(menuId);
  const { t: translations } = useTranslation();

  const { data, isPending } = useMenuBannerQuery(menuId);

  const deleteMenuBannerMutation = useDeleteMenuBannerMutation(menuId, () => {
    carouselApiRef.current?.scrollPrev();
    setRenderTick((prev) => Math.max(prev - 1, 0));
  });

  useEffect(() => {
    if (data && carouselApiRef.current) {
      carouselApiRef.current.scrollTo(data.length - 1);
    }
  }, [data, data?.length]);

  if (isPending) return <RateupLoader />;

  const defaultValues: MenuBanner = {
    description: "",
    id: "",
    menuId,
    name: "",
    price: {
      price: "",
      type: MenuItemPriceType.FIXED,
      variants: [
        {
          name: "",
          price: "",
        },
      ],
    },
    createdAt: "",
    videoUrl: "",
  };

  const popFromData = () => {
    if ((data?.length ?? 0) > 0) {
      data?.pop();
      setRenderTick((prev) => Math.max(prev - 1, 0));
    }
  };

  const bannerForm = data?.map((value, index) => (
    <CarouselItem
      key={value.id || `${index}-${renderTick}`}
      className="basis-full"
    >
      <div className="mx-auto max-w-222.5 px-2">
        <Slide
          key={value?.id || `${index}-${renderTick}`}
          menuId={menuId}
          formValues={value}
          onCloseAction={onCloseAction}
          createMenuBannerMutation={createMenuBannerMutation}
          updateMenuBannerMutation={updateMenuBannerMutation}
          deleteMenuBannerMutation={deleteMenuBannerMutation}
          popFromDataAction={popFromData}
          currency={currency}
        />
      </div>
    </CarouselItem>
  ));

  const addBanner = () => {
    if ((data?.length ?? 0) === 4) return;

    if ((data?.length ?? 0) > 0 && !data?.at(-1)?.id) {
      toast.error(
        translations(
          "Save the form you just made, then click Add Banner button to make a new form.",
        ),
      );
      return;
    }

    data?.push(defaultValues);
    setRenderTick((prev) => prev + 1);
  };

  return (
    <Dialog
      open={opened}
      onOpenChange={(nextOpen) => !nextOpen && onCloseAction()}
    >
      <DialogContent className="w-[90vw] sm:max-w-250 max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{translations("Manage Banners")}</DialogTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={translations("Banner info")}
                >
                  <IconInfoCircle />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[90vw] sm:w-[70vw] p-2"
                align="start"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getFileUrlFromKey("/images/menu/banner-demo.gif", false)}
                  alt={translations("banner demo")}
                  className="w-full rounded-md"
                />
              </PopoverContent>
            </Popover>
          </div>
          <DialogDescription>
            {translations(
              "Sliding banners to be shown in top of menu. You can add upto 4 banners.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[clamp(400px,292.864px+17.857vw,550px)]">
          {(data?.length ?? 0) <= 0 ? (
            <div className="-mt-25 flex min-h-105 flex-col items-center justify-center gap-3">
              <div className="relative h-20 w-20">
                <IconBookmark
                  className="absolute left-0 top-0 text-muted-foreground"
                  stroke={1.2}
                  size={77}
                />
                <IconBookmark
                  className="absolute left-6 -top-2.5 text-muted-foreground"
                  stroke={1.2}
                  size={77}
                />
              </div>

              <p className="text-lg text-muted-foreground">
                {translations("No Banners are added")}
              </p>

              <Button type="button" onClick={addBanner}>
                <IconPlus data-icon="inline-end" />
                {translations("Add Banner")}
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-2 flex items-center justify-between">
                <Button
                  type="button"
                  onClick={addBanner}
                  disabled={data?.length === 4}
                >
                  <IconPlus data-icon="inline-end" />
                  {translations("Add Banner")}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => carouselApiRef.current?.scrollPrev()}
                    aria-label={translations("Previous")}
                  >
                    <IconChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => carouselApiRef.current?.scrollNext()}
                    aria-label={translations("Next")}
                  >
                    <IconChevronRight />
                  </Button>
                </div>
              </div>

              <div className="mt-4 rounded-lg border bg-card p-4">
                <Carousel
                  setApi={(api) => {
                    carouselApiRef.current = api;
                  }}
                  className="w-full"
                >
                  <CarouselContent>{bannerForm}</CarouselContent>
                </Carousel>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BannerAddAndViewModal;
