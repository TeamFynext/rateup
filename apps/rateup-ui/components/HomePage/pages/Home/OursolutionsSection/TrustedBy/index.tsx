import { Flex, Image, Title } from "@mantine/core";
import styles from "./TrustedBy.module.css";
import commonStyles from "../../../../index.module.css";
import { lexend600 } from "../../../../../../utils/fonts";

function TrustedBy() {
  const logosPath = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/homepage/customer-logos`;

  return (
    <div className={styles["trustedby-companies-container"]}>
      <Title order={1} className={commonStyles["section-heading"]}>
        Trusted By Reputed Brands And Public Sector Organizations
      </Title>
      <Flex
        className={styles["company-logos-container"]}
        wrap={"wrap"}
        gap={"md"}
      >
        <Image
          src={`${logosPath}/kerala-startup-mission-logo.png`}
          alt="kerala startup mission"
        />
        <Image
          src={`${logosPath}/government-of-kerala-logo.png`}
          alt="amazon"
        />
        <Image src={`${logosPath}/kdisc-logo.png`} alt="infosys" />
        <Image src={`${logosPath}/myg-logo.png`} alt="infosys" />
        <Image src={`${logosPath}/fabus-logo.png`} alt="amazon" />
        <Image src={`${logosPath}/linnk-group-logo.png`} alt="wipro" />
      </Flex>
    </div>
  );
}

export default TrustedBy;
