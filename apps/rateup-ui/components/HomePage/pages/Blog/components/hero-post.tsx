import CoverImage from "./cover-image-hero";
import Link from "next/link";
import DateFormatter from "./date-formatter";
import { Flex, Stack, Title } from "@mantine/core";
import styles from "./blog.module.css";
import { useRouter } from "next/router";
import Button from "../../../components/Button";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  slug: string;
};

const HeroPost = ({ title, coverImage, slug }: Props) => {
  const router = useRouter();

  const handleClick = () => {
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
