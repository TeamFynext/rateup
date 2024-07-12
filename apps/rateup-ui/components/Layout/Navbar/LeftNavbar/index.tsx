import {
  Anchor,
  Box,
  Divider,
  Image,
  ScrollArea,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import React, { useEffect, useState } from "react";
import { useSubscription } from "../../../../backend/subscription/subscription.query";
import { useUser } from "../../../../context/UserContext";
import { UserRole } from "../../../../utils/enums";
import ExpiryComponent from "../../../Premium/ExpiryComponent";
import NavbarFooter from "../NavbarFooter";
import NavbarHeader from "../NavbarHeader";
import { getNavTopData } from "../navbar.constants";
import NavbarLink from "./components/NavbarLink/NavbarLink";
import { motion } from "framer-motion";

import styles from "./LeftNavbar.module.css";
import classNames from "classnames/bind";
import {
  imagesPath,
  localImagesPath,
  surveyUploadsPath,
} from "../../../../utils/constants";
import NavbarSkeleton from "../../../animation/skeleton/Navbar.Skeleton";
const cx = classNames.bind(styles);

interface iProps {
  opened: boolean;
  setOpened: React.Dispatch<React.SetStateAction<boolean>>;
  focus: boolean;
}

const LeftNavbar = ({ opened, setOpened, focus }: iProps) => {
  const [active, setActive] = useState(0);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { user } = useUser();
  const [userProfileAvatar, setUserProfileAvatar] = useState(
    `${imagesPath}/user.png`,
  );
  useEffect(() => {
    if (user?.profilePhoto && user?.profilePhoto !== "REMOVED_PHOTO") {
      const imgUrl = `${surveyUploadsPath}${user?.profilePhoto}`;
      setUserProfileAvatar(imgUrl);
    } else {
      setUserProfileAvatar(`${imagesPath}/profile-photo.png`);
    }
  }, [user]);

  const userInfo: {
    name: string;
    email: string;
    role:
      | typeof UserRole.ADM
      | typeof UserRole.MEMBER
      | typeof UserRole.SUPADM
      | "...error...";
    image: string;
  } = {
    name: user?.userName,
    email: user?.email,
    role: !user?.role ? "...error..." : user?.role,
    image: userProfileAvatar,
  };

  const { data: subscription, isPending } = useSubscription();
  if (isPending && opened) return <NavbarSkeleton className={cx("navbar")} />;
  const navTopData = getNavTopData(subscription);

  return (
    <motion.div
      className={cx("navbar", {
        mobile: isMobile,
        closed: !opened,
        focused: focus,
      })}
      layout="position"
      transition={{ duration: 0.3, ease: "linear" }}
    >
      <header>
        <NavbarHeader {...user} {...{ opened, setOpened }} />
      </header>
      <Divider />
      <ScrollArea
        mt={"xs"}
        mb={20}
        p={"lg"}
        h={"100%"}
        scrollbars="y"
        scrollbarSize={7}
        offsetScrollbars
        styles={{
          scrollbar: {
            opacity: 0.3,
          },
        }}
      >
        <NavbarLink
          data={navTopData}
          opened={opened}
          currentRole={userInfo.role}
          setOpened={setOpened}
          active={active}
          setActive={setActive}
        />

        <ExpiryComponent expiryDate={subscription?.expiresAt}>
          <Tooltip
            label={!opened ? "Buy Rateup Premium" : ""}
            position="right"
            styles={{ tooltip: { display: opened && "none" } }}
          >
            <Box mt="sm" ml="1px">
              <Anchor href="/dashboard/settings?activeTab=account&view=billing">
                <Image
                  src={`${localImagesPath}/${
                    opened ? "rateup-pro-ad.png" : "premium-icon.svg"
                  }`}
                  alt=""
                  height={opened ? 180 : 20}
                />
              </Anchor>
            </Box>
          </Tooltip>
        </ExpiryComponent>
      </ScrollArea>
      <Divider />
      <footer className={styles.navbarfooter}>
        <NavbarFooter {...user} {...{ opened, setOpened }} />
      </footer>
    </motion.div>
  );
};

export default LeftNavbar;

export interface UserCardInterface extends UserData {
  opened: boolean;
  setOpened: React.Dispatch<React.SetStateAction<boolean>>;
}
