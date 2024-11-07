import React, { useEffect, useState } from "react";

import {
  Anchor,
  Box,
  Divider,
  Image,
  ScrollArea,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import classNames from "classnames/bind";
import { motion } from "framer-motion";

import useTranslations from "@/dictionaries/useTranslation";

import { useSubscription } from "../../../../backend/subscription/subscription.query";
import { useUser } from "../../../../context/UserContext";
import {
  imagesPath,
  localImagesPath,
  surveyUploadsPath,
} from "../../../../utils/constants";
import { UserRole } from "../../../../utils/enums";
import ExpiryComponent from "../../../Premium/ExpiryComponent";
import { getNavTopData } from "../navbar.constants";
import NavbarFooter from "./components/NavbarFooter";
import NavbarHeader from "./components/NavbarHeader";
import NavbarLink from "./components/NavbarLink/NavbarLink";
import styles from "./LeftNavbar.module.css";

const cx = classNames.bind(styles);

interface iProps {
  focus: boolean;
}

const LeftNavbar = ({ focus }: iProps) => {
  const [active, setActive] = useState(0);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { user } = useUser();
  const [userProfileAvatar, setUserProfileAvatar] = useState(
    `${imagesPath}/user.png`,
  );
  const { translations } = useTranslations();
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
  const navTopData = getNavTopData(subscription, translations);

  return (
    <motion.div
      className={cx("navbar", {
        mobile: isMobile,
        focused: focus,
      })}
      layout="position"
      transition={{ duration: 0.3, ease: "linear" }}
    >
      <header>
        <NavbarHeader {...user} />
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
          currentRole={userInfo.role}
          active={active}
          setActive={setActive}
        />

        <ExpiryComponent expiryDate={subscription?.expiresAt}>
          <Tooltip label={"Buy Rateup Premium"} position="right">
            <Box mt="sm" ml="1px">
              <Anchor href="/dashboard/settings?activeTab=account&view=billing">
                <Image
                  src={`${localImagesPath}/${"rateup-pro-ad.png"}`}
                  alt=""
                  height={180}
                />
              </Anchor>
            </Box>
          </Tooltip>
        </ExpiryComponent>
      </ScrollArea>
      <Divider />
      <footer className={styles.navbarfooter}>
        <NavbarFooter {...user} />
      </footer>
    </motion.div>
  );
};

export default LeftNavbar;

export interface UserCardInterface extends UserData {}
