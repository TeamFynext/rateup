import Image from "next/image";

import { Flex, Group, List, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import BookDemoContactForm from "@/components/HomePage/components/BookDemoContactForm";
import TryFreePlanBtn from "@/components/HomePage/components/TryFreePlanBtn";
import { imagesPath } from "@/utils/constants";

import commonStyles from "../../QrStudioPage/HeroSection/HeroSection.module.css";
import ListItemDot from "../../QrStudioPage/HeroSection/ListItemDot";
import styles from "../../WhatsappFeedbackPage/HeroSection/HeroSection.module.css";

const cx = classNames.bind(styles);
const commonStylesCx = classNames.bind(commonStyles);

function HeroSection() {
  return (
    <Flex
      className={commonStylesCx(
        "hero-section-root-div",
        cx("hero-section-root-div"),
      )}
    >
      <Stack className={commonStylesCx("text-wrapper")}>
        <Stack
          className={commonStylesCx("text-container", cx("text-container"))}
        >
          <h1 className={commonStylesCx("heading", cx("heading"))}>
            <span>Effortlessly collect and </span>
            <span>analyze customer insights</span>
            <span>with web survey</span>
          </h1>
          <List
            className={commonStylesCx(
              "qr-features-list",
              cx("qr-features-list"),
            )}
          >
            <List.Item icon={<ListItemDot color={"#FFD54C"} />}>
              Capture leads or gather valuable feedback
            </List.Item>
            <List.Item icon={<ListItemDot color={"#FFD54C"} />}>
              Create web surveys and share via links or QR codes
            </List.Item>
            <List.Item icon={<ListItemDot color={"#FFD54C"} />}>
              Visualize branch-specific data
            </List.Item>
          </List>
          <Group
            className={commonStylesCx(
              "book-demo-try-free-plan-btns-container",
              cx("book-demo-try-free-plan-btns-container"),
            )}
          >
            <BookDemoContactForm
              buttonProps={{ whiteBackgroundGradientText: true }}
            />
            <TryFreePlanBtn
              className={commonStylesCx(
                "try-free-plan-btn",
                cx("try-free-plan-btn"),
              )}
            />
          </Group>
        </Stack>
      </Stack>

      <Stack
        className={commonStylesCx("image-container", cx("image-container"))}
        mah={"26rem"}
      >
        <Image
          className={commonStylesCx("hero-section-image")}
          src={`${imagesPath}/web-survey-page/hero-section-image.png`}
          width={1409}
          height={1082}
          alt="Laptop with floating emojis"
          priority
        />
      </Stack>
    </Flex>
  );
}

export default HeroSection;
