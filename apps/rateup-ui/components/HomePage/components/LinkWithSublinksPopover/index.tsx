import { Button, Flex, Image, Popover, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import headerStyles from "../Header/Header.module.css";
import styles from "./LinkWithSublinksPopover.module.css";
import Link from "next/link";
import { IconCaretDownFilled, IconChevronDown } from "@tabler/icons-react";

const LinkWithSublinksPopover = ({ className, href, linkText, sublinks }) => {
  const [opened, { close, open }] = useDisclosure(false);
  return (
    <Popover
      opened={opened}
      zIndex={400}
      width={350}
      offset={0}
      position="bottom"
      withArrow
    >
      <Popover.Target>
        <Flex
          className={`${headerStyles["header-link-wrapper"]} ${
            opened ? styles["dropdown-active"] : ""
          }`}
          onMouseEnter={open}
          onMouseLeave={close}
        >
          <Link
            className={className}
            href={href}
            key={linkText}
            onClick={() => close()}
          >
            <span>{linkText}</span>
          </Link>
          <Button
            className={styles["sublinks-chevron-btn"]}
            classNames={{
              section: styles["chevron-down"],
            }}
            onClick={(e) => {
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
        {sublinks.map(({ id, link, content, iconLink }) => {
          const { heading, description } = content;
          return (
            <Link key={id} href={link} className={styles["link"]}>
              <Flex className={styles["link-content-container"]}>
                <Flex className={styles["image-container"]}>
                  <Image
                    className={styles["link-content-img"]}
                    src={iconLink}
                    alt="icon"
                  />
                </Flex>
                <Stack className={styles["heading-description-container"]}>
                  <span className={styles["heading-span"]}>{heading}</span>
                  <span className={styles["description-span"]}>
                    {description}
                  </span>
                </Stack>
              </Flex>
            </Link>
          );
        })}
      </Popover.Dropdown>
    </Popover>
  );
};

export default LinkWithSublinksPopover;
