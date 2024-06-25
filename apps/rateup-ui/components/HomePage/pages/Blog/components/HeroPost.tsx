import CoverImage from "./CoverImageHero";
import Link from "next/link";
import DateFormatter from "./DateFormatter";
import { Flex, Stack, Title } from "@mantine/core";
import styles from "./blog.module.css";
import { useRouter } from "next/router";
import Button from "../../../components/Button";
import { gAnalyticsAndFbEvent } from "../../../../../utils/gtag";
type Props = {
  title: string;
  coverImage: string;
  date: string;
  slug: string;
};

const HeroPost = ({ title, coverImage, date, slug }: Props) => {
  const router = useRouter();

  const handleClick = () => {
    gAnalyticsAndFbEvent(
      "read_more_blog",
      "ReadMoreBlogButtonClick",
      "Clicked on Read More button in the blog page",
    );
    router.push(`/blog/${encodeURIComponent(slug)}`);
  };
  return (
    <Flex className={styles["main-page-top-container"]}>
      <Flex className={styles["heropost-cover-image-container"]}>
        <CoverImage title={title} src={coverImage} slug={slug} />
      </Flex>
      <Stack className={styles["heropost-left-container"]}>
        <Title order={6} className={styles["heropost-spotlight"]}>
          IN THE SPOTLIGHT
        </Title>
        <Title className={styles["heropost-title-container"]}>{title}</Title>
        <Button whiteBackgroundGradientText onClick={handleClick}>
          Read more....
        </Button>
      </Stack>
    </Flex>
  );
};

export default HeroPost;
