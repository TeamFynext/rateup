import { useEffect, useRef } from "react";

import { Carousel } from "@mantine/carousel";
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
import { useTranslations } from "next-intl";

import { MenuItemPriceType } from "@/types/enums";
import {
  useCreateMenuBannerMutation,
  useDeleteMenuBannerMutation,
  useMenuBannerQuery,
  useUpdateMenuBannerMutation,
} from "@/backend/menu/Banner/banner.query";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";
import { showErrorToast } from "@/utils/notifications";

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
  const carouselRef = useRef(null);
  const [page, { increment, decrement }] = useCounter(0, {
    min: 0,
  });
  const createMenuBannerMutation = useCreateMenuBannerMutation(menuId);
  const updateMenuBannerMutation = useUpdateMenuBannerMutation(menuId);
  const deleteMenuBannerMutation = useDeleteMenuBannerMutation(menuId, () => {
    decrement();
  });
  const { data, isPending } = useMenuBannerQuery(menuId);
  const translations = useTranslations();
  useEffect(() => {
    if (data) {
      handleCarouselControl(1, data?.length);
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
    <Carousel.Slide
      key={value.id}
      maw={largeScreen ? "min(59vw , 890px)" : "90vw"}
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
    </Carousel.Slide>
  ));

  const handleCarouselControl = (direction: number, times: number = 1) => {
    if (carouselRef?.current) {
      const controls = carouselRef.current.querySelectorAll(
        ".mantine-Carousel-control",
      );
      const nextControl = controls?.[direction];
      if (nextControl) {
        let max = Math.min(times, 4);
        for (let index = 0; index < max; index++) {
          nextControl.click();
        }
      }
    }
  };
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
                    showErrorToast(
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
                  onClick={() => handleCarouselControl(0)}
                />
                <RateupIconButton
                  title=""
                  rightIcon={<IconChevronRight />}
                  radius="md"
                  size="md"
                  onClick={() => handleCarouselControl(1)}
                />
              </Group>
            </Group>
            <PaperLayout mt={"lg"}>
              <Carousel
                ref={carouselRef}
                withIndicators
                slideGap="lg"
                onNextSlide={increment}
                onPreviousSlide={decrement}
                styles={{
                  control: {
                    visibility: "hidden",
                  },
                  indicator: {
                    background: "var(--tertiary-color)",
                  },
                }}
              >
                {bannerForm}
              </Carousel>
            </PaperLayout>
          </>
        )}
      </Stack>
    </Modal>
  );
};
