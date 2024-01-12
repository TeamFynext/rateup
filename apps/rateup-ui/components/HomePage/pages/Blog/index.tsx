import {
  Container,
  Title,
  Flex,
  Button,
  Text,
  Image,
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
    router.push("/blog/nurturing-positive-connections");
  };

  return (
    <MantineProvider>
      <Title className={styles["main-blog-page-title-container"]}>
        {" "}
        All You Need to Know About Building Your Online Reputation
      </Title>
      <Text className={styles["main-blog-page-title-text-container"]}>
        {" "}
        Unearth the mastery of impactful communication and acquire profound
        insights into the opportunities presented by the cultivation of a
        positive reputation.
      </Text>
      <Flex className={styles["main-article-nurture-btns-container"]}>
        <Flex className={styles["main-article-img-container"]}>
          <Image
            className={styles["main-article-image"]}
            src="/images/blog/nurturing-positive.jpg"
            alt="Example Image"
            width={500}
            height={300}
          />
        </Flex>
        <Stack className={styles["main-article-title--para--btn-container"]}>
          <Title className={styles["main-article-title-nly-container"]}>
            Nurturing Positive Connections
          </Title>
          <Text className={styles["main-article-para-nly-container"]}>
            Whether you're an individual building a personal brand or a business
            striving for success, the way you are perceived online can
            significantly impact your opportunities and relationships.
          </Text>
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

      <Title className={styles["after-main-article-featured-read"]}>
        FEATURED READS
      </Title>

      <Grid className={styles["article-two-three-together-container"]}>
        <Container
          className={styles["article-together-first-article-container"]}
        >
          <Image
            src="/images/blog/laptop-image.jpg"
            alt="Example Image"
            width={500}
            height={300}
          />
          <Title>
            Building and Managing Your Online Reputation: A Guide for Success
          </Title>
          <Link href="./blog/Building-and-managing-your-online-reputation">
            Readmore
          </Link>
        </Container>

        <Container
          className={styles["article-together-first-article-container"]}
        >
          <Image
            src="/images/blog/financial-review.jpg"
            alt="Example Image"
            width={500}
            height={300}
          />

          <Title>
            {" "}
            Transforming Financial Fortunes: The Impact of Online Reputation
            Management Tools
          </Title>
          <Link href="/blog/transforming-financial-fortunes-impact-ORM">
            Read more
          </Link>
        </Container>
      </Grid>

      <MotionButtonGesture>
        <Button className={styles["page-last-explore-all-btn"]}>
          Explore All
        </Button>
      </MotionButtonGesture>
    </MantineProvider>
  );
}
