import { Flex, Image, Title } from "@mantine/core";
import styles from "./TrustedBy.module.css";
import { lexend600 } from "../../../../../../utils/fonts";

function TrustedBy() {
  const logosPath = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/homepage/our-solutions/companies-logos`;

  return (
    <div className={styles["trustedby-companies-container"]}>
      <Title order={1} className={lexend600.className}>
        TRUSTED BY REPUTED BRANDS AND PUBLIC SECTOR ORGANIZATIONS
      </Title>
      <Flex
        className={styles["company-logos-container"]}
        wrap={"wrap"}
        gap={"xl"}
      >
        <Image src={`${logosPath}/government-of-kerala.png`} alt="amazon" />
        <Image src={`${logosPath}/kdisc.png`} alt="infosys" />
        <Image
          src={`${logosPath}/kerala-startup-mission.png`}
          alt="cognizant"
        />
        <Image src={`${logosPath}/fabus.png`} alt="amazon" />
        <Image src={`${logosPath}/linnk-group.png`} alt="wipro" />
      </Flex>
    </div>
  );
}

export default TrustedBy;
