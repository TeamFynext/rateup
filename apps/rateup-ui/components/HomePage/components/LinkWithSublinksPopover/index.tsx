import { Button, Flex, Popover } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import headerStyles from "../Header/Header.module.css";
import Link from "next/link";
import { IconCaretDownFilled } from "@tabler/icons-react";

const LinkWithSublinksPopover = ({ className, href, linkText, sublinks }) => {
  const [opened, { close, open }] = useDisclosure(false);
  return (
    <Popover
      opened={opened}
      zIndex={400}
      width={200}
      offset={0}
      position="bottom-start"
    >
      <Popover.Target>
        <Flex
          className={headerStyles["header-link-wrapper"]}
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
            className={headerStyles["sublinks-caret-btn"]}
            onClick={(e) => {
              if (!opened) open();
              else close();
            }}
          >
            <IconCaretDownFilled />
          </Button>
        </Flex>
      </Popover.Target>
      <Popover.Dropdown onMouseEnter={open} onMouseLeave={close}>
        {sublinks.map(({ link, label }) => {
          return (
            <Flex key={label} justify={"center"}>
              <Link className={className} href={link}>
                {label}
              </Link>
            </Flex>
          );
        })}
      </Popover.Dropdown>
    </Popover>
  );
};

export default LinkWithSublinksPopover;
