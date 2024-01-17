import CoverImages from "./cover-image-sub";
import Link from "next/link";
import { Stack, Title, Grid, Flex } from "@mantine/core";
import styles from "./blog.module.css";

type Props = {
  title: string;
  coverImage: string;
  slug: string;
};

const PostPreview = ({ title, coverImage, slug }: Props) => {
  return (
    <Stack>
      <Grid className={styles["sub-article-image-and-link"]}>
        <div className={styles["sub-article-image"]}>
          <CoverImages slug={slug} title={title} src={coverImage} />
        </div>
        <Title className={styles["sub-article-titles"]}>
          <Link
            as={`/blog/${slug}`}
            href="/blog/[slug]"
            className={styles["sub-article-titles-link"]}
          >
            {title}
          </Link>
        </Title>
      </Grid>
    </Stack>
  );
};

export default PostPreview;
