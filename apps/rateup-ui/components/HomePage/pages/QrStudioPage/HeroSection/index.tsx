import Image from "next/image";

import { Flex, Group, List, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import BookDemoContactForm from "@/components/HomePage/components/BookDemoContactForm";
import TryFreePlanBtn from "@/components/HomePage/components/TryFreePlanBtn";
import { imagesPath } from "@/utils/constants";

import styles from "./HeroSection.module.css";
import ListItemDot from "./ListItemDot";

const cx = classNames.bind(styles);

function HeroSection() {
  return (
    <Flex className={cx("hero-section-root-div")}>
      <Stack className={cx("text-wrapper")}>
        <Stack className={cx("text-container")}>
          <h1 className={cx("heading")}>
            <span>One smart QR code,</span>
            <span>Endless Possibilities</span>
          </h1>
          <List className={cx("qr-features-list")}>
            <List.Item icon={<ListItemDot />}>
              Create smart QR codes and add dynamic content
            </List.Item>
            <List.Item icon={<ListItemDot />}>
              Collect feedback and generate tickets on the platform
            </List.Item>
            <List.Item icon={<ListItemDot />}>
              Get customer insights from QR scans
            </List.Item>
          </List>
          <Group className={cx("book-demo-try-free-plan-btns-container")}>
            <BookDemoContactForm />
            <TryFreePlanBtn className={cx("try-free-plan-btn")} />
          </Group>
        </Stack>
      </Stack>

      <Stack className={cx("image-container")}>
        <Image
          className={cx("hero-section-image")}
          src={`${imagesPath}/qr-studio-page/hero-section-image.png`}
          width={1137}
          height={937}
          alt="One smart QR code,Endless Possibilities"
          priority
        />
      </Stack>
    </Flex>
  );
}

export default HeroSection;
