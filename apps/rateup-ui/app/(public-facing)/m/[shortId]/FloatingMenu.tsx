import React, { MutableRefObject } from "react";
import Link from "next/link";

import {
  ActionIcon,
  Avatar,
  Group,
  HoverCard,
  Menu,
  ScrollAreaAutosize,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconBrandWhatsapp,
  IconCategory,
  IconChevronUp,
  IconLink,
  IconMessage,
  IconPhone,
} from "@tabler/icons-react";

import { MenuButtons } from "@/types/enums";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

import styles from "./FloatingMenu.module.css";

type FloatingMenuMainProps = {
  dynamicVariables: any;
  categories: FullCategory[];
  displayName: string;
  logo: string;
  categoryRefs: MutableRefObject<{}>;
};
const FloatingMenuMain = ({
  dynamicVariables,
  categories,
  displayName,
  logo,
  categoryRefs,
}: FloatingMenuMainProps) => {
  const mainColor = "black";
  const firstTwoItems = dynamicVariables?.slice(0, 2);
  const remainingItems = dynamicVariables?.slice(2);

  const handleScrollToCategory = (categoryId: string) => {
    const categoryElement = categoryRefs.current[categoryId];
    if (categoryElement) {
      categoryElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <Stack
      pos={"fixed"}
      bottom={20}
      left={"50%"}
      style={{ transform: "translateX(-50%)", zIndex: 999 }}
      w={"max-content"}
    >
      <Group
        py={{ base: 8, lg: "xs" }}
        px={{ base: 8, lg: "lg" }}
        bg={mainColor}
        justify="space-evenly"
        className={styles.floatingMenu}
      >
        <HoverCard shadow="md" withArrow>
          <HoverCard.Target>
            <Avatar
              src={logo && getFileUrlFromKey(logo)}
              radius={"sm"}
              name={displayName}
              color="initials"
            />
          </HoverCard.Target>
          <HoverCard.Dropdown className={styles.hoverCard}>
            <Text fz={"sm"}>{displayName ?? "Brand"}</Text>
          </HoverCard.Dropdown>
        </HoverCard>

        {categories?.length && (
          <Menu shadow="md" offset={15} withArrow classNames={styles}>
            <Menu.Target>
              <Stack gap={0} align="center">
                <ActionIcon size={"lg"} variant="transparent">
                  <IconCategory color={"white"} />
                </ActionIcon>
                <Text fz={"xs"} lh={0.8} c={"white"}>
                  Category
                </Text>
              </Stack>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Categories</Menu.Label>
              <ScrollAreaAutosize
                mah={"50dvh"}
                type="always"
                classNames={styles}
              >
                {categories?.map((category) => (
                  <Menu.Item
                    key={category.id}
                    rightSection={<Text>{category.items?.length ?? 0}</Text>}
                    onClick={() => handleScrollToCategory(category.id)}
                  >
                    {category.name}
                  </Menu.Item>
                ))}
              </ScrollAreaAutosize>
            </Menu.Dropdown>
          </Menu>
        )}
        {firstTwoItems?.map((data) => (
          <Link
            key={data.name}
            href={getMenuBtnLink(data)}
            target="_blank"
            style={{ textDecoration: "none" }}
            className={styles.menuLink}
          >
            <Stack gap={0} align="center">
              <ActionIcon size={"lg"} variant="transparent">
                {customButton(data.name)}
              </ActionIcon>
              <Text fz={"xs"}>{data.name}</Text>
            </Stack>
          </Link>
        ))}
        {remainingItems?.length && (
          <Menu shadow="md" offset={15} withArrow classNames={styles}>
            <Menu.Target>
              <Stack gap={0} align="center">
                <ActionIcon size={"lg"} variant="transparent">
                  <IconChevronUp color={"white"} />
                </ActionIcon>
              </Stack>
            </Menu.Target>

            <Menu.Dropdown>
              {remainingItems?.map((data) => (
                <Menu.Item key={data.name} className={styles.menuBtn}>
                  <Link href={getMenuBtnLink(data)} target="_blank">
                    <Group gap={0}>
                      <ActionIcon size={"lg"} variant="transparent">
                        {customButton(data.name)}
                      </ActionIcon>
                      <Text fz={"xs"} lineClamp={1} maw={200}>
                        {data.name}
                      </Text>
                    </Group>
                  </Link>
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>
    </Stack>
  );
};

export default FloatingMenuMain;

const customButton = (name) => {
  switch (name) {
    case MenuButtons.CONTACT:
      return <IconPhone />;
    case MenuButtons.WHATSAPP:
      return <IconBrandWhatsapp />;
    case "feedback":
      return <IconMessage />;
    default:
      return <IconLink />;
  }
};

const getMenuBtnLink = (data) => {
  switch (data?.name) {
    case MenuButtons.CONTACT:
      return `tel:${data.link}`;
    case MenuButtons.WHATSAPP:
      return `http://wa.me/${data.link}`;
    default:
      return data.link;
  }
};
