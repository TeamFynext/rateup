import CoverImages from "./CoverImageHero";
import Link from "next/link";
import { Stack, Title, Grid, Flex } from "@mantine/core";
import styles from "./blog.module.css";
import DateFormatter from "./DateFormatter";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  slug: string;
};

const PostPreview = ({ title, coverImage, date, slug }: Props) => {
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
          <div className="mb-4 md:mb-0 text-lg">
            <DateFormatter dateString={date} />
          </div>
        </Title>
      </Grid>
    </Stack>
  );
};

export default PostPreview;
