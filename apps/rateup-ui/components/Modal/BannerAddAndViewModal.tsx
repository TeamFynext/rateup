"use client";

import { useEffect, useRef } from "react";

import {
  ActionIcon,
  Group,
  Image,
  Modal,
  Popover,
  ScrollAreaAutosize,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useCounter, useMediaQuery } from "@mantine/hooks";
import {
  IconBookmark,
  IconChevronLeft,
  IconChevronRight,
  IconInfoCircle,
  IconPlus,
} from "@tabler/icons-react";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

import { MenuItemPriceType } from "@/types/enums";
import {
  useCreateMenuBannerMutation,
  useDeleteMenuBannerMutation,
  useMenuBannerQuery,
  useUpdateMenuBannerMutation,
} from "@/backend/menu/Banner/banner.query";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

import { RateupButtonPrimary, RateupIconButton } from "../Button/RateupButtons";
import RateupLoader from "../Loaders/RateupLoader";
import { Slide } from "../menu/slide/Slide";
import PaperLayout from "../styled/Layouts/PaperLayout";

type BannerAddAndViewModalProps = {
  opened: boolean;
  onClose: () => void;
  menuId: string;
  currency: string;
};

export const BannerAddAndViewModal = ({
  opened,
  onClose,
  menuId,
  currency,
}: BannerAddAndViewModalProps) => {
  const largeScreen = useMediaQuery("(min-width: 40em)");
  const carouselApiRef = useRef<any>(null);
  const [page, { increment, decrement }] = useCounter(0, {
    min: 0,
  });
  const createMenuBannerMutation = useCreateMenuBannerMutation(menuId);
  const updateMenuBannerMutation = useUpdateMenuBannerMutation(menuId);
  const deleteMenuBannerMutation = useDeleteMenuBannerMutation(menuId, () => {
    carouselApiRef.current?.scrollPrev();
    decrement();
  });
  const { data, isPending } = useMenuBannerQuery(menuId);
  const translations = useExtracted();
  useEffect(() => {
    if (data && carouselApiRef.current) {
      carouselApiRef.current.scrollTo(data.length - 1);
    }
  }, [data, data?.length]);

  if (isPending) return <RateupLoader />;
  const defaultValues: MenuBanner = {
    description: "",
    id: "",
    menuId: menuId,
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
      decrement();
    }
  };

  const bannerForm = data?.map((value, index) => (
    <CarouselItem
      key={value.id}
      style={{ maxWidth: largeScreen ? "min(59vw , 890px)" : "90vw" }}
    >
      <Slide
        key={value?.id ?? index}
        menuId={menuId}
        formValues={value}
        onClose={onClose}
        createMenuBannerMutation={createMenuBannerMutation}
        updateMenuBannerMutation={updateMenuBannerMutation}
        deleteMenuBannerMutation={deleteMenuBannerMutation}
        popFromData={popFromData}
        currency={currency}
      />
    </CarouselItem>
  ));

  const bannerInfo = (
    <Popover position="bottom" withArrow shadow="md">
      <Popover.Target>
        <ActionIcon variant="transparent" mt={4}>
          <IconInfoCircle size={16} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Image
          src={getFileUrlFromKey("/images/menu/banner-demo.gif", false)}
          w={largeScreen ? "min(70vw , 1000px)" : "90vw"}
          alt="banner demo gif"
        />
      </Popover.Dropdown>
    </Popover>
  );
  return (
    <Modal
      centered
      opened={opened}
      onClose={onClose}
      size={largeScreen ? "min(70vw , 1000px)" : "90vw"}
      scrollAreaComponent={ScrollAreaAutosize}
      radius={"lg"}
      title={
        <Stack pl={"xl"} gap={0}>
          <Group align="center" gap={4}>
            <Title order={3}>{translations("Manage Banners")}</Title>
            {bannerInfo}
          </Group>
          <Text fz={"md"} c={"var(--grey-color-4)"}>
            {translations(
              "Sliding banners to be shown in top of menu. You can add upto 4 banners.",
            )}
          </Text>
        </Stack>
      }
    >
      <Stack
        mih={"clamp(400px, 292.864px + 17.857vw, 550px)"}
        px={"lg"}
        justify="center"
      >
        {(data?.length ?? 0) <= 0 ? (
          <Stack align="center" justify="center" mt={"-100px"}>
            <Group ml={"-25px"}>
              <IconBookmark
                width={"77px"}
                height={"77px"}
                style={{ position: "absolute" }}
                color={"var(--grey-color-4)"}
                stroke={1.2}
              />
              <IconBookmark
                width={"77px"}
                height={"77px"}
                style={{ position: "relative", left: "25", top: "-10" }}
                color={"var(--grey-color-4)"}
                stroke={1.2}
              />
            </Group>

            <Text fz={"lg"} c={"var(--grey-color-4)"}>
              {translations("No Banners are added")}
            </Text>
            <RateupButtonPrimary
              title={translations("Add Banner")}
              rightIcon={<IconPlus />}
              radius="xl"
              size="md"
              onClick={() => {
                increment();
                data?.push(defaultValues);
              }}
            />
          </Stack>
        ) : (
          <>
            <Group justify="space-between" mt={2}>
              <RateupButtonPrimary
                title={translations("Add Banner")}
                rightIcon={<IconPlus />}
                radius="xl"
                size="md"
                disabled={data?.length === 4}
                onClick={() => {
                  if (!data?.[data?.length - 1]?.id) {
                    toast.error(
                      translations(
                        "Save the form you just made, then click Add Banner button to make a new form.",
                      ),
                    );
                    return;
                  }
                  increment();
                  data.push(defaultValues);
                }}
              />
              <Group>
                <RateupIconButton
                  title=""
                  rightIcon={<IconChevronLeft />}
                  radius="md"
                  size="md"
                  onClick={() => carouselApiRef.current?.scrollPrev()}
                />
                <RateupIconButton
                  title=""
                  rightIcon={<IconChevronRight />}
                  radius="md"
                  size="md"
                  onClick={() => carouselApiRef.current?.scrollNext()}
                />
              </Group>
            </Group>
            <PaperLayout mt={"lg"}>
              <Carousel
                setApi={(api) => {
                  carouselApiRef.current = api;
                }}
                className="w-full"
              >
                <CarouselContent>{bannerForm}</CarouselContent>
              </Carousel>
            </PaperLayout>
          </>
        )}
      </Stack>
    </Modal>
  );
};
