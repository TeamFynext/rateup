import MoreStories from "./components/more-stories";
import HeroPost from "./components/hero-post";
import Intro from "./components/intro";
import Head from "next/head";
import { Container, Stack, Grid } from "@mantine/core";
import styles from "./components/blog.module.css";
// import Post from "./interfaces/post";

// type Props = {
//   allPosts: Post[];
// };

import React from "react";

const Blog = ({ allPosts }) => {
  const heroPost = allPosts && allPosts.length > 0 ? allPosts[0] : null;

  const morePosts = heroPost ? allPosts.slice(1) : [];

  return (
    <>
      <Head>
        <title>
          All You Need to Know About Building Your Online Reputation
        </title>
      </Head>
      <Container>
        <div>
          <Intro />
        </div>
        <Stack className={styles["main-page-heropost-container"]}>
          {heroPost && (
            <HeroPost
              title={heroPost.title}
              coverImage={heroPost.coverImage}
              date={heroPost.date}
              slug={heroPost.slug}
            />
          )}
        </Stack>

        {morePosts.length > 0 && <MoreStories posts={morePosts} />}
      </Container>
    </>
  );
};

export default Blog;
