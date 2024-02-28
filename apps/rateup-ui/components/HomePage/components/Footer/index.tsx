import { Image } from "@mantine/core";
import { imagesPath, rateupLogoBlueTextUrl } from "../../constants";
import styles from "./footer.module.css";
import { IconBrandFacebook } from "@tabler/icons-react";
import FooterNavLinks from "./FooterNavLinks";

const logosFolderPath = `${imagesPath}/follow-us-on-logos`;
function Footer() {
  return (
    <div className={styles["footer-root-div"]}>
      <div className={styles["footer-content-container"]}>
        <div className={styles["logo-and-follow-us-container"]}>
          <div className={styles["logo-container"]}>
            <Image
              className={styles["footer-logo"]}
              src={rateupLogoBlueTextUrl}
              alt="rate up logo"
              w={85}
            />
          </div>
          <p className={styles["follow-us-on-para"]}>
            <span className={styles["follow-us-on-text"]}>Follow Us On:</span>
            <span className={styles["logo-links-container"]}>
              <a target="_blank" href="https://www.linkedin.com/company/rateup">
                <Image
                  src={`${logosFolderPath}/linkedin-logo.png`}
                  alt="follow us on instagram"
                  w={27}
                  h={25}
                />
              </a>
              <a
                target="_blank"
                href="https://www.instagram.com/rateupsoftware/"
              >
                <Image
                  src={`${logosFolderPath}/instagram-logo.png`}
                  alt="follow us on instagram"
                  w={27}
                  h={25}
                />
              </a>
              <a target="_blank" href="#">
                <Image
                  src={`${logosFolderPath}/facebook-logo.png`}
                  alt="follow us on facebook"
                  w={27}
                  h={25}
                />
              </a>
            </span>
          </p>
        </div>

        <FooterNavLinks />
      </div>

      <p className={styles["copyright-para"]}>
        Copyright &copy;{new Date().getFullYear()} All rights reserved
      </p>
    </div>
  );
}

export default Footer;
