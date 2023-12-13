import { Box, Group, Modal, Stack, Text, Title } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";
import { RateupButtonBlue, RateupIconButton } from "../Button/RateupButtons";
import {
  IconBookmark,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
} from "@tabler/icons-react";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { useCounter, useMediaQuery } from "@mantine/hooks";
import { Carousel, Embla, useAnimationOffsetEffect } from "@mantine/carousel";
import { Slide } from "../menu/slide/Slide";
import {
  useCreateMenuBannerMutation,
  useDeleteMenuBannerMutation,
  useMenuBannerQuery,
  useUpdateMenuBannerMutation,
} from "../../backend/menu/Banner/banner.query";
import CenteredSpinner from "../Loaders/CenteredSpinner";
import { MenuItemPriceType } from "../../types/enums";
import { showErrorToast } from "../../utils/notifications";

export const BannerAddAndViewModal = ({ opened, onClose, menuId }) => {
  const largeScreen = useMediaQuery("(min-width: 40em)");
  const carouselRef = useRef(null);
  const [count, { increment, decrement }] = useCounter(0, {
    min: 0,
  });
  const createMenuBannerMutation = useCreateMenuBannerMutation(menuId);
  const updateMenuBannerMutation = useUpdateMenuBannerMutation(menuId);
  const deleteMenuBannerMutation = useDeleteMenuBannerMutation(menuId, () => {
    decrement();
  });
  const { data, isPending, isError } = useMenuBannerQuery(menuId);
  const TRANSITION_DURATION = 200;
  const [embla, setEmbla] = useState<Embla | null>(null);

  useAnimationOffsetEffect(embla, TRANSITION_DURATION);
  useEffect(() => {
    if (data) {
      handleCarouselControl(1, data?.length);
    }
  }, [data?.length]);

  if (isPending) return <CenteredSpinner />;
  const defaultValues = {
    description: "",
    id: "",
    menuId: menuId,
    name: "",
    price: {
      price: "",
      type: MenuItemPriceType.FIXED,
    },
    createdAt: "",
    videoUrl: "",
  };
  const popFromData = () => {
    if (data?.length > 0) {
      data?.pop();
      decrement();
    }
  };

  const bannerForm = data?.map((value, index) => (
    <Carousel.Slide key={value.id}>
      <Slide
        key={value?.id ?? index}
        menuId={menuId}
        formValues={value}
        onClose={onClose}
        createMenuBannerMutation={createMenuBannerMutation}
        updateMenuBannerMutation={updateMenuBannerMutation}
        deleteMenuBannerMutation={deleteMenuBannerMutation}
        popFromData={popFromData}
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
  return (
    <Modal
      centered
      opened={opened}
      onClose={onClose}
      size={largeScreen ? "70vw" : "90vw"}
      radius={"lg"}
      title={
        <Stack pl={"xl"} gap={0}>
          <Title order={2}>Manage Banners</Title>
          <Text fz={"lg"} c={"var(--grey-color-4)"}>
            you can add 4 Banners
          </Text>
        </Stack>
      }
    >
      <Box h={"70vh"} mah={"500px"} px={"lg"}>
        {data?.length <= 0 ? (
          <Stack justify="center" align="center" h={"100%"}>
            <Stack align="center" justify="center">
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
                  data.push(defaultValues);
                }}
              />
            </Stack>
          </Stack>
        ) : (
          <>
            <Group justify="space-between">
              <RateupButtonBlue
                title="Add Bannerss"
                rightIcon={<IconPlus />}
                radius="xl"
                size="md"
                disabled={data?.length === 4}
                onClick={() => {
                  if (!data[data?.length - 1]?.id) {
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
                onNextSlide={() => increment()}
                onPreviousSlide={() => decrement()}
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
      </Box>
    </Modal>
  );
};
