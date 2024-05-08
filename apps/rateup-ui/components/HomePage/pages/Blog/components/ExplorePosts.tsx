import PostPreview from "./PostPreview";
import { Title, Stack, Grid, Flex } from "@mantine/core";
//import { Col } from "@mantine/grid";
import styles from "./blog.module.css";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import BookADemoSection from "../../../components/BookADemoSection";
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

const ExplorePosts = ({ posts }: Props) => {
  return (
    <>
      <div>
        <Header />
        <Title className={styles["explore-all-title-container"]}>
          All You Need to Know About Building Your Online Reputation.
        </Title>
      </div>
      <Flex
        className={styles["explore-all-stories-page-container"]}
        style={{ flexWrap: "wrap" }}
      >
        {posts.map((post, index) => (
          <div key={post.slug} className={styles["post-container"]}>
            <PostPreview
              key={post.slug}
              title={post.title}
              coverImage={post.coverImage}
              date={post.date}
              slug={post.slug}
            />
          </div>
        ))}
      </Flex>
      <div>
        <BookADemoSection />
        <Footer />
      </div>
    </>
  );
};

export default ExplorePosts;
