import { Flex, Title } from "@mantine/core";
import styles from "./TrustedBy.module.css";

function TrustedBy() {
  const logosPath = "/images/homepage/our-solutions/companies-logos";
  return (
    <div className={styles["trustedby-companies-container"]}>
      <Title order={1}>TRUSTED BY OVER 25K BUSINESSES</Title>
      <Flex
        className={styles["company-logos-container"]}
        wrap={"wrap"}
        gap={"xl"}
      >
        <img src={`${logosPath}/virtusa.png`} alt="amazon" />
        <img src={`${logosPath}/infosys.png`} alt="infosys" />
        <img src={`${logosPath}/cognizant.png`} alt="cognizant" />
        <img src={`${logosPath}/amazon.png`} alt="amazon" />
        <img src={`${logosPath}/wipro.png`} alt="wipro" />
        <img src={`${logosPath}/hcl.png`} alt="hcl" />
      </Flex>
    </div>
  );
}

export default TrustedBy;
