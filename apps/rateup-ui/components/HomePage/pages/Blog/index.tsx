import {
  Container,
  Flex,
  Button,
  Grid,
  MantineProvider,
  Stack,
} from "@mantine/core";
import Link from "next/link";
import { useRouter } from "next/router";
import CustomMantineButton from "../../components/Button";
import styles from "./Content.module.css";
import MotionButtonGesture from "../../components/MotionButtonGesture";
import successReadmore from "./success";

export default function ContentPage() {
  const router = useRouter();

  const handleClick = () => {
    router.push("/blog/positive");
  };

  return (
    <MantineProvider>
      <Flex className={styles["main-article-nurture-btns-container"]}>
        <Flex className={styles["main-article-img-container"]}>
          <img
            className={styles["main-article-image"]}
            src="/images/blog/nurturing-positive.jpg"
            alt="Example Image"
            width={500}
            height={437}
          />
        </Flex>
        <Stack className={styles["main-article-title--para--btn-container"]}>
          <h1 className={styles["main-article-title-nly-container"]}>
            Nurturing Positive Connections
          </h1>
          <p className={styles["main-article-para-nly-container"]}>
            {" "}
            Whether you're an individual building a personal brand or a business
            striving for success, the way you are perceived online can
            significantly impact your opportunities and relationships.
          </p>
          <Flex className={styles["main-article-btn-container"]}>
            <CustomMantineButton
              whiteBackgroundGradientText
              onClick={handleClick}
            >
              Read more....
            </CustomMantineButton>
          </Flex>
        </Stack>
      </Flex>

      <h1 className={styles["after-main-article-featured-read"]}>
        FEATURED READS
      </h1>

      <Flex className={styles["article-two-three-together-container"]}>
        <Container>
          <img
            src="/images/blog/laptop-image.jpg"
            alt="Example Image"
            width={500}
            height={300}
          />
          <h1>
            {" "}
            Building and Managing Your Online Reputation: A Guide for Success{" "}
          </h1>
          <Link href="./blog/success"> Readmore</Link>
        </Container>

        <Container>
          <img
            src="/images/blog/financial-review.jpg"
            alt="Example Image"
            width={500}
            height={300}
          />

          <h1>
            {" "}
            Transforming Financial Fortunes: The Impact of Online Reputation
            Management Tools
          </h1>
          <Link href="/blog/fin">Read more</Link>
        </Container>
      </Flex>
      <MotionButtonGesture>
        <Button className={styles["page-last-explore-all-btn"]}>
          Explore All
        </Button>
      </MotionButtonGesture>
    </MantineProvider>
  );
}
