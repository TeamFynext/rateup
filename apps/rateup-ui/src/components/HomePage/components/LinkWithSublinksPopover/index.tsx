import { Button, Flex, Image, Popover, ScrollAreaAutosize, Stack } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconChevronDown } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

import { useCurrentPath } from "@/hooks/currentPath.tsx";

import headerStyles from "../Header/Header.module.css";
import styles from "./LinkWithSublinksPopover.module.css";

const LinkWithSublinksPopover = ({ className, href, linkText, sublinks }) => {
  const [opened, { close, open }] = useDisclosure(false);
  const isViewportLEQ1024px = useMediaQuery("(max-width: 1024px");
  const currentRoutePath = useCurrentPath();

  useEffect(() => {
    if (isViewportLEQ1024px && opened) {
      close();
    }
  }, [isViewportLEQ1024px]);
  return (
    <Popover opened={opened} zIndex={400} width={350} offset={-3} position="bottom" withArrow>
      <Popover.Target>
        <Flex
          className={`${headerStyles["header-link-wrapper"]} ${
            opened ? styles["dropdown-active"] : ""
          }`}
          onMouseEnter={open}
          onMouseLeave={close}
        >
          <Link className={className} to={href} key={linkText} onClick={() => close()}>
            <span>{linkText}</span>
          </Link>
          <Button
            className={`${styles["sublinks-chevron-btn"]} sublinks-chevron-btn`}
            classNames={{
              section: styles["chevron-down"],
            }}
            onClick={(_e) => {
              if (!opened) open();
              else close();
            }}
            rightSection={<IconChevronDown />}
          ></Button>
        </Flex>
      </Popover.Target>
      <Popover.Dropdown
        onMouseEnter={open}
        onMouseLeave={close}
        className={styles["popover-dropdown"]}
      >
        <ScrollAreaAutosize mah={500} offsetScrollbars scrollbarSize={7}>
          <Stack>
            {sublinks.map(({ id, link, content, iconLink }) => {
              const { heading, description } = content;
              return (
                <Link key={id} to={link} className={styles["link"]}>
                  <Flex className={styles["link-content-container"]}>
                    <Flex className={styles["image-container"]}>
                      <Image className={styles["link-content-img"]} src={iconLink} alt="icon" />
                    </Flex>
                    <Stack
                      className={`${styles["heading-description-container"]} ${currentRoutePath === link ? "link-active" : ""}`}
                    >
                      <span className={styles["heading-span"]}>{heading}</span>
                      <span className={styles["description-span"]}>{description}</span>
                    </Stack>
                  </Flex>
                </Link>
              );
            })}
          </Stack>
        </ScrollAreaAutosize>
      </Popover.Dropdown>
    </Popover>
  );
};

export default LinkWithSublinksPopover;
