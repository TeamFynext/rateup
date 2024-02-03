import { useEffect, useRef, useState } from "react";

import { useCounter, useMediaQuery } from "@mantine/hooks";
import { Carousel, Embla, useAnimationOffsetEffect } from "@mantine/carousel";
import {
  ActionIcon,
  Group,
  Image,
  Modal,
  Popover,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBookmark,
  IconChevronLeft,
  IconChevronRight,
  IconInfoCircle,
  IconPlus,
} from "@tabler/icons-react";

import { Slide } from "../menu/slide/Slide";
import { MenuItemPriceType } from "../../types/enums";
import PaperLayout from "../styled/Layouts/PaperLayout";
import CenteredSpinner from "../Loaders/CenteredSpinner";
import { showErrorToast } from "../../utils/notifications";
import { getFileUrlFromKey } from "../../utils/file-upload/upload";
import { RateupButtonBlue, RateupIconButton } from "../Button/RateupButtons";
import {
  useCreateMenuBannerMutation,
  useDeleteMenuBannerMutation,
  useMenuBannerQuery,
  useUpdateMenuBannerMutation,
} from "../../backend/menu/Banner/banner.query";

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
  const [_, { increment, decrement }] = useCounter(0, {
    min: 0,
  });
  const createMenuBannerMutation = useCreateMenuBannerMutation(menuId);
  const updateMenuBannerMutation = useUpdateMenuBannerMutation(menuId);
  const deleteMenuBannerMutation = useDeleteMenuBannerMutation(menuId, () => {
    decrement();
  });
  const { data, isPending } = useMenuBannerQuery(menuId);
  const TRANSITION_DURATION = 200;
  const [embla, setEmbla] = useState<Embla | null>(null);

  useAnimationOffsetEffect(embla, TRANSITION_DURATION);
  useEffect(() => {
    if (data) {
      handleCarouselControl(1, data?.length);
    }
  }, [data, data?.length]);

  if (isPending) return <CenteredSpinner />;
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
      radius={"lg"}
      title={
        <Stack pl={"xl"} gap={0}>
          <Group align="center" gap={4}>
            <Title order={3}>Manage Banners</Title>
            {bannerInfo}
          </Group>
          <Text fz={"md"} c={"var(--grey-color-4)"}>
            Sliding banners to be shown in top of menu. You can add upto 4
            banners.
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
              No Banners are added
            </Text>
            <RateupButtonBlue
              title="Add Banner"
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
              <RateupButtonBlue
                title="Add Bannerss"
                rightIcon={<IconPlus />}
                radius="xl"
                size="md"
                disabled={data?.length === 4}
                onClick={() => {
                  if (!data?.[data?.length - 1]?.id) {
                    showErrorToast(
                      "Save the form you just made, then click Add Banner button to make a new form.",
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
                  color={"var(--light-blue-4)"}
                  sx={{
                    borderColor: "var(--tertiary-color)",
                    color: "var(----tertiary-color)",
                    padding: "0px",
                  }}
                />
                <RateupIconButton
                  title=""
                  rightIcon={<IconChevronRight />}
                  radius="md"
                  size="md"
                  onClick={() => handleCarouselControl(1)}
                  color={"var(--light-blue-4)"}
                  sx={{
                    borderColor: "var(--tertiary-color)",
                    color: "var(----tertiary-color)",
                    padding: "0px",
                  }}
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
                getEmblaApi={setEmbla}
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
