import PostPreview from "./PostPreview";
import { Title, Stack, Grid, Flex } from "@mantine/core";
import styles from "./blog.module.css";
import Button from "../../../components/Button";
import MotionButtonGesture from "../../../components/MotionButtonGesture";
import { useRouter } from "next/router";
import { gAnalyticsAndFbEvent } from "../../../../../utils/gtag";
type Post = {
  slug: string;
  title: string;
  date: string;
  coverImage: string;
  content: string;
};
type Props = {
  posts: Post[];
};

const MoreStories = ({ posts }: Props) => {
  const router = useRouter();
  const handleClick = () => {
    gAnalyticsAndFbEvent(
      "explore_all_blog",
      "ExploreAllBlogButtonClick",
      "Clicked on Explore All button in the blog page",
    );
    router.push("/blog/explore-all");
  };
  return (
    <Stack>
      <Title className={styles["main-page-featured-reads-container"]}>
        FEATURED READS
      </Title>
      <Flex>
        {posts.map((post) => (
          <PostPreview
            key={post.slug}
            title={post.title}
            coverImage={post.coverImage}
            date={post.date}
            slug={post.slug}
          />
        ))}
      </Flex>
      <div className={styles["page-last-explore-all-btn"]}>
        <MotionButtonGesture>
          <Button onClick={handleClick}>Explore All</Button>
        </MotionButtonGesture>
      </div>
    </Stack>
  );
};

export default MoreStories;
