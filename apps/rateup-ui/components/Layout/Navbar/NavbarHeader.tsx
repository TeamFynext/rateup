import { Avatar, Group, Text, UnstyledButton } from "@mantine/core";
import { UserCardInterface } from "./LeftNavbar";
import styles from "./Navbar.module.css";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { IconChevronLeft } from "@tabler/icons-react";
import { IconChevronRight } from "@tabler/icons-react";
const NavbarHeader = (props: UserCardInterface) => {
  return (
    <UnstyledButton className={styles.user}>
      <Group justify="center" wrap="wrap-reverse">
        <Avatar
          src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${props.orgLogo}`}
          radius="sm"
        />
        {props.opened && (
          <div style={{ flex: 1 }}>
            <Text size="sm" fw={500}>
              {props?.orgName}
            </Text>
          </div>
        )}
        <PaperLayout
          w={"fit-content"}
          p={1}
          hoveractive
          radius={"xl"}
          style={{
            justifySelf: "flex-end",
            alignItems: "center",
            justifyContent: "center",
            display: "flex",
          }}
        >
          {props.opened ? (
            <IconChevronLeft
              size={20}
              onClick={() => {
                props?.setOpened((o) => !o);
              }}
              style={{ cursor: "pointer" }}
            />
          ) : (
            <IconChevronRight
              size={20}
              onClick={() => {
                props?.setOpened((o) => !o);
              }}
              style={{ cursor: "pointer" }}
            />
          )}
        </PaperLayout>
      </Group>
    </UnstyledButton>
  );
};

export default NavbarHeader;
