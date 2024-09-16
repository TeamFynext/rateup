import Image from "next/image";

import { Flex, Group, List, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import BookDemoContactForm from "@/components/HomePage/components/BookDemoContactForm";
import TryFreePlanBtn from "@/components/HomePage/components/TryFreePlanBtn";
import { imagesPath } from "@/utils/constants";

import commonStyles from "../../QrStudioPage/HeroSection/HeroSection.module.css";
import ListItemDot from "../../QrStudioPage/HeroSection/ListItemDot";
import styles from "./HeroSection.module.css";

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
            <span>Engage where your</span>
            <span>customers are most active</span>
          </h1>
          <List
            className={commonStylesCx(
              "qr-features-list",
              cx("qr-features-list"),
            )}
          >
            <List.Item icon={<ListItemDot color={"#FFD54C"} />}>
              Automate sending interactive whatsapp feedback forms
            </List.Item>
            <List.Item icon={<ListItemDot color={"#FFD54C"} />}>
              Create and track tickets for negative feedback
            </List.Item>
            <List.Item icon={<ListItemDot color={"#FFD54C"} />}>
              Turn positive feedback to public reviews
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
      >
        <Image
          className={commonStylesCx("hero-section-image")}
          src={`${imagesPath}/whatsapp-feedback-page/hero-section-image.png`}
          width={1356}
          height={888}
          alt="Engage where your customer are most active"
          priority
        />
      </Stack>
    </Flex>
  );
}

export default HeroSection;
