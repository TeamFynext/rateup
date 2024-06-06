import { Flex, Image, Group } from "@mantine/core";
import {
  getNavLinksArray,
  rateupLogoBlueTextUrl,
  rateupLogoWhiteTextUrl,
} from "../../constants";
import LoginSignupLinks from "./LoginSignupLinks";
import Link from "next/link";
import Button from "../Button";
import { useRouter } from "next/router";
import MobileNavDrawer from "./MobileNavDrawer/MobileNavDrawer";
import classNames from "classnames/bind";
import styles from "./Header.module.css";
import { isProduction } from "../../../../utils/constants";
import { analyseEvent } from "../../../../utils/gtag";
import { fbEvent } from "../../../../utils/fbpixel";

const cx = classNames.bind(styles);

function Header({ className = "" }) {
  const router = useRouter();
  const currentRoutePath = router.pathname;

  return (
    <Flex justify="space-between" className={cx(className, "header-container")}>
      <Group gap={"sm"} className={cx("logo-nav-container")} wrap="nowrap">
        <Link href="/">
          <Image
            src={rateupLogoBlueTextUrl}
            alt="logo"
            w={"4.0625rem"}
            h={"3.125rem"}
            fit="contain"
          />
        </Link>
        <nav>
          <Flex className={cx("header-links-container")}>
            {getNavLinksArray(`${cx("header-link")} header-link`)}
          </Flex>
          <MobileNavDrawer />
        </nav>
      </Group>
      {!(currentRoutePath === "/digital-menu") ? (
        <LoginSignupLinks />
      ) : (
        <Flex className={cx("join-now-btn-container")}>
          <Button
            onClick={() => {
              if (isProduction) {
                analyseEvent({
                  action: "button_click",
                  category: "digital_menu",
                  label:
                    "Clicked on join now button in digital menu section of home page",
                });
                fbEvent("DigitalMenuJoinNow", {
                  label:
                    "Clicked on join now button in digital menu section of home page",
                });
              }
            }}
          >
            Join Now
          </Button>
        </Flex>
      )}
    </Flex>
  );
}

export default Header;
